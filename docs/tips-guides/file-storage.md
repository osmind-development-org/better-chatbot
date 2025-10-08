# File Storage Setup

> **Note**: This documentation was written by Claude 3.5 Sonnet.

This project supports **cloud-based file storage** for handling file uploads and downloads.

## Overview

Files are stored with **public access** by default, making them accessible via URL. This is useful for sharing uploaded content, displaying images, and integrating with external services.

## Storage Drivers

The project supports two storage backends:

- **Vercel Blob** - Default for all deployments (recommended for Vercel/non-AWS)
- **S3** - AWS S3 and S3-compatible storage (MinIO, DigitalOcean Spaces, etc.)

**Vercel Blob** is the default storage driver and works seamlessly in both local development and production environments.

## Configuration

### Environment Variables

```ini
# Storage driver selection (defaults to vercel-blob)
FILE_STORAGE_TYPE=vercel-blob # or s3

# Optional: Subdirectory prefix for organizing files
FILE_STORAGE_PREFIX=uploads

# === Vercel Blob (FILE_STORAGE_TYPE=vercel-blob) ===
BLOB_READ_WRITE_TOKEN=<auto on Vercel>
VERCEL_BLOB_CALLBACK_URL= # Optional: For local webhook testing with ngrok

# === S3 (FILE_STORAGE_TYPE=s3) ===
FILE_STORAGE_S3_BUCKET=your-bucket-name
FILE_STORAGE_S3_REGION=us-east-1  # Optional, defaults to us-east-1

# Credentials (only needed if NOT running in AWS with IAM roles)
# When running on ECS/EC2/Lambda, IAM roles are automatically used
# For local dev, use ~/.aws/credentials file instead of env vars:
# AWS_PROFILE=your-profile-name  # Optional: use a named profile
```

### Quick Start with Vercel Blob

Vercel Blob works in both local development and production environments:

1. Go to your Vercel project → **Storage** tab
2. Click **Connect Database** → **Blob** → **Continue**
3. Name it (e.g., "Files") and click **Create**
4. Pull environment variables locally:

```bash
vercel env pull
```

That's it! File uploads will now work seamlessly in both development and production.

### Quick Start with S3

S3 automatically uses IAM roles when running in AWS (ECS, EC2, Lambda). For local development or non-AWS environments, you'll need access keys.

#### Running in AWS (Production)

1. Create an S3 bucket and configure it for public access (if needed)
2. Attach an IAM role to your ECS task/EC2 instance/Lambda with S3 permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:*Object*"],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

3. Set environment variables:

```bash
FILE_STORAGE_TYPE=s3
FILE_STORAGE_S3_BUCKET=your-bucket-name
FILE_STORAGE_S3_REGION=us-east-1
```

No access keys needed! The AWS SDK automatically uses the IAM role.

4. **Important**: Configure your S3 bucket for public access and CORS:

**Bucket Policy** (for public read access):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

**CORS Configuration** (for client-side uploads):

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://yourdomain.com", "http://localhost:3000"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

#### Local Development

For local development, use AWS credentials file and profiles:

1. Create an IAM user with the same S3 permissions above
2. Generate access keys
3. Configure your AWS credentials file (`~/.aws/credentials`):

```ini
[default]
aws_access_key_id = your-access-key
aws_secret_access_key = your-secret-key

# Or use a named profile
[your-profile-name]
aws_access_key_id = your-access-key
aws_secret_access_key = your-secret-key
```

4. Set environment variables:

```bash
FILE_STORAGE_TYPE=s3
FILE_STORAGE_S3_BUCKET=your-bucket-name
FILE_STORAGE_S3_REGION=us-east-1

# Optional: Use a named profile instead of [default]
AWS_PROFILE=your-profile-name
```

The AWS SDK will automatically read credentials from `~/.aws/credentials`. No need for `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables!

## Client Upload

The `useFileUpload` hook **automatically selects the optimal upload method** based on your storage backend:

- **Vercel Blob**: Direct browser → CDN upload (fastest, default)
- **S3**: Presigned URL upload (direct browser → S3)

```tsx
"use client";

import { useFileUpload } from "hooks/use-presigned-upload";

function FileUploadComponent() {
  const { upload, isUploading } = useFileUpload();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await upload(file);
    if (!result) return; // Upload failed (error shown via toast)

    // File uploaded successfully
    console.log("Public URL:", result.url);
    console.log("Pathname (key):", result.pathname);
  };

  return (
    <input type="file" onChange={handleFileChange} disabled={isUploading} />
  );
}
```

### Upload Flow

#### Vercel Blob (Direct Upload)

```mermaid
sequenceDiagram
  participant Browser
  participant UploadURL as /api/storage/upload-url
  participant Vercel as Vercel Blob CDN

  Browser->>UploadURL: POST (request client token)
  Note over Browser,UploadURL: User authenticated
  UploadURL->>Vercel: Generate client token
  Vercel-->>UploadURL: Return token
  UploadURL-->>Browser: Return token + URL
  Browser->>Vercel: PUT file (with token)
  Vercel-->>Browser: Upload complete
  Vercel->>UploadURL: Webhook: upload completed
  Note over UploadURL: Optional: Save to DB
