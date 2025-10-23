# Workflow Data Flow Guide

## Overview

This guide explains how data flows between nodes in the visual workflow builder and how to chain API calls together.

## How Node Outputs Work

### HTTP Node Output Structure

When an HTTP node executes, it outputs a `response` object with the following structure:

```json
{
  "response": {
    "status": 200,
    "statusText": "OK",
    "ok": true,
    "headers": { ... },
    "body": "<response as string>",
    "duration": 150,
    "size": 1234
  }
}
```

**Important**: The `body` field is always a **string**, even if the API returns JSON. This is by design.

### Example: Weather API Response

```json
{
  "response": {
    "status": 200,
    "ok": true,
    "body": "{\"latitude\":37.56,\"temperature\":15.4}",
    "duration": 150
  }
}
```

## Referencing Previous Node Outputs

There are two ways to reference data from previous nodes, depending on the node type:

### 1. HTTP Node Fields (URL, Headers, Query Params, Body)

Use the **Variable Icon** button (looks like a variable symbol) next to the input field:

1. Click the variable icon button
2. Select the source node from the dropdown
3. Navigate the path to the specific field you want (e.g., `response` → `body`)

Example for the weather workflow:

- To use the IP address from a previous HTTP node in the URL of the next node:
  - Click the variable icon next to the URL field
  - Select the IP API node
  - Navigate to `response` → `body`

### 2. LLM and Template Node Messages

Use the **`/` character** to insert a mention/variable:

1. Type `/` in the message/template field
2. A dropdown will appear with available nodes and their output fields
3. Select the node and field path you want to reference

Example:

```
The IP address is /[IP Node → response → body]
```

## Your Use Case: Chaining Multiple API Calls

Here's how to structure your workflow: **Get IP → Get Location → Get Weather → LLM Summary**

### Step-by-Step Implementation

#### Node 1: Get IP Address (HTTP Node)

- **Name**: "Get IP"
- **Method**: GET
- **URL**: `https://api.ipify.org?format=json`
- **Output**: `{ "response": { "body": "{\"ip\":\"1.2.3.4\"}" } }`

#### Node 2: Get Location (HTTP Node or LLM Node)

**Option A: If the location API accepts IP as a query parameter**

- **Name**: "Get Location"
- **Method**: GET
- **URL**: `https://ipapi.co/`
- **Query Parameters**:
  - Add a query param with key based on the API requirements
  - For the value, click the variable icon and select: `Get IP` → `response` → `body`

**Option B: If you need to parse the JSON first (Recommended)**

Insert an **LLM Node** between steps to extract the IP:

- **Name**: "Parse IP"
- **Messages**:
  - Role: User
  - Content: `Extract just the IP address from this JSON: /[Get IP → response → body]`
- **Output Schema**: Configure to return a simple string or object with an `ip` field

Then use this parsed value in the Location API call.

#### Node 3: Get Weather (HTTP Node)

Similar to Node 2, reference the location data:

- Use variable icon to reference `Get Location` → `response` → `body` (or parsed values from an intermediate LLM node)

#### Node 4: LLM Summary (LLM Node)

- **Name**: "Weather Summary"
- **Messages**:
  - Role: System
  - Content: `You are a helpful weather assistant. Parse the following weather data and provide a friendly summary.`
  - Role: User
  - Content: `Here is the weather data: /[Get Weather → response → body]`
- **Output Schema**: Set to string type for a simple text response

### The Key Insight: Handling JSON Responses

Since HTTP nodes return `response.body` as a **string** (even for JSON), you have two approaches:

#### Approach 1: Pass JSON strings directly to LLM (Simpler)

The LLM can parse JSON strings naturally. Just reference the `body` field directly in your LLM prompt:

```
Parse this JSON and extract the temperature: /[Weather API → response → body]
```

The LLM will automatically understand and parse the JSON string.

#### Approach 2: Use intermediate LLM nodes to extract specific fields (More Control)

Add LLM nodes between HTTP calls to extract specific fields:

```
HTTP (Get IP)
  → LLM (Parse IP to extract just the IP address)
  → HTTP (Get Location using parsed IP)
  → LLM (Parse Location to extract lat/lon)
  → HTTP (Get Weather using lat/lon)
  → LLM (Summarize weather data)
```

Configure each intermediate LLM node's **output schema** to return structured data:

```json
{
  "type": "object",
  "properties": {
    "answer": {
      "type": "object",
      "properties": {
        "ip": { "type": "string" }
      }
    }
  }
}
```

