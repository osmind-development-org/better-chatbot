import { describe, expect, it } from "vitest";
import {
  needsFileConversion,
  convertCSVToText,
  convertJSONToText,
  convertCodeToText,
  convertFileToText,
} from "./file-conversion";

describe("needsFileConversion", () => {
  it("should return false for Gemini provider (supports all file types)", () => {
    expect(needsFileConversion("google", "text/csv", "data.csv")).toBe(false);
    expect(
      needsFileConversion("google", "application/json", "config.json"),
    ).toBe(false);
    expect(needsFileConversion("google", "text/plain", "notes.txt")).toBe(
      false,
    );
  });

  it("should return true for Anthropic with CSV files", () => {
    expect(needsFileConversion("anthropic", "text/csv", "data.csv")).toBe(true);
  });

  it("should return true for OpenAI with JSON files", () => {
    expect(
      needsFileConversion("openai", "application/json", "config.json"),
    ).toBe(true);
  });

  it("should return true for programming language files", () => {
    expect(needsFileConversion("anthropic", "text/x-python", "script.py")).toBe(
      true,
    );
    expect(
      needsFileConversion("openai", "text/typescript", "component.ts"),
    ).toBe(true);
    expect(
      needsFileConversion("anthropic", "application/javascript", "app.js"),
    ).toBe(true);
  });

  it("should return true for files with generic MIME types based on extension", () => {
    expect(
      needsFileConversion("anthropic", "application/octet-stream", "script.py"),
    ).toBe(true);
    expect(needsFileConversion("openai", "text/plain", "config.ts")).toBe(true);
    expect(
      needsFileConversion("anthropic", "application/octet-stream", "main.go"),
    ).toBe(true);
  });

  it("should return false for supported file types (images, PDFs)", () => {
    expect(needsFileConversion("anthropic", "image/jpeg", "photo.jpg")).toBe(
      false,
    );
    expect(needsFileConversion("openai", "application/pdf", "doc.pdf")).toBe(
      false,
    );
  });

  it("should return false for plain text without convertible extension", () => {
    expect(needsFileConversion("anthropic", "text/plain", "notes.txt")).toBe(
      false,
    );
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

describe("convertCodeToText", () => {
  it("should convert Python files with python syntax highlighting", () => {
    const pyContent = "def hello():\n    print('Hello World')";
    const result = convertCodeToText(pyContent, "script.py", "text/x-python");

    expect(result).toContain("File: script.py");
    expect(result).toContain("```python");
    expect(result).toContain(pyContent);
  });

  it("should convert TypeScript files with typescript syntax highlighting", () => {
    const tsContent = "const greeting: string = 'Hello';";
    const result = convertCodeToText(tsContent, "app.ts", "text/typescript");

    expect(result).toContain("File: app.ts");
    expect(result).toContain("```typescript");
    expect(result).toContain(tsContent);
  });

  it("should convert Go files with go syntax highlighting", () => {
    const goContent = "package main\n\nfunc main() {}";
    const result = convertCodeToText(goContent, "main.go", "text/x-go");

    expect(result).toContain("File: main.go");
    expect(result).toContain("```go");
    expect(result).toContain(goContent);
  });

  it("should detect language from extension when MIME type is generic", () => {
    const pyContent = "print('hello')";
    const result = convertCodeToText(
      pyContent,
      "script.py",
      "application/octet-stream",
    );

    expect(result).toContain("```python");
  });

  it("should convert markdown files with markdown syntax highlighting", () => {
    const mdContent = "# Hello World\n\nThis is markdown.";
    const result = convertCodeToText(mdContent, "readme.md", "text/markdown");

    expect(result).toContain("File: readme.md");
    expect(result).toContain("```markdown");
    expect(result).toContain(mdContent);
  });

  it("should convert XML files with xml syntax highlighting", () => {
    const xmlContent = "<root><item>test</item></root>";
    const result = convertCodeToText(xmlContent, "data.xml", "text/xml");

    expect(result).toContain("File: data.xml");
    expect(result).toContain("```xml");
    expect(result).toContain(xmlContent);
  });

  it("should convert HTML files with html syntax highlighting", () => {
    const htmlContent = "<html><body>Hello</body></html>";
    const result = convertCodeToText(htmlContent, "index.html", "text/html");

    expect(result).toContain("File: index.html");
    expect(result).toContain("```html");
    expect(result).toContain(htmlContent);
  });

  it("should convert CSS files with css syntax highlighting", () => {
    const cssContent = "body { color: red; }";
    const result = convertCodeToText(cssContent, "styles.css", "text/css");

    expect(result).toContain("File: styles.css");
    expect(result).toContain("```css");
    expect(result).toContain(cssContent);
  });

  it("should convert Bash scripts with bash syntax highlighting", () => {
    const bashContent = "#!/bin/bash\necho 'Hello'";
    const result = convertCodeToText(
      bashContent,
      "deploy.sh",
      "text/x-shellscript",
    );

    expect(result).toContain("File: deploy.sh");
    expect(result).toContain("```bash");
    expect(result).toContain(bashContent);
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

  it("should route Python files to code converter", () => {
    const pyContent = "print('hello')";
    const result = convertFileToText(pyContent, "text/x-python", "script.py");

    expect(result).toContain("```python");
    expect(result).toContain(pyContent);
  });

  it("should route TypeScript files to code converter", () => {
    const tsContent = "const x: number = 5;";
    const result = convertFileToText(tsContent, "text/typescript", "app.ts");

    expect(result).toContain("```typescript");
    expect(result).toContain(tsContent);
  });

  it("should handle generic MIME types with extension detection", () => {
    const goContent = "package main";
    const result = convertFileToText(
      goContent,
      "application/octet-stream",
      "main.go",
    );

    expect(result).toContain("```go");
    expect(result).toContain(goContent);
  });

  it("should handle HTML files", () => {
    const htmlContent = "<html></html>";
    const result = convertFileToText(htmlContent, "text/html", "index.html");

    expect(result).toContain("```html");
    expect(result).toContain(htmlContent);
  });

  it("should handle Terraform files with generic MIME type", () => {
    const tfContent = 'resource "aws_instance" "example" {}';
    const result = convertFileToText(
      tfContent,
      "application/octet-stream",
      "main.tf",
    );

    expect(result).toContain("```terraform");
    expect(result).toContain(tfContent);
  });

  it("should return generic message for unsupported file types", () => {
    const result = convertFileToText(
      "",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "data.xlsx",
    );

    expect(result).toContain("data.xlsx");
    expect(result).toContain("cannot be directly processed");
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
