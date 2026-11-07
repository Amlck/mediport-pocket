# Agent instructions

Before making any change in this repository:

1. Read [docs/agent-coordination.md](docs/agent-coordination.md) and the open
   PRs. Until #5 merges, read the coordination file on
   `claude/agent-coordination`; afterward use `main`.
2. Claim the work in its **In progress** table and add a dated log entry in
   the same PR as the change.
3. If pushing to the other agent's branch, log what changed and why, and
   leave a PR comment.
4. Merge a PR only when the owner explicitly requests it in the current
   session. Every merge to `main` deploys after CI passes.

Also follow [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
This repository and its coordination notes are public: exclude patient data,
credentials, internal hostnames and private Medical content. Refer to private
work only by repository/branch name. Verified public hospital sources follow
the contribution guidelines.
