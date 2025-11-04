import path from "node:path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { FileNotFoundError } from "lib/errors";
import type {
  FileMetadata,
  FileStorage,
  UploadOptions,
  UploadUrlOptions,
} from "./file-storage.interface";
import {
  resolveStoragePrefix,
  sanitizeFilename,
  toBuffer,
  getContentTypeFromFilename,
} from "./storage-utils";
import { generateUUID } from "lib/utils";
import logger from "logger";

const STORAGE_PREFIX = resolveStoragePrefix();

// Configuration from environment variables
const S3_BUCKET = process.env.FILE_STORAGE_S3_BUCKET;
const S3_REGION = process.env.FILE_STORAGE_S3_REGION || "us-east-1";

if (!S3_BUCKET) {
  logger
    .withTag("s3-file-storage")
    .warn(
      "FILE_STORAGE_S3_BUCKET not set. S3 storage will fail until configured.",
    );
}

/**
 * Create S3 client using AWS SDK v3.
 * Credentials are automatically resolved via the AWS credential chain:
 * 1. IAM roles (ECS task role, EC2 instance profile, Lambda execution role)
 * 2. Shared credentials file (~/.aws/credentials) with AWS_PROFILE env var
 * 3. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 * 4. ECS container credentials
 * 5. EC2 instance metadata
 */
const createS3Client = () => {
  return new S3Client({
    region: S3_REGION,
  });
};

const buildKey = (filename: string, pathPrefix?: string) => {
  const safeName = sanitizeFilename(filename);
  const id = generateUUID();
  const prefix = STORAGE_PREFIX ? `${STORAGE_PREFIX}/` : "";

  // If pathPrefix is provided, use it instead of the default prefix structure
  if (pathPrefix) {
    return path.posix.join(pathPrefix, `${id}-${safeName}`);
  }

  return path.posix.join(prefix, `${id}-${safeName}`);
};

const buildPublicUrl = (key: string) => {
  // Standard AWS S3 URL format (virtual-hosted-style)
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
};

const mapMetadata = (
  key: string,
  info: { contentType?: string; size?: number; lastModified?: Date },
): FileMetadata => ({
  key,
  filename: path.posix.basename(key),
  contentType: info.contentType ?? "application/octet-stream",
  size: info.size ?? 0,
  uploadedAt: info.lastModified,
});

const streamToBuffer = async (stream: ReadableStream): Promise<Buffer> => {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
};

/**
 * Amazon S3 storage backend with PRIVATE file access.
 *
 * Features:
 * - Automatic credential resolution via AWS SDK credential chain (IAM roles, ~/.aws/credentials, etc.)
 * - Presigned URLs for direct client uploads (temp URLs for upload)
 * - Presigned URLs for file access (temp URLs for download, expire after 7 days)
 * - No public access required - files are kept private
 * - Client callback for upload tracking (see /api/storage/confirm-upload)
 *
 * Environment variables:
 * - FILE_STORAGE_S3_BUCKET (required)
 * - FILE_STORAGE_S3_REGION (default: us-east-1)
 * - AWS_PROFILE (optional: for local dev with named AWS profiles)
 *
 * Security:
 * - Files are NOT publicly accessible
 * - Only authenticated users with valid AWS credentials can generate presigned URLs
 * - Bucket policy should NOT grant public read access
 *
 * Local development: Use ~/.aws/credentials file instead of environment variables
 */
