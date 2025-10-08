"use server";

import { storageDriver } from "lib/file-storage";
import { IS_VERCEL_ENV } from "lib/const";

/**
 * Get storage configuration info.
 * Used by clients to determine upload strategy.
 */
export async function getStorageInfoAction() {
  return {
    type: storageDriver,
    supportsDirectUpload:
      storageDriver === "vercel-blob" || storageDriver === "s3",
  };
}

interface StorageCheckResult {
  isValid: boolean;
  error?: string;
  solution?: string;
}

/**
 * Check if storage is properly configured.
 * Returns detailed error messages with solutions.
 */
export async function checkStorageAction(): Promise<StorageCheckResult> {
  if (storageDriver === "vercel-blob") {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return {
        isValid: false,
        error: "BLOB_READ_WRITE_TOKEN is not set",
        solution:
          "Please add Vercel Blob to your project:\n" +
          "1. Go to your Vercel Dashboard\n" +
          "2. Navigate to Storage tab\n" +
          "3. Create a new Blob Store\n" +
          "4. Connect it to your project\n" +
          (IS_VERCEL_ENV
            ? "5. Redeploy your application"
            : "5. Run 'vercel env pull' to get the token locally"),
      };
    }
  }

  if (storageDriver === "s3") {
    const bucket = process.env.FILE_STORAGE_S3_BUCKET;

    if (!bucket) {
      return {
        isValid: false,
        error: "FILE_STORAGE_S3_BUCKET is not set",
        solution:
          "Please configure S3 storage:\n" +
          "1. Create an S3 bucket in AWS Console\n" +
          "2. Set FILE_STORAGE_S3_BUCKET environment variable\n" +
          "3. Set FILE_STORAGE_S3_REGION (optional, defaults to us-east-1)\n" +
          (IS_VERCEL_ENV
            ? "4. Ensure your AWS credentials are configured via IAM role or environment variables"
            : "4. Configure AWS credentials in ~/.aws/credentials or set AWS_PROFILE\n" +
              "   See: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html"),
      };
    }
  }

  // 3. Validate storage driver
  if (!["vercel-blob", "s3"].includes(storageDriver)) {
    return {
      isValid: false,
      error: `Invalid storage driver: ${storageDriver}`,
      solution:
        "FILE_STORAGE_TYPE must be one of:\n" +
        "- 'vercel-blob' (default)\n" +
        "- 's3'",
    };
  }

  return {
    isValid: true,
  };
}
