# File Conversion Testing Guide

This feature automatically validates and converts unsupported file types (CSV, JSON, TXT, MD, etc.) when using AI providers that don't support them natively.

## How It Works

### Upload Validation (Frontend)
When you select a file to upload, the system checks:
1. **Binary files** (XLSX, DOCX, XLS, DOC) are **blocked** with an error message
2. **Convertible files** (CSV, JSON, TXT, MD, XML) show a **warning** but allow upload
3. **Gemini users** see no restrictions (Gemini supports all document types natively)

### Automatic Conversion (Backend)
If a convertible file is uploaded:
- **Gemini**: No conversion - file is passed natively
- **Anthropic Claude**: Converts to formatted plain text
- **OpenAI**: Converts to formatted plain text

## Testing Steps

### 0. Test Upload Validation (Frontend)

**Test blocking binary files:**
1. Select Claude or GPT model
2. Try to upload an Excel file (.xlsx)
3. Expected: Red error toast appears, file is NOT uploaded
4. Error message should mention the file name and suggest exporting as CSV

**Test warning for convertible files:**
1. Select Claude or GPT model  
2. Upload a CSV file
3. Expected: Yellow/orange warning toast appears, file IS uploaded
4. Warning should mention the file will be converted and suggest using Gemini

**Test Gemini has no restrictions:**
1. Select a Gemini model
2. Upload a CSV file
3. Expected: No warning, file uploads normally
4. Upload an XLSX file
5. Expected: No warning or blocking (Gemini handles it)

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

### 4. Verify Validation and Conversion

**Frontend validation (browser):**
- Watch for toast notifications when uploading files
- Error toasts (red) = file blocked
- Warning toasts (yellow/orange) = file will be converted
- No toast = file supported natively

**Backend conversion (server console):**
Check the application logs for messages like:
```
[Chat API] Converted file attachment (test.csv, text/csv) to text for anthropic provider
```

This confirms that the conversion logic is running.

### 5. Test Blocked Binary Files

Try uploading an Excel file (`.xlsx`) or Word document (`.docx`) with Claude or OpenAI:

- Expected: Upload is **blocked** before it happens
- Error toast should appear explaining binary files aren't supported
- The message should suggest exporting to CSV/TXT format
- File should NOT appear in the upload list

## Expected Behavior

| File Type | Anthropic                        | OpenAI                           | Gemini                     |
| --------- | -------------------------------- | -------------------------------- | -------------------------- |
| CSV       | ⚠️ Warning → ✅ Converted        | ⚠️ Warning → ✅ Converted        | ✅ Native Support          |
| JSON      | ⚠️ Warning → ✅ Converted        | ⚠️ Warning → ✅ Converted        | ✅ Native Support          |
| TXT       | ⚠️ Warning → ✅ Converted        | ⚠️ Warning → ✅ Converted        | ✅ Native Support          |
| MD        | ⚠️ Warning → ✅ Converted        | ⚠️ Warning → ✅ Converted        | ✅ Native Support          |
| XML       | ⚠️ Warning → ✅ Converted        | ⚠️ Warning → ✅ Converted        | ✅ Native Support          |
| XLSX      | 🚫 Blocked at Upload             | 🚫 Blocked at Upload             | ✅ Allowed (may not work)  |
| DOCX      | 🚫 Blocked at Upload             | 🚫 Blocked at Upload             | ✅ Allowed (may not work)  |
| PDF       | ✅ Native Support                | ✅ Native Support                | ✅ Native Support          |
| Images    | ✅ Native Support                | ✅ Native Support                | ✅ Native Support          |

## Troubleshooting

**If you see an unexpected error toast:**
1. Check which model you have selected
2. Verify the file type matches what you expect
3. Try switching to Gemini if the file type should be supported

**If file conversion doesn't work:**
1. Check the browser console for any file upload errors
2. Check the server logs for conversion errors
3. Verify the file URL is accessible (not behind auth if using external storage)
4. Ensure the file size is under the 10MB limit

**If binary files (XLSX/DOCX) aren't being blocked:**
1. Check that you're using Anthropic or OpenAI model
2. Verify the file has the correct MIME type
3. Check browser console for validation errors

## Technical Details

**Frontend Validation:**
- Validation happens in `src/components/prompt-input.tsx` before upload
- Model-aware checking via `src/lib/ai/file-validation.ts`
- Toast notifications using `sonner` library

**Backend Conversion:**
- Files are converted **before** being sent to the AI SDK's `convertToModelMessages()`
- The conversion happens server-side in the `/api/chat` route
- Original file attachments are preserved in the database for display purposes
- Conversion logic is in `src/lib/ai/file-conversion.ts`
