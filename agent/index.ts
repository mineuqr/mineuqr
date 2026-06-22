/**
 * THERMAL-PRINTING-6D — MineuQR Reference Print Agent.
 *
 * Phase-1: lifecycle, identity, registration, heartbeats, reconnect, persistence.
 * Phase-2: job subscription, retrieval, local execution pipeline, delivery ack.
 * Does not create print jobs or modify MineuQR business state.
 */
export { bootAgent, createMockAgentRuntime } from "./runtime/boot";
export type { AgentBootConfig } from "./runtime/config";
export {
  bootAgentFromDeploymentConfig,
  loadDeploymentConfig,
  validateDeploymentConfigFile,
  AgentDeploymentConfigError,
  type AgentDeploymentConfig,
} from "./config";
export { AgentLifecycle } from "./runtime/lifecycle";
export { shutdownAgent } from "./runtime/shutdown";
export type { AgentRuntime } from "./runtime/runtimeTypes";
export {
  assertTransition,
  canTransition,
  type AgentState,
  AgentLifecycleError,
} from "./runtime/state";

export { createIdentity } from "./identity/createIdentity";
export { loadIdentity } from "./identity/loadIdentity";
export {
  FileIdentityStore,
  MemoryIdentityStore,
  type AgentLocalIdentity,
  type IdentityStore,
} from "./identity/identityStore";

export {
  buildRegistrationPayload,
  buildAgentHelloWireMessage,
  registerAgentWithServer,
  REFERENCE_AGENT_VERSION,
} from "./registration/registerAgent";
export type {
  AgentRegistrationPayload,
  AgentRegistrationResult,
} from "./registration/registrationTypes";

export {
  HeartbeatManager,
  DEFAULT_HEARTBEAT_INTERVAL_MS,
} from "./heartbeat/heartbeatManager";

export {
  ReconnectEngine,
  DEFAULT_RECONNECT_INITIAL_DELAY_MS,
  DEFAULT_RECONNECT_MAX_DELAY_MS,
  DEFAULT_RECONNECT_MULTIPLIER,
} from "./reconnect/reconnectEngine";

export {
  WsAgentWebSocketClient,
  MockAgentWebSocketClient,
  type AgentWebSocketClient,
} from "./transport/websocketClient";

export { detectReferenceAgentPlatform } from "./platform/detectPlatform";

export {
  JobSubscription,
  parseJobAssignedNotification,
  JobSubscriptionError,
} from "./jobs/jobSubscription";
export type { JobAssignedEvent, JobSubscriptionListener } from "./jobs/subscriptionTypes";
export {
  MemoryAgentJobClient,
  WebSocketAgentJobClient,
  AgentJobFetchTimeoutError,
  DEFAULT_JOB_FETCH_TIMEOUT_MS,
  type AgentJobClient,
  type FetchPrintJobInput,
  type WebSocketAgentJobClientOptions,
} from "./jobs/jobClient";
export {
  retrieveAuthoritativePrintJob,
  JobRetrievalError,
} from "./jobs/retrieveJob";
export {
  validateAuthoritativePrintJob,
  normalizeAuthoritativePrintJob,
  AgentJobValidationError,
  type AuthoritativePrintJob,
  type AgentJobTicket,
} from "./jobs/jobTypes";
export { serializeJobAssignedNotification } from "./jobs/jobWire";

export {
  ExecutionPipeline,
  ExecutionPipelineError,
} from "./execution/executionPipeline";
export {
  assertLocalJobStateTransition,
  canTransitionLocalJobState,
  getNextLocalJobState,
  LocalJobStateError,
} from "./execution/stateMachine";
export { LocalJobStore } from "./execution/localJobStore";
export type { LocalJobState, LocalJobRecord, LocalJobPrepareContext } from "./execution/executionTypes";
export { executeExecutionPlan } from "./execution/executeExecutionPlan";
export type { ExecutionResult, ExecutionStatus, ExecutionArtifact, EscPosPayload } from "../../shared/printing/executionExecutor";
export type { ExecutionOutcome, ExecutionOutcomeStatus } from "../../shared/printing/executionOutcome";
export { executeAgentTransportDelivery } from "./execution/executeTransportDelivery";
export { createAgentTransportRegistry } from "./transports/transportRegistry";
export { MemoryTcpSocketClient, type TcpSocketClient } from "./transports/tcpSocketClient";
export { NodeTcpSocketClient } from "./transports/nodeTcpSocketClient";
export {
  createAgentExecutorRegistry,
  getAgentExecutorRegistry,
  resetAgentExecutorRegistryForTests,
} from "./execution/executors/executorRegistry";
export { RawEscPosExecutor, createRawEscPosExecutor } from "./execution/executors/rawEscPosExecutor";

export {
  acknowledgeDelivery,
  buildDeliveryAckMessage,
  DeliveryAckTracker,
  DeliveryAckError,
} from "./ack/acknowledgeDelivery";
export type { DeliveryAckPayload, DeliveryAckSender } from "./ack/acknowledgeDelivery";

export {
  JobConsumptionService,
  type JobConsumptionResult,
  type JobConsumptionServiceOptions,
} from "./consumption/jobConsumptionService";

export {
  confirmDelivery,
  buildDeliveryConfirmedMessage,
  DeliveryConfirmationTracker,
  DeliveryConfirmationError,
} from "./delivery/confirmDelivery";
export type {
  DeliveryConfirmationPayload,
  DeliveryConfirmationSender,
} from "./delivery/confirmDelivery";

export {
  reportAgentStatus,
  buildAgentStatusReportMessage,
  AgentStatusReportTracker,
  AgentStatusReportError,
} from "./status/reportAgentStatus";
export type {
  AgentStatusReportPayload,
  AgentStatusReportSender,
} from "./status/reportAgentStatus";

export {
  reportJobStatus,
  buildJobStatusReportMessage,
  JobStatusReportTracker,
  JobStatusReportError,
} from "./status/reportJobStatus";
export type {
  JobStatusReportPayload,
  JobStatusReportSender,
} from "./status/reportJobStatus";

export {
  reportPrinterProfiles,
  buildPrinterProfilesReportMessage,
  PrinterProfilesReportTracker,
  PrinterProfilesReportError,
} from "./printers/reportPrinterProfiles";
export type {
  PrinterProfilesReportPayload,
  PrinterProfilesReportSender,
} from "./printers/reportPrinterProfiles";

export {
  reportPlatformCapabilities,
  buildPlatformCapabilitiesReportMessage,
  PlatformCapabilitiesReportTracker,
  PlatformCapabilitiesReportError,
  WINDOWS_PLATFORM_CAPABILITIES,
  ANDROID_PLATFORM_CAPABILITIES,
  IOS_PLATFORM_CAPABILITIES,
} from "./platform/reportPlatformCapabilities";
export type {
  PlatformCapabilitiesReportPayload,
  PlatformCapabilitiesReportSender,
} from "./platform/reportPlatformCapabilities";
