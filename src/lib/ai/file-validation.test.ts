import { describe, expect, it } from "vitest";
import { validateFileForModel } from "./file-validation";
import { ChatModel } from "app-types/chat";

// Helper to create a mock File object
function createMockFile(name: string, type: string): File {
  return new File(["content"], name, { type });
}

describe("validateFileForModel", () => {
  const anthropicModel: ChatModel = {
    provider: "anthropic",
    model: "sonnet-4.5",
  };
  const openaiModel: ChatModel = { provider: "openai", model: "gpt-4.1" };
  const geminiModel: ChatModel = {
    provider: "google",
    model: "gemini-2.5-flash",
  };

  describe("Binary files (blocked)", () => {
    it("should block XLSX files for Anthropic", () => {
      const file = createMockFile(
        "data.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      const result = validateFileForModel(file, anthropicModel);

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.error).toContain("data.xlsx");
        expect(result.error).toContain("Excel");
      }
    });

    it("should block DOCX files for OpenAI", () => {
      const file = createMockFile(
        "document.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      const result = validateFileForModel(file, openaiModel);

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.error).toContain("document.docx");
        expect(result.error).toContain("Word");
      }
    });

    it("should block XLS files", () => {
      const file = createMockFile("old.xls", "application/vnd.ms-excel");
      const result = validateFileForModel(file, anthropicModel);

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.error).toContain("old.xls");
      }
    });

    it("should block DOC files", () => {
      const file = createMockFile("old.doc", "application/msword");
      const result = validateFileForModel(file, openaiModel);

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.error).toContain("old.doc");
      }
    });
  });

  describe("Convertible files (allowed with warning)", () => {
    it("should allow CSV with warning for Anthropic", () => {
      const file = createMockFile("data.csv", "text/csv");
      const result = validateFileForModel(file, anthropicModel);

      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.warning).toContain("CSV");
        expect(result.warning).toContain("converted to plain text");
        expect(result.warning).toContain("anthropic");
      }
    });

    it("should allow JSON with warning for OpenAI", () => {
      const file = createMockFile("config.json", "application/json");
      const result = validateFileForModel(file, openaiModel);

      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.warning).toContain("JSON");
        expect(result.warning).toContain("openai");
      }
    });

    it("should allow TXT files without warning (plain text needs no conversion)", () => {
      const file = createMockFile("notes.txt", "text/plain");
      const result = validateFileForModel(file, anthropicModel);

      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.warning).toBeUndefined();
      }
    });

    it("should allow Markdown files with warning", () => {
      const file = createMockFile("readme.md", "text/markdown");
      const result = validateFileForModel(file, openaiModel);

      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.warning).toContain("Markdown");
      }
    });

    it("should allow XML files with warning", () => {
      const file = createMockFile("data.xml", "text/xml");
      const result = validateFileForModel(file, anthropicModel);

      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.warning).toContain("XML");
      }
    });
  });

  describe("Gemini (no restrictions)", () => {
    it("should allow CSV without warning for Gemini", () => {
      const file = createMockFile("data.csv", "text/csv");
      const result = validateFileForModel(file, geminiModel);

      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.warning).toBeUndefined();
      }
    });

    it("should allow JSON without warning for Gemini", () => {
      const file = createMockFile("config.json", "application/json");
      const result = validateFileForModel(file, geminiModel);

      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.warning).toBeUndefined();
      }
    });

    it("should block XLSX even for Gemini (binary files not supported)", () => {
      const file = createMockFile(
        "data.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      const result = validateFileForModel(file, geminiModel);

      // Even Gemini can't handle binary Excel files well
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.error).toContain("data.xlsx");
      }
    });
  });

  describe("Supported file types (no restrictions)", () => {
    it("should allow images without warning", () => {
      const file = createMockFile("photo.jpg", "image/jpeg");
      const result = validateFileForModel(file, anthropicModel);

      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.warning).toBeUndefined();
      }
    });

    it("should allow PDFs without warning", () => {
      const file = createMockFile("document.pdf", "application/pdf");
      const result = validateFileForModel(file, openaiModel);

      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.warning).toBeUndefined();
      }
    });
  });

  describe("Unknown file types", () => {
    it("should allow unknown file types with warning", () => {
      const file = createMockFile("file.xyz", "application/x-unknown");
      const result = validateFileForModel(file, anthropicModel);

      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.warning).toContain("application/x-unknown");
        expect(result.warning).toContain("not recognized");
      }
    });
  });
});
