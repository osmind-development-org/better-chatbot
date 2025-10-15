# Osmind Internal Readme

I'm going to start keeping a log here with some notes and information about changes we've made and processes we're using for this repo

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
