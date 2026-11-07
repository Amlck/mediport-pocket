# Taita product-source review

Checked on **2026-11-07**. This is a targeted product/source review, with
clinical review of the monographs still pending. The linked product pages and
manufacturer inserts were reachable by anonymous HTTPS, without hospital
credentials or a private network. The public hospital pages below expose their
insert links to ordinary website visitors; they are not intranet endpoints.

## Product identities and manufacturer instructions

| Product | Official manufacturer page | Reviewed manufacturer insert |
| --- | --- | --- |
| Taita No. 1 | [Taiwan Otsuka product page](https://www.otsuka.com.tw/tw/product/infusion/detail/2) | [Common Nos. 1–4 insert, IP15-1812](https://www.cth.org.tw/public/medi_news/53026c888ca0d286d1c3e48491f143d1.pdf) |
| Taita No. 2 | [Taiwan Otsuka English product page](https://www.otsuka.com.tw/en/product/infusion/detail/3) | [Common Nos. 1–4 insert, IP15-1812](https://www.cth.org.tw/public/medi_news/53026c888ca0d286d1c3e48491f143d1.pdf) |
| Taita No. 3 | [Taiwan Otsuka product page](https://www.otsuka.com.tw/tw/product/infusion/detail/4) | [Common Nos. 1–4 insert, IP15-1812](https://www.cth.org.tw/public/medi_news/53026c888ca0d286d1c3e48491f143d1.pdf) |
| Taita No. 5 | [Taiwan Otsuka product page](https://www.otsuka.com.tw/tw/product/infusion/detail/6) | [No. 5 insert, IP1911](https://www.cth.org.tw/public/medi_news/a63f09fec4ec2f2894fe53e1f8d74cdd.pdf) |

The complete, one-page manufacturer inserts were visually read. The version
identifiers above are printed on the sheets; no publication/review date is
stated on them. The access-check date is separate from an insert version date.
No source PDF is redistributed in this repository.

The common insert lists a usual **500 mL per IV administration**, adjusted to
age and clinical condition. The No. 5 insert lists a usual **400–1200 mL per
administration** by peripheral or central IV infusion, with weight-dependent
adjustment for children. These are labelled administration statements, not
universal patient volumes, infusion rates or neonatal/paediatric protocols.

The inserts support the recorded ingredient/electrolyte concentrations and
glucose content. Scaling those concentrations to each record's declared bag
volume reproduces the existing structured contents. The values also agree with
the [public NTUH formulation table](https://reg.ntuh.gov.tw/pharmacyoutside/QueryDrugDetail.aspx?Drug_Code=TAI1FA27).
Product identity, composition, bag basis, calories and osmolarity were checked;
the existing composition and alias records were retained.

## Clinical evidence limits and correction

The reviewed product sources do **not** provide the previously displayed
weight-based maintenance/postoperative rates, numerical CrCl/haemodialysis
regimens or fixed Q-hourly laboratory schedules. Those derived numbers were
removed from all four monographs. Their removal reflects a missing evidence
binding; it is not a determination that every removed number is clinically
wrong. The references now explicitly state that a product-specific renal/rate
algorithm has not been established by this review.

[NICE CG174 recommendations](https://www.nice.org.uk/guidance/cg174/chapter/Recommendations)
(last updated 5 May 2017) separately support general **adult** IV-fluid
assessment/reassessment, an individualized management plan and expert input
for significant renal, hepatic or cardiac impairment (recommendations 1.1.6,
1.2.4 and 1.5.2). They are not a Taita-specific or paediatric dosing source.
The monographs use these general principles without deriving new numerical
product-specific rates or monitoring intervals.

The new source metadata records this limited review scope and retains
“clinician review pending.” The review date shown in the fluid view refers to
this source check; it does not certify a patient-specific prescription.

## Source bytes and traceability

The anonymously retrieved inserts had these SHA-256 hashes:

| Insert | SHA-256 |
| --- | --- |
| Common Nos. 1–4, IP15-1812, CTH public copy | `a1c5001ace340d10335f976faf460f251f218d3615ffc12bbcdc640f2341fe3d` |
| No. 5, IP1911, CTH public copy | `8fe57d99613a8aa33667f92370253697c9bc60a5a2c9d38c770470e8b26ead2a` |

Each corrected public drug record also has a `sources.transformations` entry
binding its before/after record hashes. `canonical-json-v1` recursively sorts
object keys, preserves array order and hashes the resulting compact JSON with
SHA-256. The initial import hashes remain historical import provenance;
the per-record entries identify the subsequent clinical-evidence correction.
