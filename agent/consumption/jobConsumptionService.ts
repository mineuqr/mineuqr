/**
 * THERMAL-PRINTING-6D Phase-2 / 9D / 10A / 10B / 10C — job consumption orchestration.
 */
import { acknowledgeDelivery, DeliveryAckTracker } from "../ack/acknowledgeDelivery";
import {
  confirmDelivery,
  DeliveryConfirmationTracker,
} from "../delivery/confirmDelivery";
import { executeExecutionPlan } from "../execution/executeExecutionPlan";
import { executeAgentTransportDelivery } from "../execution/executeTransportDelivery";
import { ExecutionPipeline } from "../execution/executionPipeline";
import type { AgentJobClient } from "../jobs/jobClient";
import { JobSubscription } from "../jobs/jobSubscription";
import { retrieveAuthoritativePrintJob } from "../jobs/retrieveJob";
import type { JobAssignedEvent } from "../jobs/subscriptionTypes";
import {
  classifyExecutionOutcome,
  executionOutcomeStatusForReport,
} from "../../shared/printing/executionOutcomeReporting";
import type {
  BluetoothTransportEndpoint,
  NetworkTransportEndpoint,
  UsbTransportEndpoint,
} from "../../shared/printing/transports/transportContracts";
import type { TransportRetryPolicy } from "../../shared/printing/transports/transportRetryPolicy";
import type { RuntimeExecutionPlanSummary } from "../../shared/printing/executionIntegration";
import type { ExecutionResult } from "../../shared/printing/executionExecutor";
import {
  resolveExecutionOutcome,
  type ExecutionOutcome,
} from "../../shared/printing/executionOutcome";
import type { TransportExecutionResult } from "../../shared/printing/transports/transportContracts";
import {
  ExecutionOutcomeReportTracker,
  reportExecutionOutcome,
} from "../reporting/reportExecutionOutcome";
import type { AgentTransportClients } from "../transports/transportRegistry";
import { MemoryBluetoothDeviceClient } from "../transports/bluetoothDeviceClient";
import { MemoryTcpSocketClientFactory } from "../transports/tcpSocketClient";
import { MemoryUsbDeviceClient, NodeUsbDeviceClient } from "../transports/usbDeviceClient";
import { NodeBluetoothDeviceClient } from "../transports/bluetoothDeviceClient";
import { NodeTcpSocketClientFactory } from "../transports/nodeTcpSocketClient";
import {
  MemoryWindowsSpoolerDeviceClient,
  NodeWindowsSpoolerDeviceClient,
} from "../transports/windowsSpoolerDeviceClient";

export type JobConsumptionServiceOptions = {
  agentId: string;
  jobClient: AgentJobClient;
  ackSender: { send(data: string): void };
  outcomeReportSender?: { send(data: string): void };
  confirmationSender?: { send(data: string): void };
  pipeline?: ExecutionPipeline;
  ackTracker?: DeliveryAckTracker;
  confirmationTracker?: DeliveryConfirmationTracker;
  outcomeReportTracker?: ExecutionOutcomeReportTracker;
  transportClients?: AgentTransportClients;
  networkTransportEndpoints?: Record<string, NetworkTransportEndpoint>;
  usbTransportEndpoints?: Record<string, UsbTransportEndpoint>;
  bluetoothTransportEndpoints?: Record<string, BluetoothTransportEndpoint>;
  transportRetryPolicy?: TransportRetryPolicy;
  now?: () => Date;
};

export type JobConsumptionResult = {
  jobId: number;
  acknowledged: boolean;
  confirmed: boolean;
  outcomeReported: boolean;
  localState: "acknowledged" | "delivered";
  executionPlan?: RuntimeExecutionPlanSummary;
  executionResult?: ExecutionResult;
  transportResult?: TransportExecutionResult;
  executionOutcome?: ExecutionOutcome;
};

function createDefaultTransportClients(
  options: JobConsumptionServiceOptions
): AgentTransportClients {
  return (
    options.transportClients ?? {
      tcpSocketFactory: new MemoryTcpSocketClientFactory(),
      usbDeviceClient: new MemoryUsbDeviceClient(),
      windowsSpoolerDeviceClient: new MemoryWindowsSpoolerDeviceClient(),
      bluetoothDeviceClient: new MemoryBluetoothDeviceClient(),
      retryPolicy: options.transportRetryPolicy,
    }
  );
}

export function createProductionTransportClients(
  retryPolicy?: TransportRetryPolicy
): AgentTransportClients {
  return {
    tcpSocketFactory: new NodeTcpSocketClientFactory(),
    usbDeviceClient: new NodeUsbDeviceClient(),
    windowsSpoolerDeviceClient: new NodeWindowsSpoolerDeviceClient(),
    bluetoothDeviceClient: new NodeBluetoothDeviceClient(),
    retryPolicy,
  };
}

export class JobConsumptionService {
  private readonly pipeline: ExecutionPipeline;
  private readonly ackTracker: DeliveryAckTracker;
  private readonly confirmationTracker: DeliveryConfirmationTracker;
  private readonly outcomeReportTracker: ExecutionOutcomeReportTracker;
  private readonly confirmationSender: { send(data: string): void };
  private readonly outcomeReportSender: { send(data: string): void };
  private readonly transportClients: AgentTransportClients;
  private readonly networkTransportEndpoints: Record<string, NetworkTransportEndpoint>;
  private readonly usbTransportEndpoints: Record<string, UsbTransportEndpoint>;
  private readonly bluetoothTransportEndpoints: Record<string, BluetoothTransportEndpoint>;
  private readonly now: () => Date;
  readonly subscription: JobSubscription;

