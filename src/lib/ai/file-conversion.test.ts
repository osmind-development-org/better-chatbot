import { describe, expect, it } from "vitest";
import {
  needsFileConversion,
  convertCSVToText,
  convertJSONToText,
  convertTextToFormattedText,
  convertFileToText,
} from "./file-conversion";

describe("needsFileConversion", () => {
  it("should return false for Gemini provider (supports all file types)", () => {
    expect(needsFileConversion("google", "text/csv")).toBe(false);
    expect(needsFileConversion("google", "application/json")).toBe(false);
    expect(needsFileConversion("google", "text/plain")).toBe(false);
  });

  it("should return true for Anthropic with CSV files", () => {
    expect(needsFileConversion("anthropic", "text/csv")).toBe(true);
  });

  it("should return true for OpenAI with JSON files", () => {
    expect(needsFileConversion("openai", "application/json")).toBe(true);
  });

  it("should return false for supported file types (images, PDFs)", () => {
    expect(needsFileConversion("anthropic", "image/jpeg")).toBe(false);
    expect(needsFileConversion("openai", "application/pdf")).toBe(false);
  });
});

describe("convertCSVToText", () => {
  it("should convert CSV content to formatted text", () => {
    const csvContent = "name,age,city\nJohn,30,NYC\nJane,25,LA";
    const result = convertCSVToText(csvContent, "data.csv");

    expect(result).toContain("File: data.csv");
    expect(result).toContain("Type: CSV");
    expect(result).toContain("```csv");
    expect(result).toContain(csvContent);
  });

  it("should handle CSV without filename", () => {
    const csvContent = "a,b,c\n1,2,3";
    const result = convertCSVToText(csvContent);

    expect(result).toContain("CSV Data:");
    expect(result).toContain("```csv");
  });
});

describe("convertJSONToText", () => {
  it("should pretty-print valid JSON", () => {
    const jsonContent = '{"name":"John","age":30}';
    const result = convertJSONToText(jsonContent, "data.json");

    expect(result).toContain("File: data.json");
    expect(result).toContain("Type: JSON");
    expect(result).toContain("```json");
    expect(result).toContain('"name"');
    expect(result).toContain('"age"');
  });

  it("should handle invalid JSON gracefully", () => {
    const invalidJSON = "{invalid json}";
    const result = convertJSONToText(invalidJSON, "bad.json");

    expect(result).toContain("File: bad.json");
    expect(result).toContain("Type: JSON (raw)");
    expect(result).toContain(invalidJSON);
  });
});

describe("convertTextToFormattedText", () => {
  it("should convert markdown files with markdown syntax highlighting", () => {
    const mdContent = "# Hello World\n\nThis is markdown.";
    const result = convertTextToFormattedText(mdContent, "readme.md");

    expect(result).toContain("File: readme.md");
    expect(result).toContain("```markdown");
    expect(result).toContain(mdContent);
  });

  it("should convert XML files with xml syntax highlighting", () => {
    const xmlContent = "<root><item>test</item></root>";
    const result = convertTextToFormattedText(xmlContent, "data.xml");

    expect(result).toContain("File: data.xml");
    expect(result).toContain("```xml");
    expect(result).toContain(xmlContent);
  });

  it("should convert plain text with text syntax highlighting", () => {
    const textContent = "Just some plain text";
    const result = convertTextToFormattedText(textContent, "notes.txt");

    expect(result).toContain("File: notes.txt");
    expect(result).toContain("```text");
    expect(result).toContain(textContent);
  });
});

describe("convertFileToText", () => {
  it("should route CSV to CSV converter", () => {
    const csvContent = "a,b\n1,2";
    const result = convertFileToText(csvContent, "text/csv", "test.csv");

    expect(result).toContain("CSV");
    expect(result).toContain(csvContent);
  });

  it("should route JSON to JSON converter", () => {
    const jsonContent = '{"key":"value"}';
    const result = convertFileToText(
      jsonContent,
      "application/json",
      "test.json",
    );

    expect(result).toContain("JSON");
    expect(result).toContain('"key"');
  });

  it("should provide helpful message for binary Excel files", () => {
    const result = convertFileToText(
      "",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "data.xlsx",
    );

    expect(result).toContain("Excel Spreadsheet");
    expect(result).toContain("Export the spreadsheet as CSV");
  });

  it("should provide helpful message for Word documents", () => {
    const result = convertFileToText(
      "",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "doc.docx",
    );

    expect(result).toContain("Word Document");
    expect(result).toContain("Export as plain text");
  });

  it("should handle unknown file types", () => {
    const result = convertFileToText(
      "content",
      "application/x-unknown",
      "file.xyz",
    );

    expect(result).toContain("file.xyz");
    expect(result).toContain("cannot be directly processed");
  });
});
