/**
 * Shared constants and utilities for file type support across AI providers.
 *
 * This file contains no server-only imports and can be safely used in both
 * client-side and server-side code.
 *
 * Provider Support Matrix:
 * - Anthropic: Images, PDFs only
 * - OpenAI: Images, PDFs only
 * - Google Gemini: Images, PDFs, CSV, JSON, TXT, MD, XML, HTML, CSS, RTF, and more
 *
 * References:
 * - Anthropic: https://docs.anthropic.com/en/docs/build-with-claude/citations
 * - Gemini: https://ai.google.dev/gemini-api/docs/document-processing
 */

/**
 * File types that are completely unsupported (binary formats we can't convert)
 */
export const BLOCKED_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc
]);

/**
 * File extensions that are blocked (binary formats)
 */
export const BLOCKED_EXTENSIONS = new Set(["xlsx", "xls", "docx", "doc"]);

/**
 * MIME types that need conversion for providers that don't support them
 */
export const CONVERTIBLE_MIME_TYPES = new Set([
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
 * Maps extension to markdown language identifier for code blocks
 */
export const CONVERTIBLE_EXTENSIONS_TO_LANGUAGE: Record<string, string> = {
  // Data formats
  csv: "csv",
  json: "json",
  xml: "xml",
  md: "markdown",
  markdown: "markdown",
  // Web
  html: "html",
  htm: "html",
  css: "css",
  // Programming languages
  py: "python",
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  tf: "terraform",
  go: "go",
  sh: "bash",
  bash: "bash",
};

/**
 * File extensions that need conversion for non-Gemini providers
 * Maps extension to human-readable label for UI display
 */
export const CONVERTIBLE_EXTENSIONS_TO_LABEL: Record<string, string> = {
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
export const UNIVERSALLY_SUPPORTED_MIME_TYPES = new Set([
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
 * Providers that support most document types natively
 * These providers don't need file conversion
 */
export const PROVIDERS_WITH_FULL_FILE_SUPPORT = new Set([
  "google", // Gemini supports CSV, JSON, TXT, MD, XML, HTML, CSS, RTF, etc.
]);

/**
 * Extract file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}
