# Internal Audit Working Paper: Third-Party Remote Access Review
**Document ID:** WP-TPR-2026-04
**Prepared By:** Marcus Bell, Senior IT Auditor, Internal Audit, Meridian Health Systems
**Reviewed By:** Priya Raman, GRC Analyst
**Fieldwork Dates:** 2026-05-12 to 2026-05-23
**Source Systems:** Cisco AnyConnect VPN concentrator logs, Active Directory, vendor inventory spreadsheet (SharePoint), contract repository
**Classification:** Confidential

## 1. Objective
Assess whether third-party remote access at Meridian Health Systems is inventoried, contractually governed, subjected to due diligence at onboarding, and revoked when vendor relationships end.

## 2. Population
Active Directory contains 31 enabled vendor service and remote access accounts in the VENDOR-EXT organizational unit. VPN concentrator logs for the trailing 90 days show successful logins from 24 of the 31 accounts.

## 3. Vendor Inventory Reconciliation
The official vendor inventory is an Excel spreadsheet on SharePoint maintained by the procurement team. File metadata shows it was last modified on 2023-08-17.

Findings:
- **The 31 active vendor accounts map to only 19 vendors listed in the inventory. Twelve accounts belong to vendors with no inventory record at all.**
- The inventory has no field for criticality, data access level, or ePHI exposure. **No vendor tiering or prioritization by criticality exists in any system reviewed.**
- Three inventory rows describe vendors whose contracts procurement believes ended before 2024, but no one could confirm.

## 4. Account Sample Detail (excerpt)
| Account | Vendor | In inventory | Contract status | Last successful login | MFA |
|---------|--------|--------------|-----------------|-----------------------|-----|
| CBE-SVC01 | CareBridge EHR | Yes | Active through 2028 | 2026-05-22 | Yes |
| CLP-SVC03 | ClaimPoint | Yes | Active through 2027 | 2026-05-21 | Yes |
| RVI-SVC01 | RadiantView Imaging | No | Active (signed 2026-02) | 2026-05-23 | Yes |
| MTS-SVC02 | MedTransScribe | Yes | Terminated 2025-03-31 | 2026-05-28 | Yes |
| NSV-SVC04 | NetServe Managed IT | No | Active through 2026 | 2026-05-19 | Yes |

> OBSERVATION: The MedTransScribe contract was terminated effective 2025-03-31, yet **account MTS-SVC02 remains enabled and recorded a successful VPN login on 2026-05-28, fourteen months after contract end.** No offboarding procedure for departing vendors exists. Neither procurement nor IT could identify who is responsible for requesting access revocation when a contract ends.

## 5. Contract Review
Internal Audit sampled 10 active vendor contracts from the contract repository.

Findings:
- **7 of the 10 sampled contracts contain no cybersecurity clauses of any kind: no breach notification requirement, no right to audit, and no minimum security requirements.**
- The 3 contracts that do contain security language are all CareBridge EHR agreements drafted on CareBridge's paper, not Meridian's.
- Procurement confirmed Meridian has no standard security addendum or contract template for vendors.

## 6. Onboarding Due Diligence
RadiantView Imaging was onboarded in February 2026 and granted VPN access to the radiology VLAN within five business days of contract signature.

Findings:
- **No security assessment, questionnaire, or SOC 2 report was requested before access was provisioned.**
- Procurement confirmed that no vendor has ever been asked for a SOC 2 report or equivalent attestation as part of onboarding.

## 7. Positive Observations
- CareBridge EHR, Meridian's most critical supplier, **participated in the 2025 annual incident response tabletop exercise** alongside Meridian's IT and clinical engineering teams. The exercise report documents joint containment and communication steps for an EHR outage scenario.
- All 31 vendor accounts enforce MFA at the VPN concentrator, and vendor sessions are restricted to defined destination VLANs.

## 8. Disposition
Findings in Sections 3 through 6 are referred to the GRC Office for risk register entry and remediation ownership assignment. Account MTS-SVC02 was disabled on 2026-05-29 during fieldwork at Internal Audit's request. A follow-up review is scheduled for Q4 2026.

## 9. Working Paper History
| Revision | Date | Author | Notes |
|----------|------|--------|-------|
| 0.1 | 2026-05-23 | M. Bell | Fieldwork complete, draft findings |
| 1.0 | 2026-06-01 | M. Bell | Final after GRC review |
