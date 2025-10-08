import { NextResponse } from "next/server";
import { getSession } from "auth/server";
import globalLogger from "lib/logger";

const logger = globalLogger.withTag("confirm-upload");

interface ConfirmUploadRequest {
  key: string;
  url: string;
  contentType?: string;
  size?: number;
  filename?: string;
}

/**
 * Confirm upload completion endpoint.
 * Called by the client after successfully uploading a file to S3 (or other storage).
 *
 * This is where you can save file metadata to your database, send notifications, etc.
 * Unlike Vercel Blob's webhook, this requires the client to make the call.
 */
export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: ConfirmUploadRequest = await request.json();

    if (!body.key || !body.url) {
      return NextResponse.json(
        { error: "Missing required fields: key and url" },
        { status: 400 },
      );
    }

    logger.info("Upload confirmed", {
      userId: session.user.id,
      key: body.key,
      url: body.url,
      filename: body.filename,
      size: body.size,
    });

    // TODO: Add your custom logic here (save to database, send notification, etc.)
    // Example:
    // await db.files.create({
    //   userId: session.user.id,
    //   key: body.key,
    //   url: body.url,
    //   filename: body.filename,
    //   contentType: body.contentType,
    //   size: body.size,
    //   uploadedAt: new Date(),
    // });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to confirm upload", error);
    return NextResponse.json(
      { error: "Failed to confirm upload" },
      { status: 500 },
    );
  }
}
