import "server-only";
import { UIMessage, FileUIPart, TextUIPart } from "ai";
import { ChatModel } from "app-types/chat";
import logger from "logger";

/**
 * File conversion utilities for handling file types that aren't natively supported
 * by certain AI providers (Anthropic, OpenAI).
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
 * MIME types that need conversion for providers that don't support them
 */
const CONVERTIBLE_MIME_TYPES = new Set([
  "text/csv",
  "application/json",
  "text/markdown",
  "text/md",
  "text/xml",
  "application/xml",
]);

/**
 * Providers that support most document types natively
 * These providers don't need file conversion
 */
const PROVIDERS_WITH_FULL_FILE_SUPPORT = new Set([
  "google", // Gemini supports CSV, JSON, TXT, MD, XML, HTML, CSS, RTF, etc.
]);

/**
 * Check if a file type needs conversion for the given provider
 */
export function needsFileConversion(
  provider: string,
  mimeType: string,
): boolean {
  // If provider supports all file types, no conversion needed
  if (PROVIDERS_WITH_FULL_FILE_SUPPORT.has(provider)) {
    return false;
  }

  // Check if this is a convertible file type
  return CONVERTIBLE_MIME_TYPES.has(mimeType);
}

/**
 * Convert CSV content to formatted text
 */
export function convertCSVToText(content: string, filename?: string): string {
  const lines = content.trim().split("\n");
  if (lines.length === 0) return "";

  const header = filename
    ? `File: ${filename}\nType: CSV\n\n`
    : "CSV Data:\n\n";

  // Simple CSV formatting - just preserve the structure
  // For more complex CSV parsing, we could use a library like papaparse
  return header + "```csv\n" + content.trim() + "\n```";
}

/**
 * Convert JSON content to formatted text
 */
export function convertJSONToText(content: string, filename?: string): string {
  try {
    // Try to parse and pretty-print JSON
    const parsed = JSON.parse(content);
    const prettyJSON = JSON.stringify(parsed, null, 2);

    const header = filename
      ? `File: ${filename}\nType: JSON\n\n`
      : "JSON Data:\n\n";
    return header + "```json\n" + prettyJSON + "\n```";
  } catch (_error) {
    // If parsing fails, just return as-is with markdown formatting
    const header = filename
      ? `File: ${filename}\nType: JSON (raw)\n\n`
      : "JSON Data:\n\n";
    return header + "```json\n" + content + "\n```";
  }
}

/**
 * Convert plain text/markdown to formatted text
 */
export function convertTextToFormattedText(
  content: string,
  filename?: string,
  _mimeType?: string,
): string {
  const ext = filename?.split(".").pop()?.toLowerCase();
  const language = ext === "md" ? "markdown" : ext === "xml" ? "xml" : "text";

  const header = filename ? `File: ${filename}\n\n` : "";
  return header + "```" + language + "\n" + content.trim() + "\n```";
}

/**
 * Main conversion function that routes to the appropriate converter
 */
export function convertFileToText(
  content: string,
  mimeType: string,
  filename?: string,
): string {
  switch (mimeType) {
    case "text/csv":
      return convertCSVToText(content, filename);

    case "application/json":
      return convertJSONToText(content, filename);

    case "text/markdown":
    case "text/md":
    case "text/xml":
    case "application/xml":
      return convertTextToFormattedText(content, filename, mimeType);

    default:
      return `File: ${filename || "file"}
Type: ${mimeType}

Note: This file type cannot be directly processed. Please provide the content in a supported format (text, CSV, JSON, etc.).`;
  }
}

/**
 * Fetch file content from a URL
 */
async function fetchFileContent(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    logger.error("Error fetching file for conversion:", error);
    throw new Error(
      `Could not download file for conversion: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Process messages and convert unsupported file types to text
 * This should be called before passing messages to convertToModelMessages()
 */
export async function processMessagesWithFileConversion(
  messages: UIMessage[],
  chatModel?: ChatModel,
): Promise<UIMessage[]> {
  // If no chat model specified or provider supports all file types, return as-is
  if (!chatModel || PROVIDERS_WITH_FULL_FILE_SUPPORT.has(chatModel.provider)) {
    return messages;
  }

  // Process each message
  const processedMessages = await Promise.all(
    messages.map(async (message) => {
      // Check if message has any file parts that need conversion
      const hasConvertibleFiles = message.parts.some(
        (part) =>
          part.type === "file" &&
          needsFileConversion(
            chatModel.provider,
            (part as FileUIPart).mediaType || "",
          ),
      );

      // If no convertible files, return message as-is
      if (!hasConvertibleFiles) {
        return message;
      }

      // Process parts and convert files to text
      const processedParts = await Promise.all(
        message.parts.map(async (part) => {
          // Only process file parts that need conversion
          if (part.type !== "file") {
            return part;
          }

          const filePart = part as FileUIPart;
          const mimeType = filePart.mediaType || "";

          // Check if this file needs conversion
          if (!needsFileConversion(chatModel.provider, mimeType)) {
            return part;
          }

          try {
            // Download file content
            const fileContent = await fetchFileContent(filePart.url || "");

            // Convert to text
            const convertedText = convertFileToText(
              fileContent,
              mimeType,
              filePart.filename,
            );

            // Return as text part instead of file part
            logger.info(
              `Converted file attachment (${filePart.filename || "unnamed"}, ${mimeType}) to text for ${chatModel.provider} provider`,
            );

            return {
              type: "text",
              text: convertedText,
            } as TextUIPart;
          } catch (error) {
            // If conversion fails, return an error message as text
            logger.error(`Failed to convert file ${filePart.filename}:`, error);
            return {
              type: "text",
              text: `[File conversion error: Could not process ${filePart.filename || "file"} (${mimeType}). ${error instanceof Error ? error.message : String(error)}]`,
            } as TextUIPart;
          }
        }),
      );

      return {
        ...message,
        parts: processedParts,
      };
    }),
  );

  return processedMessages;
}
