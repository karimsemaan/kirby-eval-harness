# Asset Management Policy
**Document ID:** POL-AM-001
**Version:** 1.3
**Last Reviewed:** 2026-01-22
**Owner:** IT Infrastructure and Security
**Classification:** Internal
**Organization:** Meridian Health Systems

## 1. Purpose
This policy establishes requirements for identifying, recording, and managing technology assets across Meridian Health Systems, a regional healthcare provider operating four hospitals and 22 outpatient clinics in central Ohio.

## 2. Scope
This policy applies to all hardware, software, cloud services, and data-bearing devices owned or operated by Meridian Health Systems, including clinical and biomedical equipment connected to the Meridian network.

## 3. Hardware Asset Inventory

### 3.1 Inventory of Record
The ServiceNow CMDB is the authoritative inventory of record. All servers, workstations, and network devices must be recorded in the CMDB within 5 business days of deployment. A full physical-to-CMDB reconciliation must be performed annually by the IT Asset Management team.

> OBSERVATION: The last full CMDB reconciliation was completed in **November 2024, 19 months before this review**. A spot audit in May 2026 sampled 250 devices across the Lakeview and Eastgate campuses and **could not match 41 of the 250 devices to any CMDB record**.

### 3.2 Biomedical and IoT Devices
Networked biomedical equipment (infusion pumps, imaging systems, patient monitors, telemetry units) is managed by the Clinical Engineering department using a standalone spreadsheet maintained separately from the CMDB.

> NOTE: Clinical Engineering estimates that **roughly 30 percent of networked biomedical devices, approximately 1,100 infusion pumps and patient monitors, are not recorded in any inventory**. These devices are connected to the clinical VLANs but are untracked, and IT Security has no visibility into their firmware versions or network locations.

## 4. Software and Cloud Service Inventory
Application owners are responsible for keeping records of software installed within their departments.

> OBSERVATION: **Meridian maintains no centralized software or SaaS inventory.** A network egress review in April 2026 identified 63 SaaS applications in active use across the organization; only 18 of these were known to the IT department. Department-purchased shadow IT subscriptions, including two applications used by Patient Billing to process account data, are not tracked, reviewed, or licensed centrally.

## 5. Network Documentation
Network architecture diagrams, including authorized data flows between the clinical, corporate, and guest network zones, are maintained in Confluence and updated quarterly by the Network Engineering team. Diagrams are version controlled, peer reviewed at each revision, and the most recent revision is dated 2026-04-30. Firewall rule changes require an updated flow diagram before approval.

## 6. Asset Lifecycle and Disposal

### 6.1 Acquisition
All technology purchases follow the standard Procurement intake process. Network-connected purchases require an IT Security review prior to purchase order issuance.

### 6.2 Decommissioning and Disposal
Retired data-bearing assets must be sanitized in accordance with NIST SP 800-88 before leaving Meridian custody. A certificate of destruction must be retained for seven years for any asset that stored patient information.

> NOTE: A storage room audit at the Lakeview campus in May 2026 found **23 decommissioned servers and approximately 60 loose hard drives awaiting disposal with no sanitization records**. No certificates of destruction could be located for any asset retired since January 2024. Several of the servers previously hosted the legacy laboratory information system.

## 7. Supplier-Provided Services

> OBSERVATION: **No inventory of supplier-provided services is maintained.** Managed services in active use, including offsite radiology reads, dictation and transcription, the claims clearinghouse, and the hosted PACS archive, are known only to the individual departments that contracted them. IT Security was unable to produce a list of which suppliers receive, store, or process Meridian data.

## 8. Roles and Responsibilities
- **IT Asset Management:** owns the CMDB and the annual reconciliation.
- **Clinical Engineering:** owns biomedical device records.
- **Department Heads:** accountable for software used within their departments.
- **IT Security:** consumes inventory data for vulnerability and risk management.

## 9. Compliance
Violations of this policy may result in disciplinary action. Exceptions require written approval from the Director of IT Infrastructure.

## 10. Document History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2022-08-10 | R. Calloway | Initial release |
| 1.2 | 2024-05-02 | R. Calloway | Added biomedical device section |
| 1.3 | 2026-01-22 | D. Reyes | Annual review, added disposal requirements |
