# Mediport Pocket

An installable, offline clinical reference for phones and desktop browsers.

Public source: [Amlck/mediport-pocket](https://github.com/Amlck/mediport-pocket).

**[Open Mediport Pocket](https://mediport-pocket.abuzz-moth-0863.chatgpt.site/)** · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Media credits](THIRD_PARTY_NOTICES.md)

## Install on your phone

Scan this QR code, or [open the installation page](https://mediport-pocket.abuzz-moth-0863.chatgpt.site/#/install).
No account, Tailscale connection or app store is required.

<a href="https://mediport-pocket.abuzz-moth-0863.chatgpt.site/#/install"><img src="docs/mediport-pocket-qr.png" width="240" height="240" alt="Scan to open Mediport Pocket installation instructions"></a>

[Download the QR image to share](docs/mediport-pocket-qr.png).

### iPhone

1. Open the link in **Safari**. If it opened inside another app, choose **Open in Safari**.
2. Tap **Share → Add to Home Screen**.
3. Keep **Open as Web App** enabled if shown, then tap **Add**.
4. Open the new **Pocket** icon while online. In **Installed pack**, wait for **Offline copy verified**.

### Android

1. Open the link in **Chrome**.
2. Open the **⋮ menu → Install app**, or **Install and create shortcut → Install**, and follow the prompts.
3. Open the new **Pocket** icon while online. In **Installed pack**, wait for **Offline copy verified**.

Once verified, the downloaded references and calculators work offline. External
source links need internet access. Browser storage can be cleared or evicted;
check the offline status again if the copy becomes unavailable.

## Updates

Keep the same home-screen icon, link and QR code. There is no need to reinstall.

1. Connect to the internet and open Pocket.
2. Open **Installed pack → Check for update**.
3. If an update is available, wait for **Downloaded · ready to install**.
4. Close **every Pocket app window and any Pocket tabs in Safari or Chrome**, then reopen Pocket.
5. Confirm the version under **In use** and **Offline copy verified**.

The current pack stays in use while the new one downloads and is verified. A
failed download keeps the previous usable pack. Pocket never forces a reload
in the middle of a calculation. Your phone can also discover updates when
reopened online, but **Check for update** is the explicit way to check now.
Public updates need an internet connection; no Mac or Tailscale is required.

For maintainers: changes pushed or merged into **main automatically deploy to
the existing public address after all Node, build-integrity and browser tests
pass**. Pull requests run checks but do not deploy. The deployment uses the
exact tested build, verifies the live release and rejects stale runs; no local
Mac or manual publishing step is needed. See [deployment details](deployment/README.md).
Installed users download the published release using the steps above; running
calculations are never force-reloaded.

## What is included

The initial public edition contains 175 drug monographs, 12 management guides,
clinical calculator workflows and seven POCUS topics. POCUS includes 50 figures,
five motion clips and five posters with individual credits and reuse licenses.

This public edition omits captured hospital catalog identities, order codes and
saved local regimens, four Taita monographs and 20 guides containing captured
hospital context. Four ECG illustrations without recorded reuse provenance are
omitted while the text reading workflow remains. Steroid equivalence is
available without historical local product counts. Ordinary calculator lab
review remains; the guided numeric lab-to-guide bridge is omitted because its
previous registry imported excluded hospital modules.

Public NTUH formulary links may be included when their original destination
was publicly accessible. A public link does not authorize copying a private
hospital capture, catalog export, order set or patient record into this project.

Reference content retains its review dates, source limitations and uncertainty.
This is an educational reference; packaging dates and successful tests are not
clinician review or validation for a particular patient. Physical iPhone/Safari
installation and clinician review remain separate from browser verification.

## Build and run

Use Node.js 22 and npm. The repository is self-contained; a checkout of the
private Medical/Portal project is not required.

```sh
npm ci
npm test
npm run build
npm run verify
npm run serve
```

Open the local URL printed by the server. It binds to loopback and serves only
the built Pocket inventory. It does not expose the repository root. Production
hosting needs HTTPS for the service worker; localhost supports development.

For browser checks:

```sh
npx playwright install chromium
npm run test:browser
```

The tests use fictional numeric inputs and static reference material. They do
not connect to a hospital system or use patient records.

## Source layout

| Path | Purpose |
| --- | --- |
| `src/app/` | App shell, views, styles and icons |
| `src/shared/` | Editable public calculator and guide modules |
| `src/data/reference.json` | Public reference data, review metadata and provenance |
| `src/images/` | Allowlisted teaching media with attribution in the reference data |
| `src/sw-template.js` | Verified offline download and cache behavior |
| `scripts/` | Standalone build and loopback preview tooling |
| `tests/` | Build, offline and browser checks |
| `dist/` | Generated deployment output; do not edit directly |

The initial source was extracted from the maintained Mediport implementation
with hospital-only content removed. The extracted public files are maintained
here. Original source paths and hashes are provenance of that extraction;
they do not imply that a private source checkout is needed or that a changed
public file is still byte-identical to its ancestor.

Merges here update **public Pocket only**. They do not automatically update the
private Medical/Portal app. A future shared core package could hold reusable
logic, with the private app using a pinned version and automated dependency
pull requests for review. Hospital integrations and internal resources would
remain private; that cross-project synchronization is not implemented today.

## Verify a build

The build emits an explicit asset inventory with SHA-256 hashes. The service
worker verifies the complete pack before reporting offline readiness. It keeps
one installed reference version per running session and does not add arbitrary
runtime requests to its cache.

Set `SOURCE_DATE_EPOCH` to a fixed Unix timestamp when reproducing a release.
Use the same source commit and dependency lockfile, then compare the generated
inventory and file hashes. The build tests check repeated builds for identical
output under the same declared inputs.

The public host may transform HTML responses. The offline downloader therefore
uses a plain-text copy of the exact app shell, verifies the original shell hash,
and restores its HTML content type in the cache. It does not accept injected
HTML as the verified offline shell.

A downloaded update waits until all Pocket windows close and reopen. Existing
sessions are not reloaded in the middle of a calculation. Already downloaded
offline bytes cannot reliably be recalled by changing server access.

## Contributions and reuse

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for
source, clinical-reference and test requirements. Never include real patient
data, credentials, private screenshots or hospital captures.

Original project code is available under the [MIT License](LICENSE). Third-party
media retains its own licenses and attribution requirements; see
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Public availability is not a
blanket license for every linked source or for downstream clinical use.
