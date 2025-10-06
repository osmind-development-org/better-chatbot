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
  // 1. Check Vercel Blob configuration
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

  // 2. Check S3 configuration
  if (storageDriver === "s3") {
    const bucket = process.env.FILE_STORAGE_S3_BUCKET;
    const region = process.env.FILE_STORAGE_S3_REGION || "us-east-1";

    // 2a. Check if bucket is configured
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

    // 2b. Validate bucket name format
    // S3 bucket naming rules: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
    const bucketNameRegex = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;
    if (!bucketNameRegex.test(bucket)) {
      return {
        isValid: false,
        error: `Invalid S3 bucket name: ${bucket}`,
        solution:
          "S3 bucket names must:\n" +
          "- Be 3-63 characters long\n" +
          "- Contain only lowercase letters, numbers, hyphens, and periods\n" +
          "- Start and end with a letter or number\n" +
          "- Not be formatted as an IP address (e.g., 192.168.5.4)\n" +
          "\nPlease update FILE_STORAGE_S3_BUCKET with a valid bucket name.",
      };
    }

    // Check for common invalid patterns
    if (
      bucket.includes("..") ||
      bucket.startsWith(".") ||
      bucket.endsWith(".")
    ) {
      return {
        isValid: false,
        error: `Invalid S3 bucket name: ${bucket}`,
        solution:
          "S3 bucket names cannot:\n" +
          "- Have consecutive periods (..)\n" +
          "- Start or end with a period\n" +
          "\nPlease update FILE_STORAGE_S3_BUCKET with a valid bucket name.",
      };
    }

    // 2c. Validate region format
    const validRegionPattern = /^[a-z]{2}-[a-z]+-\d{1}$/;
    if (!validRegionPattern.test(region)) {
      return {
        isValid: false,
        error: `Invalid AWS region format: ${region}`,
        solution:
          "FILE_STORAGE_S3_REGION must be a valid AWS region code.\n" +
          "Examples: us-east-1, us-west-2, eu-west-1, ap-southeast-1\n" +
          "See all regions: https://docs.aws.amazon.com/general/latest/gr/s3.html",
      };
    }

    // 2d. Check for potential credential issues (non-blocking warnings)
    if (!IS_VERCEL_ENV) {
      const hasEnvCredentials =
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
      const hasProfile = process.env.AWS_PROFILE;

      if (!hasEnvCredentials && !hasProfile) {
        // This is just a warning - credentials might come from other sources
        // (EC2 instance metadata, ECS task role, etc.)
        console.warn(
          "[S3 Storage] No AWS credentials detected in environment.\n" +
            "Ensure credentials are configured via:\n" +
            "- ~/.aws/credentials file (recommended for local dev)\n" +
            "- AWS_PROFILE environment variable\n" +
            "- AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (fallback)\n" +
            "- IAM instance profile (if running on EC2/ECS)",
        );
      }
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
