# Automatic public deployment

The existing public address is
[mediport-pocket.abuzz-moth-0863.chatgpt.site](https://mediport-pocket.abuzz-moth-0863.chatgpt.site).
GitHub Actions publishes a new release after a `main` push passes all checks.
Pull requests run tests without deployment credentials and never publish.

## Release flow

1. The workflow checks out the exact event commit and installs the lockfile.
2. Node tests run, then the build uses the commit timestamp as
   `SOURCE_DATE_EPOCH`. Integrity and browser tests run against that build.
3. A final integrity/source check requires a clean tree and a release source
   commit equal to the workflow SHA. The exact tested `dist/` is saved as an
   immutable, commit-named Actions artifact for 30 days.
4. The production job downloads that artifact without rebuilding. It uploads
   the manifest and files to the same Site and atomically activates the complete
   verified release. Failed or incomplete uploads cannot change the live pointer.
5. Live checks verify every file hash, the active source SHA, a fresh offline
   browser install, the source-commit link and an offline calculator run.

Production jobs are serialized without cancelling an activation halfway through.
Both client and host reject runs superseded by a newer `main` commit. An old
run which becomes stale is skipped rather than replacing a newer release.

## Authentication and limits

No hosting API key or long-lived deployment secret is stored in GitHub.
Only the production job has `id-token: write`. It requests a short-lived GitHub
Actions OIDC token with the exact Site origin as its audience; the host validates
that identity, the production environment, workflow and `main` push source.
The token is never printed or written to repository files.

The client uploads at most 300 files, 4 MiB per file and 32 MiB per release.
Requests reject redirects and use bounded retries. Activation obtains a fresh
OIDC token and rechecks `main`; the host independently enforces its source lease.
GitHub repository access is read-only in both jobs. Configure the `production`
environment to allow only `main` and leave required reviewers off for automatic
publication.

## Stored releases and offline updates

Each complete release lives under its immutable version prefix. Its service
worker downloads and repairs only that version, so a later deployment cannot
mix new assets into a previous pack. Activation changes the root's active
pointer while previously downloaded packs continue working. Existing users
keep their home-screen icon and QR code; they check for an update and close all
Pocket windows/tabs before reopening to activate it.

## Failures and rollback

A failed test or upload leaves the active release alone. Deployment failures
appear in GitHub Actions; successful jobs include the public URL, version and
source commit in their summary. If a new release needs to be rolled back,
revert the change on `main`: the same tests and deployment checks then publish
the reviewed previous behavior as a new, source-bound release. Do not bypass
source or integrity checks to activate arbitrary files. Stored historical
versions remain available for existing offline workers and investigation.

The hosting bridge source and its identity/integrity tests are kept next to
this document. Its initial bootstrap retains the previously published pack.
