/**
 * THERMAL-PRINTING-6D Phase-2 — job consumption orchestration (consume only, no queue writes).
 */
import { acknowledgeDelivery, DeliveryAckTracker } from "../ack/acknowledgeDelivery";
import { ExecutionPipeline } from "../execution/executionPipeline";
import type { AgentJobClient } from "../jobs/jobClient";
import { JobSubscription } from "../jobs/jobSubscription";
import { retrieveAuthoritativePrintJob } from "../jobs/retrieveJob";
import type { JobAssignedEvent } from "../jobs/subscriptionTypes";
import { serializeJobAssignedNotification } from "../jobs/jobWire";

export type JobConsumptionServiceOptions = {
  agentId: string;
  jobClient: AgentJobClient;
  ackSender: { send(data: string): void };
  pipeline?: ExecutionPipeline;
  ackTracker?: DeliveryAckTracker;
  now?: () => Date;
};

export type JobConsumptionResult = {
  jobId: number;
  acknowledged: boolean;
  localState: "acknowledged";
};

export class JobConsumptionService {
  private readonly pipeline: ExecutionPipeline;
  private readonly ackTracker: DeliveryAckTracker;
  private readonly now: () => Date;
  readonly subscription: JobSubscription;

  constructor(private readonly options: JobConsumptionServiceOptions) {
    this.pipeline = options.pipeline ?? new ExecutionPipeline({ now: options.now });
    this.ackTracker = options.ackTracker ?? new DeliveryAckTracker();
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
    if (existing?.state === "acknowledged") {
      return {
        jobId: event.jobId,
        acknowledged: false,
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

    return {
      jobId: job.jobId,
      acknowledged,
      localState: "acknowledged",
    };
  }
}
