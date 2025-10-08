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