```

#### S3 (Presigned URL Upload)

```mermaid
sequenceDiagram
  participant Browser
  participant UploadURL as /api/storage/upload-url
  participant S3 as Amazon S3
  participant Confirm as /api/storage/confirm-upload

  Browser->>UploadURL: POST (request presigned URL)
  Note over Browser,UploadURL: User authenticated
  UploadURL->>S3: Generate presigned URL
  Note over UploadURL,S3: Uses IAM role (no keys needed in AWS)
  S3-->>UploadURL: Return presigned URL
  UploadURL-->>Browser: Return presigned URL + public URL
  Browser->>S3: PUT file (with presigned URL)
  S3-->>Browser: Upload complete (200 OK)
  Browser->>Confirm: POST (confirm upload)
  Note over Confirm: Save to DB, send notifications
  Confirm-->>Browser: Confirmed
```

### Features

- ✅ **Cloud-Based Storage**: Vercel Blob provides globally distributed CDN
- ✅ **Works Everywhere**: Same storage in development and production
- ✅ **Direct Client Upload**: Browser uploads directly to CDN (fastest)
- ✅ **Public Access**: All files get public URLs
- ✅ **Authentication**: Users must be logged in to upload
- ✅ **Collision Prevention**: UUID-based file naming
- ✅ **Type Safety**: Full TypeScript support with unified interface

## Server-Side Upload

For server-side uploads (e.g., programmatically generated files):

```ts
import { serverFileStorage } from "lib/file-storage";

const result = await serverFileStorage.upload(buffer, {
  filename: "generated-image.png",
  contentType: "image/png",
});

console.log("Public URL:", result.sourceUrl);
```

## Upload Completion Tracking

### Vercel Blob (Webhook)

The `/api/storage/upload-url` endpoint handles the `onUploadCompleted` webhook from Vercel Blob. You can add custom logic here:

```ts
// src/app/api/storage/upload-url/route.ts

onUploadCompleted: async ({ blob, tokenPayload }) => {
  const { userId } = JSON.parse(tokenPayload);

  // Save to database
  await db.files.create({
    url: blob.url,
    pathname: blob.pathname,
    userId,
    size: blob.size,
    contentType: blob.contentType,
  });

  // Send notification
  // await sendNotification(userId, "File uploaded!");
};
```

### S3 (Client Callback)

Since S3 doesn't have built-in webhooks like Vercel Blob, the client automatically calls `/api/storage/confirm-upload` after successful upload. You can add custom logic here:

```ts
// src/app/api/storage/confirm-upload/route.ts

export async function POST(request: Request) {
  const session = await getSession();
  const body = await request.json();

  // Save to database
  await db.files.create({
    userId: session.user.id,
    key: body.key,
    url: body.url,
    filename: body.filename,
    contentType: body.contentType,
    size: body.size,
    uploadedAt: new Date(),
  });

  // Send notification
  // await sendNotification(session.user.id, "File uploaded!");

  return NextResponse.json({ success: true });
}
```

**Note**: The client callback approach means uploads can succeed without confirmation if the client closes/crashes. For mission-critical tracking, consider S3 Event Notifications → SNS → Lambda.

## Advanced

### Local Development with Vercel Blob Webhooks

To test Vercel Blob's `onUploadCompleted` webhook locally, use [ngrok](https://ngrok.com/):

```bash
# Terminal 1: Start your app
pnpm dev

# Terminal 2: Start ngrok
ngrok http 3000

# Add to .env.local
VERCEL_BLOB_CALLBACK_URL=https://abc123.ngrok-free.app
```

Without ngrok, uploads will work but `onUploadCompleted` won't be called locally.

### Custom Storage Backend

To implement a custom storage driver (e.g., Cloudflare R2, MinIO, S3):

1. Create a new file in `src/lib/file-storage/` (e.g., `r2-file-storage.ts`)
2. Implement the `FileStorage` interface from `file-storage.interface.ts`
3. Add your driver to `index.ts`
4. Update `FILE_STORAGE_TYPE` environment variable

The `FileStorage` interface provides:

- `upload()` - Server-side file upload
- `createUploadUrl()` - Generate presigned URL for client uploads (optional)
- `download()`, `delete()`, `exists()`, `getMetadata()`, `getSourceUrl()`

### Storage Comparison

| Feature              | Vercel Blob         | S3                          |
| -------------------- | ------------------- | --------------------------- |
| Direct Client Upload | ✅ Yes              | ✅ Yes (presigned URLs)     |
| CDN                  | ✅ Global           | ✅ CloudFront (optional)    |
| Cost                 | Pay-as-you-go       | Pay-as-you-go               |
| Best For             | Vercel deployments  | AWS/self-hosted             |
| Setup Complexity     | Minimal             | Moderate                    |
| Local Development    | ✅ Works with token | ✅ Works (credentials file) |
| IAM Role Support     | N/A                 | ✅ Yes                      |
| Upload Tracking      | ✅ Webhook          | 🟡 Client callback          |

## Why Not Local Filesystem?

Local filesystem storage is **not supported** because:

1. **AI APIs can't access localhost**: When AI APIs receive `http://localhost:3000/file.png`, they cannot fetch the file
2. **Serverless incompatibility**: Platforms like Vercel don't support persistent filesystem
3. **No CDN**: Files aren't globally distributed

**Solution**: Vercel Blob provides a free tier and works seamlessly in both local development and production. Simply run `vercel env pull` to get your token locally.
