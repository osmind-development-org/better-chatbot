# File Conversion Testing Guide

This feature automatically converts unsupported file types (CSV, JSON, TXT, MD, etc.) to plain text when using AI providers that don't support them natively.

## How It Works

- **Gemini**: Supports all file types natively - no conversion happens
- **Anthropic Claude**: Only supports images and PDFs - other files are auto-converted to text
- **OpenAI**: Only supports images and PDFs - other files are auto-converted to text

## Testing Steps

### 1. Test with CSV File

Create a test CSV file (`test.csv`):

```csv
name,age,city
John,30,NYC
Jane,25,LA
Bob,35,SF
```

**Test with Anthropic (Claude):**

1. Select a Claude model (e.g., sonnet-4.5)
2. Upload `test.csv`
3. Ask: "What data is in this file?"
4. Expected: The file content should be converted to formatted text and the AI should read it

**Test with Gemini:**

1. Select a Gemini model (e.g., gemini-2.5-flash)
2. Upload the same `test.csv`
3. Ask: "What data is in this file?"
4. Expected: The file should be passed as-is (no conversion) and Gemini should read it natively

### 2. Test with JSON File

Create a test JSON file (`test.json`):

```json
{
  "users": [
    { "name": "Alice", "role": "admin" },
    { "name": "Bob", "role": "user" }
  ],
  "count": 2
}
```

**Test with OpenAI:**

1. Select a GPT model (e.g., gpt-4.1)
2. Upload `test.json`
3. Ask: "Summarize this JSON data"
4. Expected: JSON should be converted to pretty-printed text and processed

### 3. Test with Markdown File

Create a test markdown file (`notes.md`):

```markdown
# Project Notes

## TODO

- [ ] Add file support
- [x] Test with multiple providers

## Summary

This is a test document.
```

**Test with Anthropic:**

1. Select Claude
2. Upload `notes.md`
3. Ask: "What tasks are listed in this file?"
4. Expected: Markdown should be converted to code-formatted text

### 4. Verify Conversion Logs

Check the application logs (server console) for messages like:

```
[Chat API] Converted file attachment (test.csv, text/csv) to text for anthropic provider
```

This confirms that the conversion logic is running.

### 5. Test Unsupported Binary Files

Try uploading an Excel file (`.xlsx`) or Word document (`.docx`):

- Expected: The AI should receive a helpful message explaining that binary files can't be processed directly
- The message should suggest exporting to CSV/TXT format

## Expected Behavior

| File Type | Anthropic         | OpenAI            | Gemini            |
| --------- | ----------------- | ----------------- | ----------------- |
| CSV       | ✅ Converted      | ✅ Converted      | ✅ Native Support |
| JSON      | ✅ Converted      | ✅ Converted      | ✅ Native Support |
| TXT       | ✅ Converted      | ✅ Converted      | ✅ Native Support |
| MD        | ✅ Converted      | ✅ Converted      | ✅ Native Support |
| XML       | ✅ Converted      | ✅ Converted      | ✅ Native Support |
| XLSX      | ⚠️ Help Message   | ⚠️ Help Message   | ⚠️ Help Message   |
| DOCX      | ⚠️ Help Message   | ⚠️ Help Message   | ⚠️ Help Message   |
| PDF       | ✅ Native Support | ✅ Native Support | ✅ Native Support |
| Images    | ✅ Native Support | ✅ Native Support | ✅ Native Support |

## Troubleshooting

If file conversion doesn't work:

1. Check the browser console for any file upload errors
2. Check the server logs for conversion errors
3. Verify the file URL is accessible (not behind auth if using external storage)
4. Ensure the file size is under the 10MB limit

## Technical Details

- Files are converted **before** being sent to the AI SDK's `convertToModelMessages()`
- The conversion happens server-side in the `/api/chat` route
- Original file attachments are preserved in the database for display purposes
- Conversion logic is in `src/lib/ai/file-conversion.ts`
