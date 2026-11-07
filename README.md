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

The public edition contains 175 drug monographs, 25 management guides,
clinical calculator workflows and seven POCUS topics. POCUS includes 50 figures,
five motion clips and five posters with individual credits and reuse licenses.

Search also covers about 2,300 **NTUH formulary listings**. Each listing is
only a product name, generic name, Chinese name and drug class, linking to
NTUH's own public product page (`QueryDrugDetail.aspx?Drug_Code=…`). The NTUH
code appears only because that public URL needs it. NTUH's dose, dose-adjustment
and package-insert content stays on NTUH's site and is not copied here. Listings
open online, come from a dated snapshot, and do not confirm current
availability. Products marked discontinued, compassionate-use only or not
dispensed are left out, and NTUH's internal billing, ward-stock and local
prescribing-restriction notes are removed from product names. Nine explicitly reviewed product identities link to a compatible Pocket
monograph. Their exact code, full product label, ingredient and monograph scope
are checked during the build. Other listings link only to NTUH; a shared name,
ingredient substring or catalog search match does not establish equivalence.

This public edition omits saved local regimens, internal hospital resource
tables, four Taita monographs and seven guides with hospital-specific
product or stocking context (status epilepticus, systemic corticosteroids,
anticoagulant bleeding, hypertensive emergency, anaphylaxis, hypomagnesaemia
and hypermagnesaemia) pending public-source and clinical portability review. Four ECG illustrations without recorded reuse provenance are
omitted while the text reading workflow remains. Steroid equivalence is
available without historical local product counts. Ordinary calculator lab
review remains; the guided numeric lab-to-guide bridge is omitted because its
previous registry imported excluded hospital modules.

Hospital code and reference content may be contributed when its original
source is reliably accessible without a hospital login, intranet or VPN, and
can be found through public internet sources. Record the public URL, access
check and reuse rights. Intranet-only captures and patient records stay private.
See the [NTUH source review](docs/ntuh-source-review.md) for this index.

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
| `src/data/ntuh-index.json` | Generated NTUH formulary link index; regenerate, do not hand-edit |
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

Merges here deploy **public Pocket** after its checks pass. Downstream private
integrations can import this shared source at an exact commit and open their
own tested update pull requests. They maintain their own integration tests,
private supplements and release process. No private repository credential is
needed here. Intranet-only integrations, resources without verified public sources and
patient data remain outside this repository. Shared fixes belong here; private adaptations
belong in the consuming project.

## Refresh the NTUH listings

The committed index can be regenerated without any private checkout or capture:

```sh
node scripts/generate-ntuh-index.mjs --from-index src/data/ntuh-index.json
npm test
```

This retains the **2026-08-28 snapshot date**; it is a cleanup/rebuild, not a
fresh catalog check. A new public catalog scrape can instead be supplied as
`node scripts/generate-ntuh-index.mjs path/to/public-catalog.json`. Record its
public source and access evidence before committing it. Legacy search-audit
inputs are ignored because they cannot establish product equivalence.

The build rejects non-link fields, status/administrative notes in either
language, invalid public-source metadata and unreviewed monograph associations.
New associations require an explicit review of the exact product, route,
formulation, mixture and release characteristics against the monograph scope.

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
