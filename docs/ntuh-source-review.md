# NTUH link-index source review

The committed index is a **2026-08-28 catalog snapshot**. The cleanup in this
pull request rebuilds the already-public index; it does not import Medical's
private captures, change that snapshot date or certify current availability.

## Public access and discovery

Checked on 2026-11-07 without application credentials or hospital cookies:

- NTUH's [public drug search](https://reg.ntuh.gov.tw/pharmacyoutside/QueryDrug.aspx)
  is indexed by public internet search engines (search for `台大 藥品資料查詢`).
- NTUH's [public medication information page](https://www.ntuh.gov.tw/ntuh/Fpage.action?fid=3174&muid=107)
  describes the drug-name search for the public.
- The hospital's [2020 public pharmacy newsletter](https://epaper.ntuh.gov.tw/health/202011/health_4.html)
  also directs readers to its online drug information.
- The snapshot identifies the [public pharmacology catalog](https://dept.ntuh.gov.tw/phar/WebAp/QueryDrugInfoPhr.aspx)
  as its original source. The web-fetch service timed out on some NTUH URLs;
  direct anonymous HTTPS requests to the nine detail pages below succeeded.

All nine retained monograph associations were checked against their anonymous
public detail page. Returned code, generic and full English product label
matched the committed index exactly:

| Public product page | Product identity |
| --- | --- |
| [AMO4AA16](https://reg.ntuh.gov.tw/pharmacyoutside/QueryDrugDetail.aspx?Drug_Code=AMO4AA16) | Amoxicillin capsule |
| [DYN5AA40](https://reg.ntuh.gov.tw/pharmacyoutside/QueryDrugDetail.aspx?Drug_Code=DYN5AA40) | Amoxicillin oral suspension |
| [AUG5AA34](https://reg.ntuh.gov.tw/pharmacyoutside/QueryDrugDetail.aspx?Drug_Code=AUG5AA34) | Amoxicillin/clavulanate oral suspension |
| [AMB1AL18](https://reg.ntuh.gov.tw/pharmacyoutside/QueryDrugDetail.aspx?Drug_Code=AMB1AL18) | Liposomal amphotericin B injection |
| [ELI4EA49](https://reg.ntuh.gov.tw/pharmacyoutside/QueryDrugDetail.aspx?Drug_Code=ELI4EA49) | Apixaban tablet |
| [VFE1AL23](https://reg.ntuh.gov.tw/pharmacyoutside/QueryDrugDetail.aspx?Drug_Code=VFE1AL23) | Voriconazole infusion |
| [VFE4AL23](https://reg.ntuh.gov.tw/pharmacyoutside/QueryDrugDetail.aspx?Drug_Code=VFE4AL23) | Voriconazole tablet |
| [DEX1FA08](https://reg.ntuh.gov.tw/pharmacyoutside/QueryDrugDetail.aspx?Drug_Code=DEX1FA08) | Plain dextrose 10% infusion |
| [GIB1FA08](https://reg.ntuh.gov.tw/pharmacyoutside/QueryDrugDetail.aspx?Drug_Code=GIB1FA08) | Plain dextrose 10% infusion |

This is a targeted identity/access check, not a new crawl of all 2,289 listings
or a clinical review of NTUH's dosing information. Other products remain
external links without inferred Pocket monograph associations. The generator
binds each reviewed association to the complete product identity and a hash of
its Pocket monograph's identity, dosing and contents; changes require review.

## Content boundary

The index contains product/generic/Chinese names, classes, controlled-drug
schedule and the code needed for the public URL. It excludes NTUH's dose tables,
package inserts and clinical text. It also removes local administrative notes
and products marked discontinued, compassionate-use only or not dispensed in
either language. Full source HTML and private catalog/audit files are not
committed. Linking does not transfer NTUH's copyright or imply endorsement.

Hospital affiliation alone does not make a source private. Future hospital
code/content can be proposed with a discoverable, reliable public original,
an anonymous access check and compatible reuse rights. Material whose original
source is only reachable through an intranet remains private.
