# Osmind Internal Readme

I'm going to start keeping a log here with some notes and information about changes we've made and processes we're using for this repo

## Local Development Environment Setup

### Quick Start

```bash
make dev-setup
```

This installs dependencies, creates your `.env` file, starts the database, and runs migrations. After it completes, add your API keys to `.env` and run `make dev`.

### Manual Setup

If the automated setup doesn't work:

1. Install dependencies: `pnpm install`
2. Copy `.env.example` to `.env` and fill in:
   - `POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/better_chatbot_dev`
   - `BETTER_AUTH_SECRET` (generate with `npx @better-auth/cli@latest secret`)
   - At least one LLM provider API key (OpenAI, Anthropic, or Google)
3. Start database: `make db-up`
4. Run migrations: `make db-migrate`
5. Start app: `make dev`

The app will be at http://localhost:3000

### Make Commands

We use Make to manage the local dev environment. Run `make help` to see all available commands for database management, testing, and code quality checks.

### File Storage

For local development with S3, configure these in your `.env`:

```bash
FILE_STORAGE_TYPE=s3
FILE_STORAGE_PREFIX=uploads
FILE_STORAGE_S3_BUCKET=osmind-better-chat-dev
FILE_STORAGE_S3_REGION=us-west-2
```

AWS credentials will be loaded from your AWS CLI configuration (`~/.aws/credentials`) or you can set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in `.env`.

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
