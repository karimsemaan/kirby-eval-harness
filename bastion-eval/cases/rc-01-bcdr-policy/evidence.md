# Business Continuity and Disaster Recovery Policy
**Document ID:** POL-BC-007
**Version:** 3.1
**Last Reviewed:** 2025-11-04
**Owner:** Infrastructure and Resilience Team
**Company:** Meridian Health Systems
**Classification:** Internal

## 1. Purpose
This policy establishes recovery requirements for Meridian Health Systems' clinical and business information systems so that patient care can continue during and after a disruptive event.

## 2. Scope
This policy covers all production systems hosted in the primary datacenter (DC-1, Columbus, OH), the disaster recovery site (DC-2, Indianapolis, IN), and Azure-hosted workloads. It applies to both Meridian hospitals and all 14 outpatient clinics.

## 3. Recovery Objectives

| Tier | Example Systems | RTO | RPO |
|------|----------------|-----|-----|
| 0 | MedTrak EHR, pharmacy dispensing | 4 hours | 4 hours |
| 1 | PACS imaging, lab interface engine | 24 hours | 24 hours |
| 2 | Intranet, reporting warehouse | 72 hours | 24 hours |

Recovery tiers were defined in a 2023 workshop with clinical and revenue-cycle leadership. Each tier lists upstream and downstream dependencies in Appendix B, and restoration order within a tier is pre-approved by the CIO.

> OBSERVATION: The RTO and RPO values above have never been validated by a full failover exercise. They were set in the 2023 workshop and have been carried forward unchanged in every revision since.

## 4. Backup Requirements
All Tier 0 and Tier 1 systems are backed up nightly using Veeam Backup & Replication. Meridian follows the 3-2-1 rule: three copies, two media types, one offsite. The offsite copy is written to an immutable hardened repository with a 30 day immutability window, and all backup data is encrypted with AES-256. Backup encryption keys are escrowed offline with the Infrastructure and Resilience Team.

## 5. Restoration Testing
Restoration tests must be performed quarterly for all Tier 0 and Tier 1 systems. Test results are recorded in the resilience register and reviewed by the CIO.

> NOTE: Restoration tests performed during 2025 covered only file shares and two application VMs. The MedTrak EHR database has never been included in a restoration test. The resilience register shows the EHR entry as "deferred" in all four quarters of 2025.

## 6. Disaster Recovery Exercises
A full failover exercise to DC-2 must be conducted annually, covering all Tier 0 systems, with clinical downtime procedures activated at one pilot clinic.

> NOTE: The last full failover exercise was completed in October 2023. The 2024 exercise was cancelled due to the MedTrak version 11 upgrade freeze, and the 2025 exercise was never scheduled. No full failover test has been performed in over two years.

## 7. Restoration Procedure
When recovery is initiated by the incident response process, operators follow runbook RB-114:

1. Confirm declaration of recovery with the on-call Incident Commander.
2. Identify the most recent successful backup in the Veeam console.
3. Restore to the designated recovery host and reattach networking.
4. Hand off to the application team for service start.

The procedure directs operators to restore from the most recent successful backup. The policy does not require integrity verification or malware scanning of backup media before restoration. Backups are assumed clean.

## 8. Communication During Recovery
The Incident Commander activates the recovery call tree in Appendix A. Executive leadership receives status updates at declaration, at each tier milestone, and at recovery completion. Clinic managers are notified through the operational bridge line.

> NOTE: The recovery call tree in Appendix A was last updated in June 2023. Two of the five named recovery coordinators are no longer employed at Meridian, including the listed incident communications lead.

## 9. Plan Maintenance
This policy and its appendices must be reviewed annually by the Infrastructure and Resilience Team and approved by the CIO. The version 3.1 review on 2025-11-04 was a wording-only update; Appendices A and B were not revised during that review.

## 10. Compliance
Failure to perform required testing or to maintain recovery documentation must be reported to the CIO and recorded as a risk register entry.

## 11. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2021-08-02 | D. Okafor | Initial release |
| 2.0 | 2023-05-19 | P. Raman | Added tier model, immutable repository requirement |
| 3.0 | 2024-10-30 | P. Raman | Added Azure workloads to scope |
| 3.1 | 2025-11-04 | T. Castellanos | Annual review, wording updates only |
