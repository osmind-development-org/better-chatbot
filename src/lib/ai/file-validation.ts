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
 * File extensions that are blocked (binary formats)
 */
const BLOCKED_EXTENSIONS = new Set(["xlsx", "xls", "docx", "doc"]);

/**
 * File types that need conversion (will show warning but allow upload)
 */
const CONVERTIBLE_MIME_TYPES = new Set([
  "text/csv",
  "application/json",
  "text/markdown",
  "text/md",
  "text/xml",
  "application/xml",
  "text/html",
  "text/css",
  // Programming languages - various MIME types
  "text/x-python",
  "application/x-python",
  "text/x-terraform",
  "application/x-terraform",
  "text/typescript",
  "application/typescript",
  "text/javascript",
  "application/javascript",
  "application/x-javascript",
  "text/x-go",
  "application/x-go",
  "text/x-shellscript",
  "application/x-sh",
  "text/x-sh",
]);

/**
 * File extensions that need conversion for non-Gemini providers
 * Maps extension to human-readable label
 */
const CONVERTIBLE_EXTENSIONS: Record<string, string> = {
  // Data formats
  csv: "CSV",
  json: "JSON",
  xml: "XML",
  md: "Markdown",
  markdown: "Markdown",
  // Web
  html: "HTML",
  htm: "HTML",
  css: "CSS",
  // Programming languages
  py: "Python",
  ts: "TypeScript",
  tsx: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  tf: "Terraform",
  go: "Go",
  sh: "Bash",
  bash: "Bash",
};

/**
 * File types that are universally supported by all providers (no conversion needed)
 * These include images, PDFs, and plain text
 */
const UNIVERSALLY_SUPPORTED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  // PDFs
  "application/pdf",
  // Plain text (no conversion needed - already text)
  "text/plain",
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
 * Extract file extension from filename
 */
function getFileExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

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
    return extension in CONVERTIBLE_EXTENSIONS;
  }

  return false;
}

/**
 * Get a human-readable label for a file
 */
function getFileTypeLabel(mimeType: string, extension: string): string {
  // Try extension first (more reliable for code files)
  if (extension in CONVERTIBLE_EXTENSIONS) {
    return CONVERTIBLE_EXTENSIONS[extension];
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
      warning: `${fileTypeLabel} file will be converted to plain text for ${model.provider}. For better results, consider using Google Gemini which natively supports this file type.`,
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
