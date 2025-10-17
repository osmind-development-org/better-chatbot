# Osmind Internal Readme

I'm going to start keeping a log here with some notes and information about changes we've made and processes we're using for this repo

## Local Development Environment Setup

### Prerequisites

We recommend installing node with asdf, PNPM with npm, and Docker and the AWS CLI with homebrew.

- Node.js: Version 20.x or higher (check with `node --version`)
- pnpm: Version 9.x or higher (install with `npm install -g pnpm`)
- Docker: Required for running the local PostgreSQL database
- AWS CLI (optional): For S3 file storage functionality

### Quick Start

```bash
make dev-setup
```

This installs dependencies, creates a `.env` file (including auto-generating `BETTER_AUTH_SECRET`), starts the database, and runs migrations.

After it completes, you'll need to manually add values to your `.env` file:

- LLM provider API keys (stored in 1Password - search for "Better Chat Dev API Keys")
- AWS credentials (if using S3 file storage)

Then run `make dev` to start the development server.

### Manual Setup

If the automated setup doesn't work:

1. Install dependencies: `pnpm install`
2. Copy `.env.example` to `.env` and fill in:
   - `NODE_ENV=development` (this lets the DB connection actually work locally)
   - `POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/better_chatbot_dev`
   - `BETTER_AUTH_SECRET` (generate with `npx @better-auth/cli@latest secret`)
   - At least one LLM provider API key: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GOOGLE_GENERATIVE_AI_API_KEY` (stored in 1Password - search for "Better Chat Dev API Keys")
   - For S3 file storage:
     - `FILE_STORAGE_TYPE=s3`
     - `FILE_STORAGE_S3_BUCKET=osmind-better-chat-dev`
     - `FILE_STORAGE_S3_REGION=us-west-2`
   - AWS credentials: Either set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in `.env`, or use your local AWS CLI config (`~/.aws/credentials`)
3. Start database: `make db-up`
4. Run migrations: `make db-migrate`
5. Start app: `make dev`

The app will be at http://localhost:3000

### Make Commands

We use Make to manage the local dev environment. Run `make help` to see all available commands for database management, testing, and code quality checks.

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