Then reference `Parse IP` → `answer` → `ip` in the next HTTP node.

## Complete Example: IP → Location → Weather Workflow

### Node 1: HTTP - Get IP

- URL: `https://api.ipify.org?format=json`
- Output path: `response.body` = `'{"ip":"1.2.3.4"}'`

### Node 2: LLM - Extract IP

- Message: `Extract the IP address from: /[Get IP → response → body]`
- Output schema:
  ```json
  {
    "answer": {
      "type": "object",
      "properties": {
        "ip": { "type": "string" }
      }
    }
  }
  ```
- Output path: `answer.ip` = `"1.2.3.4"`

### Node 3: HTTP - Get Location

- URL: `https://ipapi.co/` (click variable icon) → `[Extract IP → answer → ip]` → `/json`
- Or use query params depending on the API
- Output path: `response.body` = `'{"latitude":37.5,"longitude":126.9,...}'`

### Node 4: LLM - Extract Coordinates

- Message: `Extract latitude and longitude from: /[Get Location → response → body]`
- Output schema:
  ```json
  {
    "answer": {
      "type": "object",
      "properties": {
        "latitude": { "type": "number" },
        "longitude": { "type": "number" }
      }
    }
  }
  ```

### Node 5: HTTP - Get Weather

- URL: `https://api.open-meteo.com/v1/forecast`
- Query params:
  - `latitude`: (variable icon) → `[Extract Coordinates → answer → latitude]`
  - `longitude`: (variable icon) → `[Extract Coordinates → answer → longitude]`
  - `current`: `temperature_2m` (literal string)
- Output path: `response.body` = `'{"temperature":15.4,...}'`

### Node 6: LLM - Summarize

- Message: `Provide a friendly weather summary based on this data: /[Get Weather → response → body]`
- Output: Natural language summary

### Node 7: Output

- Add output with key `result` pointing to `Weather Summary → answer`

## Tips and Best Practices

1. **Use LLM nodes as data transformers**: Since HTTP responses are strings, use LLM nodes to parse JSON and extract specific fields you need for the next API call.

2. **Configure Output Schemas**: For LLM nodes that extract data, always configure the output schema to match the structure you need. This makes it easier to reference specific fields in subsequent nodes.

3. **Check the variable icon**: When you click the variable icon in HTTP fields, you'll see all available fields from previous nodes. This helps you understand what data is available.

4. **Template nodes for simple formatting**: If you just need to combine multiple values into a string, use a Template node instead of an LLM node.

5. **Debug with the Output node**: Add an Output node and point it at intermediate results to see what data structure you're working with.

6. **See the example workflow**: Check `/src/lib/ai/workflow/examples/get-weather.ts` for a working example that chains LLM → HTTP calls.

## Common Patterns

### Pattern 1: HTTP → LLM Parse → HTTP

Use when you need to extract specific fields from a JSON response for the next API call.

### Pattern 2: HTTP → LLM Summary

Use when you just want to present the API data to the user in a friendly format.

### Pattern 3: Multiple HTTP → LLM Combine

Use when you need to fetch data from multiple sources and have an LLM synthesize them.

## Troubleshooting

### Problem: "Can't find the field I need in the variable selector"

**Solution**: The variable selector only shows fields defined in the node's output schema. For HTTP nodes, this is always `response.status`, `response.body`, etc. You cannot directly access nested JSON fields - you must parse them with an LLM node first.

### Problem: "The API requires a specific JSON format in the body"

**Solution**:

1. Use an LLM node to generate the JSON structure you need, OR
2. Write the JSON as a literal string in the body field and use variable icons for specific values that come from previous nodes

### Problem: "The output shows JSON as a string instead of an object"

**Solution**: This is expected behavior for HTTP nodes. Use an LLM node to parse the JSON string and extract the fields you need as structured data.

## Reference: Node Output Schemas

### HTTP Node

```typescript
{
  response: {
    status: number,
    statusText: string,
    ok: boolean,
    headers: object,
    body: string,  // Always a string!
    duration: number,
    size: number
  }
}
```

### LLM Node

```typescript
{
  totalTokens: number,
  answer: <your configured output schema>
}
```

### Template Node

```typescript
{
  template: string; // The processed template with variables substituted
}
```

### Tool Node

```typescript
{
  tool_result: object; // The result from the tool execution
}
```
