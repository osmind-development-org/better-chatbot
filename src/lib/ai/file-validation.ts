/**
 * Client-side file validation utilities for checking file type compatibility
 * with different AI providers.
 *
 * This is separate from file-conversion.ts to avoid importing server-only code
 * on the client side.
 */

import { ChatModel } from "app-types/chat";
import {
  BLOCKED_MIME_TYPES,
  BLOCKED_EXTENSIONS,
  CONVERTIBLE_MIME_TYPES,
  CONVERTIBLE_EXTENSIONS_TO_LABEL,
  UNIVERSALLY_SUPPORTED_MIME_TYPES,
  PROVIDERS_WITH_FULL_FILE_SUPPORT,
  getFileExtension,
} from "./file-support-constants";

export type FileValidationResult =
  | { allowed: true; warning?: string }
  | { allowed: false; error: string };

/**
 * Check if a file is convertible based on MIME type or extension
 */
function isConvertible(mimeType: string, extension: string): boolean {
  // Check MIME type first
  if (CONVERTIBLE_MIME_TYPES.has(mimeType)) {
    return true;
  }

  // For generic MIME types, check extension
  if (
    mimeType === "application/octet-stream" ||
    mimeType === "text/plain" ||
    !mimeType
  ) {
    return extension in CONVERTIBLE_EXTENSIONS_TO_LABEL;
  }

  return false;
}

/**
 * Get a human-readable label for a file
 */
function getFileTypeLabel(mimeType: string, extension: string): string {
  // Try extension first (more reliable for code files)
  if (extension in CONVERTIBLE_EXTENSIONS_TO_LABEL) {
    return CONVERTIBLE_EXTENSIONS_TO_LABEL[extension];
  }

  // Fall back to MIME type
  const mimeLabels: Record<string, string> = {
    "text/csv": "CSV",
    "application/json": "JSON",
    "text/markdown": "Markdown",
    "text/md": "Markdown",
    "text/xml": "XML",
    "application/xml": "XML",
    "text/html": "HTML",
    "text/css": "CSS",
  };

  return mimeLabels[mimeType] || "This";
}

/**
 * Validate if a file can be uploaded based on the current model provider
 */
export function validateFileForModel(
  file: File,
  model: ChatModel,
): FileValidationResult {
  const mimeType = file.type;
  const fileName = file.name;
  const extension = getFileExtension(fileName);

  // Check if file is completely blocked (binary files)
  if (BLOCKED_MIME_TYPES.has(mimeType) || BLOCKED_EXTENSIONS.has(extension)) {
    return {
      allowed: false,
      error: `${fileName} cannot be processed with ${model.provider}. Binary files like Excel (.xlsx) and Word (.docx) documents are not supported. Please export as CSV or plain text instead.`,
    };
  }

  // If provider supports all file types, allow everything
  if (PROVIDERS_WITH_FULL_FILE_SUPPORT.has(model.provider)) {
    return { allowed: true };
  }

  // Check if file will be converted (by MIME type or extension)
  if (isConvertible(mimeType, extension)) {
    const fileTypeLabel = getFileTypeLabel(mimeType, extension);
    return {
      allowed: true,
      warning: `${fileTypeLabel} file will be converted to plain text for ${model.provider}. If you encounter issues with this conversion, consider using Google Gemini which natively supports more file types.`,
    };
  }

  // Check if file is universally supported (images, PDFs, plain text without convertible extension)
  if (UNIVERSALLY_SUPPORTED_MIME_TYPES.has(mimeType)) {
    return { allowed: true };
  }

  // Unknown file type - warn that it may not be supported
  return {
    allowed: true,
    warning: `File type "${mimeType}" is not recognized. This upload may not work as expected with ${model.provider}.`,
  };
}
