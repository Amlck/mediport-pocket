# Public product-source checks for the restored guides

On **2026-11-07**, Codex retrieved the 17 NTUH public drug-detail URLs recorded
in [the check inventory](ntuh-guide-source-review.json) through anonymous HTTPS
GET requests without cookies or application credentials. Each response identified
the requested code and displayed its generic and product label. The nine pages
requested in #6 were all checked, together with the additional product identities
used by the corticosteroid, seizure and calcium cautions.

The public catalog snapshot remains dated **2026-08-28**. The new access check is
an identity/label-strength check, not a fresh crawl, a dosing review or proof of
current stock. Availability annotations are not encoded in this inventory.
Names and strengths do not establish preparation, tablet splitting, substitution,
orderability or patient-specific suitability. Full source HTML and dose tables
are not copied into the repository.

The source-fetch service could not open these endpoints, while direct anonymous
HTTPS requests returned the product identities. This access evidence is specific
to the recorded URLs and date; it is not an assurance that every NTUH endpoint
will remain reachable.

The guides now link to these public pages as **product identity** sources and
retain their separate guideline/trial sources for clinical recommendations.
Their original clinical review dates and review limitations remain in place.

The portability review also removes catalog-based absence/exclusivity claims
about oral hydrocortisone and fosphenytoin. It withholds automatic ampoule or
tablet-quantity conversions and states that actual product/preparation must be
confirmed. The generalized protocol caution is limited to this guide's recorded
source contract, without claiming that a private protocol is a published rule.
Clinical regimen and eligibility logic were not changed by these wording edits.
