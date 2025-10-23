/**
 * Client-side file validation utilities for checking file type compatibility
 * with different AI providers.
 *
 * This is separate from file-conversion.ts to avoid importing server-only code
 * on the client side.
 */

import { ChatModel } from "app-types/chat";

/**
 * File types that are completely unsupported (binary formats we can't convert)
 */
const BLOCKED_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc
]);

/**
 * File types that need conversion (will show warning but allow upload)
 */
const CONVERTIBLE_MIME_TYPES = new Set([
  "text/csv",
  "application/json",
  "text/plain",
  "text/markdown",
  "text/md",
  "text/xml",
  "application/xml",
]);

/**
 * Providers that support most document types natively (no conversion needed)
 */
const PROVIDERS_WITH_FULL_FILE_SUPPORT = new Set([
  "google", // Gemini supports CSV, JSON, TXT, MD, XML, HTML, CSS, RTF, etc.
]);

export type FileValidationResult =
  | { allowed: true; warning?: string }
  | { allowed: false; error: string };

/**
 * Validate if a file can be uploaded based on the current model provider
 */
export function validateFileForModel(
  file: File,
  model?: ChatModel,
): FileValidationResult {
  const mimeType = file.type;
  const fileName = file.name;

  // If no model specified, allow upload but warn
  if (!model) {
    if (BLOCKED_MIME_TYPES.has(mimeType)) {
      return {
        allowed: false,
        error: `${fileName} cannot be processed. Binary files like Excel (.xlsx) and Word (.docx) documents are not supported. Please export as CSV or plain text instead.`,
      };
    }
    return { allowed: true };
  }

  // If provider supports all file types, allow everything
  if (PROVIDERS_WITH_FULL_FILE_SUPPORT.has(model.provider)) {
    return { allowed: true };
  }

  // Check if file is completely blocked
  if (BLOCKED_MIME_TYPES.has(mimeType)) {
    return {
      allowed: false,
      error: `${fileName} cannot be processed with ${model.provider}. Binary files like Excel (.xlsx) and Word (.docx) documents are not supported. Please export as CSV or plain text instead.`,
    };
  }

  // Check if file will be converted
  if (CONVERTIBLE_MIME_TYPES.has(mimeType)) {
    const fileTypeLabel = getFileTypeLabel(mimeType);
    return {
      allowed: true,
      warning: `${fileTypeLabel} file will be converted to plain text for ${model.provider}. For better results, consider using Google Gemini which natively supports this file type.`,
    };
  }

  // Unknown file type - allow but no guarantee
  return { allowed: true };
}

/**
 * Get a human-readable label for a file type
 */
function getFileTypeLabel(mimeType: string): string {
  const labels: Record<string, string> = {
    "text/csv": "CSV",
    "application/json": "JSON",
    "text/plain": "Text",
    "text/markdown": "Markdown",
    "text/md": "Markdown",
    "text/xml": "XML",
    "application/xml": "XML",
  };
  return labels[mimeType] || "This";
}
