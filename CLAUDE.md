# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

**Note**: This project uses `make` commands as the primary interface. Run `make help` to see all available commands.

### Initial Setup
```bash
make install         # Install dependencies
make dev-setup       # Interactive dev setup (creates .env, starts DB, runs migrations)
```

### Development
```bash
make dev             # Start development server (assumes DB is running)
make dev-full        # Start database + dev server together
```

### Database
```bash
make db-up           # Start PostgreSQL in Docker
make db-down         # Stop PostgreSQL
make db-logs         # View PostgreSQL logs
make db-reset        # Drop all tables and recreate schema (complete reset)
make db-migrate      # Apply database migrations
make db-shell        # Open psql shell
make db-studio       # Open Drizzle Studio (database GUI)
```

### Testing
```bash
make test            # Run unit tests (Vitest)
make test-watch      # Run unit tests in watch mode
make test-e2e        # Run end-to-end tests (Playwright)
make test-e2e-ui     # Run e2e tests with interactive UI
```

### Code Quality
```bash
make lint            # Run linting
make format          # Format code with Biome
make check           # Run all checks (lint, types, and tests)
```

### Running a Single Test
```bash
# Unit test
pnpm test -- path/to/file.test.ts

# E2E test
pnpm test:e2e -- tests/agents/agent-creation.spec.ts
pnpm test:e2e -- tests/agents/agent-creation.spec.ts --headed  # With visible browser
```

### Database Schema Changes (when needed)
```bash
pnpm db:generate     # Generate new migrations from schema changes
make db-migrate      # Apply migrations
```

## High-Level Architecture

### Core Technology Stack
- **Framework**: Next.js 15 (App Router) with React 19
- **Database**: PostgreSQL 17 with Drizzle ORM
- **Authentication**: Better Auth (open-source auth framework)
- **AI Integration**: Vercel AI SDK with multi-provider support
- **File Storage**: Abstract interface supporting Vercel Blob and AWS S3
- **Caching**: Dual implementation (Redis for production, in-memory for dev)
- **Styling**: Tailwind CSS 4 with Radix UI components

### AI Provider Integration Pattern

The application uses an abstraction layer (`src/lib/ai/models.ts`) to support multiple LLM providers:
- OpenAI, Anthropic Claude, Google Gemini, xAI Grok, Ollama, Groq, OpenRouter
- Each provider integrated via Vercel AI SDK's provider packages (`@ai-sdk/*`)
- Providers registered with model definitions and capabilities metadata
- Unsupported models tracked in a Set to identify models without tool calling support

### MCP (Model Context Protocol) Architecture

MCP integration enables dynamic tool loading from external servers:

**Manager Pattern**: `MCPClientsManager` singleton maintains active connections
- Lazy initialization on first tool request
- Supports both stdio and remote (SSE) MCP servers
- Tools wrapped as Vercel AI `Tool` objects with metadata tags (`_mcpServerName`, `_mcpServerId`, `_originToolName`)
- OAuth support for authenticated tools

**Storage Backends**: Dual configuration storage
- Database-backed (default): MCP servers stored in PostgreSQL per user
- File-based: Read from local config files (enabled via `FILE_BASED_MCP_CONFIG=true`)

**Tool Customization**: Users can add custom instructions to MCP tools and servers via database tables

### Workflow and Agent System

**Workflows**: DAG-based execution using `ts-edge` state graph library
- Node types: Input, LLM, Tool, Condition, HTTP, Template, Output
- Stored as `Workflow`, `WorkflowNode`, `WorkflowEdge` database entities
- Published workflows become callable tools via `@workflow_name` mentions
- Execution happens in API layer with result streaming

**Agents**: Pre-configured AI personas
- System prompt + selected LLM model + tool mentions
- Tools can include MCP tools, default app tools, or workflows
- Invoked with `@agent_name` syntax in chat

### Streaming & Tool Calling Flow

The chat API (`/api/chat/route.ts`) orchestrates real-time AI interactions:

1. **Message Processing**: Convert uploaded files to compatible formats per provider
2. **Tool Loading**: Merge MCP tools, workflows, and default app tools
3. **System Prompt Composition**: Combine user preferences, agent instructions, and MCP customizations
4. **Stream Execution**: `streamText()` processes messages with tool calling
5. **Tool Execution Modes**:
   - `auto`: Model decides when to call tools
   - `none`: No tool access
   - `manual`: Tool calls prepared but not executed (requires user confirmation)
6. **Response Streaming**: Word-level chunking via `smoothStream()` for better UX
7. **Persistence**: Messages saved with metadata (model, usage, tool count)

### Database Schema & Repository Pattern

