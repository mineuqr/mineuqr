/**
 * THERMAL-PRINTING-6D Phase-2 / 9D / 10A — job consumption orchestration.
 */
import { acknowledgeDelivery, DeliveryAckTracker } from "../ack/acknowledgeDelivery";
import {
  confirmDelivery,
  DeliveryConfirmationTracker,
} from "../delivery/confirmDelivery";
import { executeExecutionPlan } from "../execution/executeExecutionPlan";
import { ExecutionPipeline } from "../execution/executionPipeline";
import type { AgentJobClient } from "../jobs/jobClient";
import { JobSubscription } from "../jobs/jobSubscription";
import { retrieveAuthoritativePrintJob } from "../jobs/retrieveJob";
import type { JobAssignedEvent } from "../jobs/subscriptionTypes";
import type { RuntimeExecutionPlanSummary } from "../../shared/printing/executionIntegration";
import type { ExecutionExecutionResult } from "../../shared/printing/executionExecutor";

export type JobConsumptionServiceOptions = {
  agentId: string;
  jobClient: AgentJobClient;
  ackSender: { send(data: string): void };
  confirmationSender?: { send(data: string): void };
  pipeline?: ExecutionPipeline;
  ackTracker?: DeliveryAckTracker;
  confirmationTracker?: DeliveryConfirmationTracker;
  now?: () => Date;
};

export type JobConsumptionResult = {
  jobId: number;
  acknowledged: boolean;
  confirmed: boolean;
  localState: "acknowledged" | "delivered";
  executionPlan?: RuntimeExecutionPlanSummary;
  executionResult?: ExecutionExecutionResult;
};

export class JobConsumptionService {
  private readonly pipeline: ExecutionPipeline;
  private readonly ackTracker: DeliveryAckTracker;
  private readonly confirmationTracker: DeliveryConfirmationTracker;
  private readonly confirmationSender: { send(data: string): void };
  private readonly now: () => Date;
  readonly subscription: JobSubscription;

  constructor(private readonly options: JobConsumptionServiceOptions) {
    this.pipeline = options.pipeline ?? new ExecutionPipeline({ now: options.now });
    this.ackTracker = options.ackTracker ?? new DeliveryAckTracker();
    this.confirmationTracker = options.confirmationTracker ?? new DeliveryConfirmationTracker();
    this.confirmationSender = options.confirmationSender ?? options.ackSender;
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
        localState: "delivered",
        executionPlan: undefined,
        executionResult: undefined,
      };
    }
    if (existing?.state === "acknowledged") {
      return {
        jobId: event.jobId,
        acknowledged: false,
        confirmed: false,
        localState: "acknowledged",
        executionPlan: undefined,
        executionResult: undefined,
      };
    }

    const job = await retrieveAuthoritativePrintJob(this.options.jobClient, {
      agentId: event.agentId,
      jobId: event.jobId,
    });

    this.pipeline.receive(job);
    this.pipeline.validate(job.jobId);
    this.pipeline.prepare(job.jobId);

    let executionResult: ExecutionExecutionResult | undefined;
    if (job.executionPlan) {
      executionResult = executeExecutionPlan({
        executionPlan: job.executionPlan,
        job: {
          jobId: job.jobId,
          restaurantId: job.restaurantId,
          printerId: job.printerId,
          orderId: job.orderId,
          ticket: job.ticket,
        },
      });
    }

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
      localState: confirmed ? "delivered" : "acknowledged",
      executionPlan: job.executionPlan,
      executionResult,
    };
  }
}
