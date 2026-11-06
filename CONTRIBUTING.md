# Contributing to Mediport Pocket

Thank you for helping improve a reference that people can inspect, test and
use offline. Keep changes focused and describe the resulting behavior in the
pull request.

## Start with a small, reproducible change

1. Check existing issues and pull requests for related work.
2. Fork the repository and create a branch for your change.
3. Install dependencies with `npm ci`.
4. Edit source under `src/`, scripts or tests. Do not edit generated `dist/`.
5. Run `npm test`, `npm run build` and the relevant browser checks.
6. Open a pull request describing the problem, change, validation and remaining
   limits. Include a fictional before/after example when it helps review.

The public source in this repository is the maintained contribution target.
Keep shared clinical logic in `src/shared/`; views should present the engine's
returned result rather than implement a second set of clinical rules. Update
reference metadata and tests alongside any intended content change.

## Clinical references and calculator changes

Provide direct primary sources for a clinical claim: the original guideline,
official product information, professional-society publication or original
research as appropriate. Include the source version/date, the portion reviewed,
and the reason the implementation follows from it. Distinguish a full-source
review from an abstract-only or targeted check.

Preserve units, calculation inputs, dose basis, route, population and clinical
scope. State missing evidence and uncertainty explicitly. Missing or ambiguous
information must not become a claim that a condition, product or treatment is
absent, complete, safe or appropriate.

Add meaningful tests for changed arithmetic or decision branches, including
relevant boundaries, unit traps, missing inputs and invalid values. Clinical
content should carry its review date and limitations. A passing test confirms
specified software behavior; it does not replace clinician review. Clinical
changes require maintainer review before release.

Do not copy full guideline PDFs or third-party figures into the repository
without a compatible license and recorded attribution. New POCUS media needs
its original public source, creator credit, license URL, stated changes,
content hash and the applicable clinical limits beside its presentation.

## Public hospital sources

Links to NTUH formulary pages are allowed when the original page is publicly
accessible without a hospital login or private network. Record the exact public
URL and the date it was checked. Do not silently substitute an internal HIS
endpoint or infer current availability from an old catalog identity.

Captured hospital order sets, private catalog exports, saved local regimen
rows, internal screenshots and patient data remain outside this public
repository. A publicly reachable formulary link does not by itself authorize
redistributing unrelated captured content.

## Interface and offline behavior

Check narrow phone screens, large text, keyboard operation and clear labels.
Keep source dates, warnings and units beside the information they qualify.
Use plain language and retain source attribution.

Preserve complete-pack verification, same-version clinical files, failure
recovery and close-all-windows update activation. Do not force an active app
window to update or reload. Do not add analytics, remote scripts or patient
input persistence as incidental changes.

## Reports and privacy

Use fictional inputs and a minimal reproduction. Include the app's installed
pack version, browser/OS, steps, expected behavior and actual behavior. Redact
screenshots before sharing them. Never post names, identifiers, chart text,
access tokens, API keys or private hospital URLs.

Report suspected vulnerabilities using [SECURITY.md](SECURITY.md). Do not place
patient information or exploit details in a public issue.

## Licensing

Contributions to original project code use the [MIT License](LICENSE). Preserve the separate
licenses in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). State the origin
and license of new third-party material in your pull request. Do not describe
code review, merge or packaging approval as clinical or institutional approval.