export const createS3FileStorage = (): FileStorage => {
  const s3 = createS3Client();

  return {
    async upload(content, options: UploadOptions = {}) {
      if (!S3_BUCKET) {
        throw new Error(
          "FILE_STORAGE_S3_BUCKET not configured. Set this environment variable to use S3 storage.",
        );
      }

      const buffer = await toBuffer(content);
      const filename = options.filename ?? "file";
      const key = buildKey(filename, options.pathPrefix);
      const contentType =
        options.contentType ?? getContentTypeFromFilename(filename);

      const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        // Public access is controlled by bucket policy, not ACLs
      });

      await s3.send(command);

      const metadata: FileMetadata = {
        key,
        filename: path.posix.basename(key),
        contentType,
        size: buffer.byteLength,
        uploadedAt: new Date(),
      };

      // If useSignedUrl is true or pathPrefix is provided, return a presigned URL
      // Otherwise return the public URL format
      let sourceUrl: string;
      if (options.useSignedUrl || options.pathPrefix) {
        const getCommand = new GetObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
        });
        sourceUrl = await getSignedUrl(s3, getCommand, {
          expiresIn: 604800, // 7 days in seconds
        });
      } else {
        sourceUrl = buildPublicUrl(key);
      }

      return {
        key,
        sourceUrl,
        metadata,
      };
    },

    async createUploadUrl(options: UploadUrlOptions) {
      if (!S3_BUCKET) {
        throw new Error(
          "FILE_STORAGE_S3_BUCKET not configured. Set this environment variable to use S3 storage.",
        );
      }

      const key = buildKey(options.filename);
      const contentType =
        options.contentType ?? getContentTypeFromFilename(options.filename);
      const expiresIn = options.expiresInSeconds ?? 3600; // 1 hour default

      const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        ContentType: contentType,
        // Public access is controlled by bucket policy, not ACLs
      } satisfies PutObjectCommandInput);

      const url = await getSignedUrl(s3, command, {
        expiresIn,
      });

      return {
        key,
        url,
        method: "PUT",
        expiresAt: new Date(Date.now() + expiresIn * 1000),
        headers: {
          "Content-Type": contentType,
        },
      };
    },

    async download(key) {
      if (!S3_BUCKET) {
        throw new Error(
          "FILE_STORAGE_S3_BUCKET not configured. Set this environment variable to use S3 storage.",
        );
      }

      try {
        const command = new GetObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
        });

        const response = await s3.send(command);

        if (!response.Body) {
          throw new Error("Empty response body");
        }

        // AWS SDK v3 returns a ReadableStream in the browser and Readable in Node
        return streamToBuffer(response.Body as ReadableStream);
      } catch (error: unknown) {
        if (error && typeof error === "object" && "name" in error) {
          if (error.name === "NoSuchKey" || error.name === "NotFound") {
            throw new FileNotFoundError(key, error as Error);
          }
        }
        throw error;
      }
    },

    async delete(key) {
      if (!S3_BUCKET) {
        throw new Error(
          "FILE_STORAGE_S3_BUCKET not configured. Set this environment variable to use S3 storage.",
        );
      }

      const command = new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      });

      await s3.send(command);
    },

    async exists(key) {
      if (!S3_BUCKET) {
        throw new Error(
          "FILE_STORAGE_S3_BUCKET not configured. Set this environment variable to use S3 storage.",
        );
      }

      try {
        const command = new HeadObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
        });

        await s3.send(command);
        return true;
      } catch (error: unknown) {
        if (error && typeof error === "object" && "name" in error) {
          if (error.name === "NotFound" || error.name === "NoSuchKey") {
            return false;
          }
        }
        throw error;
      }
    },

    async getMetadata(key) {
      if (!S3_BUCKET) {
        throw new Error(
          "FILE_STORAGE_S3_BUCKET not configured. Set this environment variable to use S3 storage.",
        );
      }

      try {
        const command = new HeadObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
        });

        const response = await s3.send(command);

        return mapMetadata(key, {
          contentType: response.ContentType,
          size: response.ContentLength,
          lastModified: response.LastModified,
        });
      } catch (error: unknown) {
        if (error && typeof error === "object" && "name" in error) {
          if (error.name === "NotFound" || error.name === "NoSuchKey") {
            return null;
          }
        }
        throw error;
      }
    },

    async getSourceUrl(key) {
      if (!S3_BUCKET) {
        throw new Error(
          "FILE_STORAGE_S3_BUCKET not configured. Set this environment variable to use S3 storage.",
        );
      }

      // Return presigned URL for private file access
      // URLs expire after 7 days - suitable for chat uploads
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      });

      return await getSignedUrl(s3, command, {
        expiresIn: 604800, // 7 days in seconds
      });
    },

    async getDownloadUrl(key) {
      if (!S3_BUCKET) {
        throw new Error(
          "FILE_STORAGE_S3_BUCKET not configured. Set this environment variable to use S3 storage.",
        );
      }

      try {
        // Verify the file exists first
        await s3.send(
          new HeadObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
          }),
        );

        // Generate a presigned URL with content-disposition to force download
        const command = new GetObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          ResponseContentDisposition: `attachment; filename="${path.posix.basename(key)}"`,
        });

        return await getSignedUrl(s3, command, {
          expiresIn: 3600, // 1 hour
        });
      } catch (error: unknown) {
        if (error && typeof error === "object" && "name" in error) {
          if (error.name === "NotFound" || error.name === "NoSuchKey") {
            return null;
          }
        }
        throw error;
      }
    },
  } satisfies FileStorage;
};