**Core Tables**:
- `User` → `ChatThread` → `ChatMessage` (hierarchical chat history)
- `Agent` (AI personas with instructions and tool access)
- `Workflow` → `WorkflowNode` → `WorkflowEdge` (DAG representation)
- `MCPServer` (user's MCP configurations)
- `Archive` + `ArchiveItem` (organizing agents/workflows/MCPs)

**Repository Pattern**: Database abstraction in `src/lib/db/repository.ts`
- Implementation files: `*-repository.pg.ts`
- Singleton instances exported from repository.ts
- Each repository focuses on one entity domain

### File Organization Conventions

**Type System**:
- Domain types in `src/types/*.ts` (chat.ts, mcp.ts, agent.ts, workflow.ts)
- Zod schemas co-located for validation
- Tag-based typing for custom tool types (`VercelAIMcpToolTag`, `VercelAIWorkflowToolTag`)

**API Routes**:
- Server actions for database operations (create/update/delete)
- `/api/chat` handles streaming via `createUIMessageStream`
- Feature routes mirror URL structure (e.g., `/api/mcp/*`)

**Component Structure**:
- Base UI components in `src/components/ui/` (Radix-based)
- Feature components organized by domain (chat, agent, workflow, tool-invocation)
- Use data-testid attributes for e2e test stability

### Authentication & Authorization

**Better Auth Setup** (`src/lib/auth/auth-instance.ts`):
- Cookie-based sessions (7-day expiration, secure, sameSite)
- Drizzle adapter for PostgreSQL storage
- Role-based access: admin/editor/user
- First registered user automatically becomes admin
- OAuth support for Google, GitHub, Microsoft

### File Storage Abstraction

Abstract interface (`src/lib/file-storage/file-storage.interface.ts`):
- Backends: Vercel Blob (default) or AWS S3
- Operations: upload, download, delete, metadata retrieval
- Presigned URLs for browser-based uploads
- Content type handling for file conversion logic

### File Type Conversion

Different AI providers support different file types. The application automatically converts unsupported file types:
- CSV/JSON/Markdown → Plain text for non-Gemini providers
- Conversion happens in message preprocessing before streaming
- Provider capabilities checked against file MIME types

## Important Development Patterns

### Adding a New AI Tool

1. Create tool file in `src/lib/ai/tools/category/`
2. Define tool with Zod schema for parameters
3. Implement execution function
4. Register in `APP_DEFAULT_TOOL_KIT` in category index
5. Export from `src/lib/ai/tools/index.ts`

### Adding a New Workflow Node Type

1. Add to `NodeKind` enum in `src/types/workflow.ts`
2. Create `*NodeData` type for node configuration
3. Implement executor in workflow execution logic
4. Add validation for node data
5. Update UI workflow builder components

### Database Schema Changes

1. Modify schema in `src/lib/db/pg/schema.pg.ts`
2. Generate migration: `pnpm db:generate`
3. Review migration SQL in `src/lib/db/migrations/pg/`
4. Apply migration: `make db-migrate`
5. Update repository methods if needed

### Writing E2E Tests

**Test Structure**:
- Tests in `tests/` directory organized by feature
- Use `TEST_USERS` constants from `tests/constants/test-users.ts`
- Always use `data-testid` attributes for selectors
- Generate unique test data with timestamps to avoid conflicts

**Authentication**:
```typescript
import { TEST_USERS } from '../constants/test-users';

test.describe('Feature Tests', () => {
  test.use({ storageState: TEST_USERS.editor.authFile });

  test('should perform action', async ({ page }) => {
    // Test logic
  });
});
```

**Multi-User Testing**:
```typescript
test('multi-user workflow', async ({ browser }) => {
  const user1Context = await browser.newContext({
    storageState: TEST_USERS.editor.authFile,
  });
  const user2Context = await browser.newContext({
    storageState: TEST_USERS.editor2.authFile,
  });
  // Test sharing/permissions
});
```

### Performance Considerations

- MCP tools loaded lazily from singleton manager
- Database queries optimized via repository pattern
- Stream-based responses (no buffering)
- File conversion only for incompatible provider/file pairs
- Redis caching for model lists, MCP tools, user preferences

## Testing Strategy

**Unit Tests (Vitest)**:
- Located alongside source files: `*.test.ts`
- Mock server-only imports via test utils
- Run with `make test` or `make test-watch`

**E2E Tests (Playwright)**:
- 48 tests covering core functionality
- 4 test users: admin, editor, editor2, regular
- Automatic test data cleanup after runs
- Requires: PostgreSQL, LLM API key, BETTER_AUTH_SECRET
- Run with `make test-e2e` or `make test-e2e-ui`

## Contributing Guidelines

**PR Title Format**: Must follow Conventional Commits
- `feat:`, `fix:`, `chore:`, `docs:`, `style:`, `refactor:`, `test:`, `perf:`, `build:`
- Only PR title matters (not commit messages)
- Squash merge used to keep history clean

**Before Submitting PR**:
1. Run `make check` (lint, type check, unit tests)
2. Run `make test-e2e` for comprehensive testing
3. Add unit tests for new logic
4. Add/update e2e tests for UI changes
5. Include screenshots for visual changes

**Major Changes**: Create an issue first to discuss features, API changes, or breaking changes

## Environment Setup

Required variables:
```bash
POSTGRES_URL=                    # PostgreSQL connection string
BETTER_AUTH_SECRET=              # Generate with: npx @better-auth/cli@latest secret

# At least one LLM provider (choose any):
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
XAI_API_KEY=
OPENROUTER_API_KEY=
OLLAMA_BASE_URL=
```

Optional variables:
```bash
EXA_API_KEY=                     # Web search via Exa AI
FILE_STORAGE_TYPE=               # vercel-blob or s3
FILE_BASED_MCP_CONFIG=           # true for file-based MCP config
```
