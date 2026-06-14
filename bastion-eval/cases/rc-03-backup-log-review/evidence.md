# Backup and DR Infrastructure Review, Q1 2026
**Document type:** Internal technical review with log excerpts
**Author:** Tom Castellanos, Senior Backup Administrator
**Reviewed by:** Priya Raman, Director of IT Operations
**Date:** 2026-03-24
**Company:** Meridian Health Systems
**Classification:** Internal

## 1. Environment Overview
Meridian protects 412 production workloads across DC-1 (Columbus), DC-2 (Indianapolis, DR site), and Azure. On-prem backups run on Veeam Backup & Replication 12 with an immutable hardened repository as the offsite copy. Azure VMs use Azure Backup vaults. Replication of Tier 0 and Tier 1 VMs from DC-1 to DC-2 runs via the DC2-REPL-CORE job set.

### 1.1 Review Method
This review covers the period 2025-12-01 through 2026-03-20. Source data: Veeam job history exports, the DC2 replication dashboard, the Azure Backup vault report, and the POL-BC-007 recovery objectives table. Log excerpts below are copied verbatim from the Veeam console with hostnames unchanged.

## 2. Backup Job Health (Q1 2026)
Backup job success rate for the quarter was 99.2 percent across all 412 protected workloads. Failures are surfaced in a daily automated report delivered to the infra-ops channel each morning at 06:00, and all 11 backup job failures in Q1 were remediated within one business day. All backup data is encrypted with AES-256 and encryption keys are escrowed offline.

## 3. Restore Verification Job Log Excerpt
The monthly RESTORE-VERIFY-EHR job performs an automated test restore of the MedTrak EHR database to an isolated staging host and runs a checksum comparison.

| Run Date | Job | Result | Detail |
|----------|-----|--------|--------|
| 2025-11-09 | RESTORE-VERIFY-EHR | SUCCESS | Checksum match, 4h 12m |
| 2025-12-14 | RESTORE-VERIFY-EHR | FAILED | Insufficient staging storage on VERIFY-HOST-02 |
| 2026-01-11 | RESTORE-VERIFY-EHR | FAILED | Insufficient staging storage on VERIFY-HOST-02 |
| 2026-02-08 | RESTORE-VERIFY-EHR | FAILED | Insufficient staging storage on VERIFY-HOST-02 |
| 2026-03-08 | RESTORE-VERIFY-EHR | FAILED | Insufficient staging storage on VERIFY-HOST-02 |

> OBSERVATION: The restore verification job for the EHR database has failed for four consecutive months with the same storage error. No ticket was opened for any of the four failures. The job result is excluded from the daily automated report because verification jobs were never added to the report scope. As of this review, Meridian has no current evidence that the EHR backups are restorable.

## 4. DR Replication Status
| Job | Last Successful Sync | Status |
|-----|---------------------|--------|
| DC2-REPL-CORE | 2026-01-14 03:11 | PAUSED |
| DC2-REPL-T2 | 2026-03-23 02:47 | HEALTHY |

> OBSERVATION: The DC2-REPL-CORE job set was paused on 2026-01-14 during the core switch migration and was never resumed. As of 2026-03-20, replication of Tier 0 and Tier 1 systems to DC-2 has been paused for nine weeks. The DR site currently holds stale data from January 14. A failover today would lose more than two months of clinical and billing data for these systems.

## 5. RPO Analysis: MedTrak EHR
The documented Tier 0 RPO for the MedTrak EHR database is 4 hours (POL-BC-007 Section 3). The current backup schedule for this database is:

- Full backup: nightly at 01:00
- Transaction log backups: every 24 hours, bundled with the nightly full

> OBSERVATION: Because transaction log backups run only once every 24 hours, the effective recovery point for the EHR database is 24 hours, six times the documented 4 hour RPO target. No configuration change request exists to align the schedule with the policy target.

## 6. Post-Incident Configuration Note (Westgate Recovery)
Following the February 2026 Westgate imaging recovery, the three restored imaging servers were returned to service from backup images taken before the incident.

> NOTE: No updated operational baseline was established for the restored servers after recovery. The local administrator account that the attacker used for lateral movement remains enabled on all three restored imaging servers, with the same password it had before the incident. Hardening recommendations from the containment phase were not applied to the restored images.

## 7. Recommendations (Draft)
1. Expand VERIFY-HOST-02 staging storage and add verification jobs to the daily report scope.
2. Resume DC2-REPL-CORE immediately and add replication lag alerting at 24 hours.
3. Raise transaction log backup frequency for the EHR database to every 4 hours or revise the RPO with CIO approval.
4. Rebuild or harden the restored Westgate imaging servers to a post-incident baseline; disable the abused local administrator account.

## 8. Distribution
infra-ops leads, Director of IT Operations, CISO office. Not yet presented to the CIO.
