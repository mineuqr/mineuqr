import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ENV } from "../_core/env";
import {
  buildPublicUrl,
  normalizeKey,
  toBuffer,
  type StoredObject,
} from "./shared";

let cachedClient: S3Client | null = null;

function missingR2Vars(): string[] {
  const missing: string[] = [];
  if (!ENV.r2AccessKeyId) missing.push("R2_ACCESS_KEY_ID");
  if (!ENV.r2SecretAccessKey) missing.push("R2_SECRET_ACCESS_KEY");
  if (!ENV.r2BucketName) missing.push("R2_BUCKET_NAME");
  if (!ENV.r2PublicBaseUrl) missing.push("R2_PUBLIC_BASE_URL");
  if (!ENV.r2Endpoint) missing.push("R2_ENDPOINT or R2_ACCOUNT_ID");
  return missing;
}

function assertR2Config(): void {
  const missing = missingR2Vars();
  if (missing.length > 0) {
    throw new Error(
      `R2 storage credentials missing: set ${missing.join(", ")}`
    );
  }
}

function getR2Client(): S3Client {
  assertR2Config();
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint: ENV.r2Endpoint,
      credentials: {
        accessKeyId: ENV.r2AccessKeyId,
        secretAccessKey: ENV.r2SecretAccessKey,
      },
    });
  }
  return cachedClient;
}

export async function r2StoragePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<StoredObject> {
  const key = normalizeKey(relKey);
  const body = toBuffer(data);

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: ENV.r2BucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return {
    key,
    url: buildPublicUrl(ENV.r2PublicBaseUrl, key),
  };
}

export async function r2StorageGet(relKey: string): Promise<StoredObject> {
  assertR2Config();
  const key = normalizeKey(relKey);
  return {
    key,
    url: buildPublicUrl(ENV.r2PublicBaseUrl, key),
  };
}
