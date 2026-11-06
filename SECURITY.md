# Security and sensitive-data reports

Mediport Pocket is a public static reference. It is designed to run numeric
calculations locally and to download only its explicit reference pack. It does
not need patient records, credentials, databases or a hospital connection.

## Report a vulnerability privately

Use GitHub's **Report a vulnerability** option in this repository's Security tab
if it is available. Include a minimal reproduction using fictional data, the
source commit or installed pack version, browser/OS and the expected impact.

If private vulnerability reporting is unavailable, open a minimal public issue
asking the maintainer for a private reporting channel. Include no exploit
instructions, credentials, patient data or sensitive screenshots in that issue.
No private email address or institutional reporting address is assumed here.

Do not test against hospital systems, other people's accounts or devices, or
real patient records. Do not publish discovered secrets. The maintainers will
coordinate an appropriate fix and disclosure after reviewing the report.

## Scope

Reports about untrusted input reaching the UI, unsafe source links, incorrect
offline integrity checks, unexpected network transmission, exposed secrets or
public-pack content leakage are in scope. Clinical-reference concerns should
also be reported with primary sources and fictional examples; use private
reporting if the reproduction contains sensitive information.

The current public source and latest published public pack are the supported
versions. An offline copy can outlive a server update. Users should reconnect
and check the installed pack for updates; remote changes cannot reliably erase
already downloaded content.
