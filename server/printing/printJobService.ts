/**
 * THERMAL-PRINTING-3B.2B — print job creation (no dispatch, render, or bridge).
 */
import { getOrderById } from "../db";
import {
  autoPrintJobIdempotencyKey,
  PRINT_JOB_TRIGGER,
  reprintPrintJobIdempotencyKey,
} from "../../shared/printing/types";
import {
  findPrintJobById,
  findPrintJobByIdempotencyKey,
  insertPrintJob,
} from "./printJobRepository";
import { generatePrintJobCorrelationId } from "./printJobCorrelationService";
import { emitPrintJobTelemetryAsync } from "./printJobTelemetryService";
import { PRINT_JOB_TELEMETRY_EVENT } from "../../shared/printing/telemetry";
import {
  isMysqlDuplicateKeyError,
  PrintJobOrderNotFoundError,
  PrintJobUnavailableError,
  PrintJobValidationError,
  type CreatePrintJobInput,
  type CreatePrintJobResult,
} from "./printJobTypes";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertValidCreatePrintJobInput(input: CreatePrintJobInput): void {
  if (!Number.isInteger(input.orderId) || input.orderId <= 0) {
    throw new PrintJobValidationError("Invalid orderId");
  }
  if (input.trigger === PRINT_JOB_TRIGGER.REPRINT) {
    const reprintId = input.reprintId?.trim();
    if (!reprintId) {
      throw new PrintJobValidationError("reprintId is required for reprint jobs");
    }
    if (!UUID_RE.test(reprintId)) {
      throw new PrintJobValidationError("reprintId must be a UUID");
    }
  } else if (input.reprintId !== undefined) {
    throw new PrintJobValidationError("reprintId is only valid for reprint jobs");
  }
  if (
    input.trigger === PRINT_JOB_TRIGGER.AUTO &&
    (input.printerId == null ||
      !Number.isInteger(input.printerId) ||
      input.printerId <= 0)
  ) {
    throw new PrintJobValidationError("printerId is required for auto print jobs");
  }
  if (
    input.printerId != null &&
    (!Number.isInteger(input.printerId) || input.printerId <= 0)
  ) {
    throw new PrintJobValidationError("Invalid printerId");
  }
}

function resolveIdempotencyKey(input: CreatePrintJobInput): string {
  if (input.idempotencyKey) {
    return input.idempotencyKey;
  }
  if (input.trigger === PRINT_JOB_TRIGGER.REPRINT) {
    return reprintPrintJobIdempotencyKey(input.orderId, input.reprintId!.trim());
  }
  return autoPrintJobIdempotencyKey(input.orderId);
}

export async function createPrintJob(
  input: CreatePrintJobInput
): Promise<CreatePrintJobResult> {
  assertValidCreatePrintJobInput(input);

  const order = await getOrderById(input.orderId);
  if (!order) {
    throw new PrintJobOrderNotFoundError();
  }

  const idempotencyKey = resolveIdempotencyKey(input);

  const existing = await findPrintJobByIdempotencyKey(idempotencyKey);
  if (existing) {
    return { job: existing, created: false };
  }

  try {
    const correlationId = generatePrintJobCorrelationId();
    const insertData: {
      restaurantId: number;
      orderId: number;
      idempotencyKey: string;
      printerId?: number;
      stationId?: number | null;
      correlationId: string;
    } = {
      restaurantId: order.restaurantId,
      orderId: order.id,
      idempotencyKey,
      correlationId,
    };

    if (input.printerId != null) {
      insertData.printerId = input.printerId;
    }
    if (input.stationId !== undefined) {
      insertData.stationId = input.stationId;
    }

    const jobId = await insertPrintJob(insertData);

    const job = await findPrintJobById(jobId);
    if (!job) {
      throw new PrintJobUnavailableError("Print job not found after creation");
    }

    emitPrintJobTelemetryAsync({
      printJobId: job.id,
      correlationId: job.correlationId ?? correlationId,
      restaurantId: job.restaurantId,
      printerId: job.printerId ?? undefined,
      eventType: PRINT_JOB_TELEMETRY_EVENT.JOB_CREATED,
      payload: {
        orderId: job.orderId,
        idempotencyKey: job.idempotencyKey,
        status: job.status,
      },
    });

    return { job, created: true };
  } catch (err) {
    if (isMysqlDuplicateKeyError(err)) {
      const winner = await findPrintJobByIdempotencyKey(idempotencyKey);
      if (winner) {
        return { job: winner, created: false };
      }
    }
    throw err;
  }
}