  constructor(private readonly options: JobConsumptionServiceOptions) {
    this.pipeline = options.pipeline ?? new ExecutionPipeline({ now: options.now });
    this.ackTracker = options.ackTracker ?? new DeliveryAckTracker();
    this.confirmationTracker = options.confirmationTracker ?? new DeliveryConfirmationTracker();
    this.outcomeReportTracker = options.outcomeReportTracker ?? new ExecutionOutcomeReportTracker();
    this.confirmationSender = options.confirmationSender ?? options.ackSender;
    this.outcomeReportSender = options.outcomeReportSender ?? options.ackSender;
    this.transportClients = createDefaultTransportClients(options);
    this.networkTransportEndpoints = options.networkTransportEndpoints ?? {};
    this.usbTransportEndpoints = options.usbTransportEndpoints ?? {};
    this.bluetoothTransportEndpoints = options.bluetoothTransportEndpoints ?? {};
    this.now = options.now ?? (() => new Date());
    this.subscription = new JobSubscription({
      agentId: options.agentId,
      listeners: [(event) => {
        void this.consumeAssignedJob(event);
      }],
    });
  }

  handleTransportMessage(rawMessage: string): boolean {
    return this.subscription.handleTransportMessage(rawMessage);
  }

  async consumeAssignedJob(event: JobAssignedEvent): Promise<JobConsumptionResult> {
    const existing = this.pipeline.getStore().get(event.jobId);
    if (existing?.state === "delivered") {
      return {
        jobId: event.jobId,
        acknowledged: false,
        confirmed: false,
        outcomeReported: false,
        localState: "delivered",
      };
    }
    if (existing?.state === "acknowledged") {
      return {
        jobId: event.jobId,
        acknowledged: false,
        confirmed: false,
        outcomeReported: false,
        localState: "acknowledged",
      };
    }

    const job = await retrieveAuthoritativePrintJob(this.options.jobClient, {
      agentId: event.agentId,
      jobId: event.jobId,
    });

    this.pipeline.receive(job);
    this.pipeline.validate(job.jobId);
    this.pipeline.prepare(job.jobId);

    let executionResult: ExecutionResult | undefined;
    if (job.executionPlan) {
      executionResult = executeExecutionPlan({
        executionPlan: job.executionPlan,
        job: {
          jobId: job.jobId,
          restaurantId: job.restaurantId,
          printerId: job.printerId,
          orderId: job.orderId,
          ticket: job.ticket,
          paperWidthMm: job.transportDeliveryContext?.printerProfile.paperWidth,
        },
      });
    }

    let transportResult: TransportExecutionResult | undefined;
    if (
      executionResult?.status === "completed" &&
      job.executionPlan &&
      job.transportDeliveryContext
    ) {
      const printerId = job.transportDeliveryContext.printerProfile.printerId;
      transportResult = await executeAgentTransportDelivery(
        {
          executionResult,
          executionPlan: job.executionPlan,
          executionContext: job.transportDeliveryContext.executionContext,
          printerProfile: job.transportDeliveryContext.printerProfile,
          networkEndpoint: this.networkTransportEndpoints[printerId],
          usbEndpoint: this.usbTransportEndpoints[printerId],
          bluetoothEndpoint: this.bluetoothTransportEndpoints[printerId],
        },
        this.transportClients
      );
    }

    const executionOutcome = resolveExecutionOutcome({
      executionResult,
      transportResult,
    });
    const classifiedOutcome = classifyExecutionOutcome(executionOutcome);

    const outcomeReported = reportExecutionOutcome({
      payload: {
        agentId: event.agentId,
        jobId: job.jobId,
        timestamp: this.now().toISOString(),
        outcomeStatus: executionOutcomeStatusForReport(classifiedOutcome),
        category: classifiedOutcome.category,
        transport: transportResult?.transport ?? job.transportDeliveryContext?.printerProfile.transport,
        message: classifiedOutcome.message,
      },
      sender: this.outcomeReportSender,
      tracker: this.outcomeReportTracker,
    });

    const acknowledged = acknowledgeDelivery({
      payload: {
        agentId: event.agentId,
        jobId: job.jobId,
        timestamp: this.now().toISOString(),
      },
      sender: this.options.ackSender,
      tracker: this.ackTracker,
    });

    if (acknowledged) {
      this.pipeline.markAcknowledged(job.jobId);
    }

    const confirmed = confirmDelivery({
      payload: {
        agentId: event.agentId,
        jobId: job.jobId,
        timestamp: this.now().toISOString(),
      },
      sender: this.confirmationSender,
      tracker: this.confirmationTracker,
      pipeline: this.pipeline,
    });

    return {
      jobId: job.jobId,
      acknowledged,
      confirmed,
      outcomeReported,
      localState: confirmed ? "delivered" : "acknowledged",
      executionPlan: job.executionPlan,
      executionResult,
      transportResult,
      executionOutcome: classifiedOutcome,
    };
  }
}
