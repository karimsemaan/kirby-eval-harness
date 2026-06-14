# Architecture Review Note: PHI Data Stores and Classification Coverage
**Document ID:** ARCH-2026-014
**Author:** Tom Okafor, Enterprise Architect
**Reviewed by:** D. Reyes, CISO
**Date:** 2026-05-28
**Status:** Final
**Classification:** Confidential
**Organization:** Meridian Health Systems

## 1. Background
Meridian Health Systems adopted a four-tier data classification standard in 2024 (Restricted, Confidential, Internal, Public). This review was commissioned to verify where protected health information (PHI) actually resides, whether classification labels are applied in practice, and whether documented data flows match the production environment. Inputs: a Varonis data discovery scan of the Windows file services cluster (completed 2026-05-15), the ServiceNow CMDB export, and the integration engine interface catalog.

## 2. Discovery Scan Results: PHI Outside Sanctioned Stores
The sanctioned homes for PHI at Meridian are the Epic EHR database, the hosted PACS archive, and the Azure data warehouse. The discovery scan found PHI well beyond these.

> FINDING: The Varonis scan identified **PHI in 14 unsanctioned locations**, including nine departmental file shares, an analytics sandbox containing a 2.3 million row patient extract from 2023, and a **legacy FTP server (MERFTP01) still receiving nightly lab result files in cleartext**. **Meridian maintains no data inventory recording the location, owner, or retention period for any of these stores.** Nobody contacted during this review could say who owns the analytics sandbox extract or why it still exists.

Scan excerpt (top 5 of 14 by record volume):

| Location | Records w/ PHI patterns | Classification label | Documented owner |
|----------|------------------------|----------------------|------------------|
| \\merfs02\analytics\sandbox | 2,310,442 | none | none |
| MERFTP01 /inbound/lab | 488,019 | none | none |
| \\merfs01\revcycle\appeals | 156,773 | none | none |
| \\merfs02\cardiology\echo_reports | 94,310 | none | none |
| \\merfs01\hr\occupational_health | 41,266 | none | none |

## 3. Classification Label and Criticality Coverage
The 2024 standard requires every data store to carry a classification label and every CMDB asset to carry a criticality rating, which drives disaster recovery tiering and patching priority.

> FINDING: Of the 312 data stores identified across the file cluster and database estate, **only 38 (12 percent) carry any classification label**. In the CMDB, **the criticality field is blank for 71 percent of server records**, so DR tier assignments are being made by the infrastructure team on a best-guess basis rather than from classification or business impact. The standard exists; it has simply not been applied.

## 4. Data Flow Documentation
Clinical data flows are documented per interface in the Rhapsody integration engine catalog.

> OBSERVATION: The catalog's data flow diagrams were **last updated in October 2023**. Since then, **three new HL7 interfaces have gone into production with no flow documentation**: lab outreach results to two reference labs, submissions to the state immunization registry, and a real-time payer eligibility feed. None of the three appear in the network data flow diagrams used for firewall reviews.

## 5. Items Operating as Intended
Two areas examined during this review were in good shape and can serve as the internal template:

1. **Epic EHR production database.** Correctly labeled Restricted, with a named data owner (VP of Health Information Management), a documented ten-year retention schedule, encryption at rest and in transit, and quarterly access certification. This is the standard fully applied.
2. **Discovery tooling coverage.** The Varonis deployment now covers 100 percent of the Windows file services cluster and re-scans weekly, so the unsanctioned-store problem is at least continuously measurable going forward.

## 6. Method Notes
- The Varonis scan matched on SSN, MRN (Meridian medical record number format M-#######), and ICD-10 patterns; match confidence threshold was set to high, so the record counts above are conservative.
- The CMDB export was taken 2026-05-12. "Blank criticality" counts exclude records created in the 30 days prior to export.
- The Rhapsody interface catalog was compared against the production engine's active channel list; the three undocumented interfaces were confirmed live with the integration team on 2026-05-20.
- Databases outside the Windows estate (two legacy Informix instances supporting dietary and bed management) were out of scope for this scan and remain unassessed.

## 7. Recommendations (summary)
1. Stand up a PHI data inventory covering all 14 unsanctioned locations; assign owners and retention decisions for each, starting with the analytics sandbox extract and MERFTP01.
2. Run a labeling campaign to close the 12 percent coverage gap and populate CMDB criticality before the FY27 DR exercise.
3. Document the three undocumented HL7 interfaces and gate future interface go-lives on updated flow diagrams.
4. Decommission or encrypt the MERFTP01 cleartext lab feed as an immediate action.

## 8. Document History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.9 | 2026-05-21 | T. Okafor | Draft for CISO review |
| 1.0 | 2026-05-28 | T. Okafor | Final, incorporated CISO comments |
