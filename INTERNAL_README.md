# Osmind Internal Readme

I'm going to start keeping a log here with some notes and information about changes we've made and processes we're using for this repo

## Local Development Environment Setup

### Prerequisites

We recommend installing Node with asdf, pnpm with npm, and Docker and the AWS CLI with homebrew.

- Node.js 20.x+
- pnpm 9.x+ (`npm install -g pnpm`)
- Docker (for PostgreSQL)
- AWS CLI (optional, for S3 storage)

### Quick Start

```bash
pnpm install    # Install dependencies
make dev-setup  # Interactive setup + DB
```

The interactive setup will prompt you for:

- Environment settings (defaults provided for local dev)
- Auth preferences:
  - Telemetry (default: disabled)
  - Email sign-in (default: disabled)
  - Sign-ups (default: enabled)
- At least one LLM provider API key (we keep these in 1PW)
- Google OAuth credentials (optional)
- File storage type (local/S3, optional)
- AWS profile if using S3 (defaults to `osmind-prod`)

Sensitive values are hidden during input. After setup completes, run `make dev` to start at http://localhost:3000.

### Manual Setup

If you skip the interactive setup or need to edit `.env` later:

1. Run `pnpm install` (creates `.env` from template)
2. Edit `.env` with:
   - `NODE_ENV=development`
   - `POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/better_chatbot_dev`
   - `BETTER_AUTH_SECRET` (generate: `npx @better-auth/cli@latest secret`)
   - `BETTER_AUTH_URL=http://localhost:3000`
   - `BETTER_AUTH_TELEMETRY=0` (0=disabled, 1=enabled)
   - `DISABLE_EMAIL_SIGN_IN=1` (0=allow, 1=disable)
   - `DISABLE_SIGN_UP=0` (0=allow, 1=disable)
   - At least one LLM key: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GOOGLE_GENERATIVE_AI_API_KEY`
   - (Optional) Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - (Optional) S3 storage:
     - `FILE_STORAGE_TYPE=s3`
     - `FILE_STORAGE_S3_BUCKET=osmind-better-chat-dev`
     - `FILE_STORAGE_S3_REGION=us-west-2`
     - `FILE_STORAGE_PREFIX=uploads`
     - `AWS_PROFILE=osmind-prod`
3. Run `make db-up && make db-migrate && make dev`

### Make Commands

Run `make help` for all available commands (database, testing, code quality).

---

## Staying up-to-date with upstream

Where possible, you should try to do this in a separate branch with no other changes. These can get big, and it could be hard to review. Currently, the best way to do this is a fairly manual process. What I did:

1. Check out a new branch from main. Confirm you have the original repo as an upstream source:

   ```
   $ git remote -v
   better-chat     git@github.com:osmind-development-org/better-chat.git (fetch)
   better-chat     git@github.com:osmind-development-org/better-chat.git (push)
   origin  git@github.com:osmind-development-org/better-chatbot.git (fetch)
   origin  git@github.com:osmind-development-org/better-chatbot.git (push)
   upstream        git@github.com:cgoinglove/better-chatbot.git (fetch)
   upstream        git@github.com:cgoinglove/better-chatbot.git (push)
   ```

   Those upstream lines indicate that I have it. If those aren't there, create one with this command:

   ```
   $ git remote add upstream git@github.com:cgoinglove/better-chatbot.git
   ```

2. However you got the upstream set up, fetch it with:

   ```
   $ git fetch upstream
   ```

3. Rebase our changes onto the changes from the main upstream branch:

   ```
   $ git merge upstream/main
   ```

   **IMPORTANT:** You might have to manually work through some merge conflicts here.

4. Push your branch and open a PR from your new branch to main.

## Contributing back to upstream (draft)

This is not a fully fleshed-out system yet, but the broad strokes that we identified as a process for contributing back to upstream looks like this:

1. Checkout a new branch in our fork using `upstream/main` as the source:

   ```bash
   git checkout -b feature-for-upstream upstream/main
   ```

1. Cherry pick individual commits or files into that new branch
1. Add any updates or changes that we need to bring us in-line with their contribution guidelines as defined in [CONTRIBUTING.md](./CONTRIBUTING.md)
1. Open a PR to `upstream/main` with the changes that we want to contribute

Once our contributions have been accepted, we will go back through the process for pulling in upstream changes. We're (tentatively) ok with our changes getting occasionally stomped by upstream changes.
