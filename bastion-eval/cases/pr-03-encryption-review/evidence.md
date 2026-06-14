# Data Protection Architecture Review: Encryption at Rest and in Transit
**Document ID:** ARCH-2026-011
**Prepared by:** Tomas Lindgren, Senior Infrastructure Security Engineer
**Reviewed with:** Daniel Reyes, CISO
**Date:** 2026-04-22
**Classification:** Confidential
**Organization:** Meridian Health Systems

## 1. Background and Scope
This annual review documents the encryption posture of Meridian Health Systems platforms that store or transmit ePHI: the MedChart One EHR, the LabTrak laboratory information system, the clinical integration layer, the MyMeridian patient portal, and the backup infrastructure. Findings were validated against live configuration exports pulled between April 6 and April 17, 2026.

### 1.1 Methodology
- Configuration exports: Azure SQL TDE status, Key Vault key inventory, F5 SSL profile dump, Rhapsody route export, Commvault storage policy report
- Active validation: protocol and cipher scans against all external VIPs and a sampled set of internal interface endpoints
- Vendor confirmations were obtained in writing where capability questions arose (LabTrak, Rhapsody)

## 2. Encryption at Rest

### 2.1 MedChart One (primary EHR)
MedChart One runs on Azure SQL with Transparent Data Encryption (TDE) using AES-256. Customer-managed keys are held in Azure Key Vault Managed HSM (FIPS 140-3 Level 3). Keys were last rotated in January 2026 on the annual schedule, and Key Vault access is limited to three named engineers through Privileged Identity Management with just-in-time elevation. This configuration is well architected and fully documented.

### 2.2 LabTrak (laboratory information system)
> FINDING: LabTrak runs on SQL Server 2014 (extended support ended July 2024) at the Riverton General data center. The database is not encrypted at rest: TDE is not enabled, and the underlying SAN volume (Dell Unity LUN 47) has no volume-level encryption. The database holds approximately 1.9 million patient records spanning eleven years of laboratory results. The LabTrak vendor confirmed in writing (ticket LT-88412, March 2026) that TDE is supported on our license tier; it has simply never been enabled.

### 2.3 Clinical document scans
Scanned clinical documents reside on a Windows Server 2022 file cluster with BitLocker (XTS-AES-256) on all volumes. No issues noted.

### 2.4 Endpoints and removable media
All laptops enforce BitLocker through the Intune compliance policy; non-compliant devices are blocked from Okta-federated applications by conditional access. USB mass storage is blocked organization-wide, with an exception list of hardware-encrypted drives issued to the radiology imaging team. No issues noted.

## 3. Encryption in Transit

### 3.1 External endpoints
The F5 BIG-IP pair terminates TLS for the MyMeridian patient portal and its APIs. Production virtual servers enforce TLS 1.2 and 1.3 with a modern cipher suite, and HSTS is enabled on the portal.

> FINDING: One legacy virtual server, appointment-reminders-api (VIP 10.20.8.41), still accepts TLS 1.0 and 3DES cipher suites to support an IVR telephony integration deployed in 2019. The IVR vendor contract runs through 2027 and no remediation date has been set for retiring the legacy protocol support.

### 3.2 Internal clinical interfaces
> FINDING: HL7 v2 messages exchanged between LabTrak, MedChart One, and the Rhapsody interface engine are transmitted as MLLP over TCP port 6661 in cleartext across the hospital LAN. These messages carry patient names, dates of birth, medical record numbers, ordering providers, and result values. None of the 41 production HL7 interfaces use TLS, although Rhapsody supports MLLP over TLS and the capability is included in our current license.

### 3.3 Site-to-site links
Inter-facility traffic between the three hospitals traverses an MPLS backbone with IPsec overlay tunnels (AES-256-GCM). Configuration matches the documented standard.

### 3.4 Email containing PHI
Outbound email is routed through the MeridianSecure encrypted messaging gateway when DLP rules detect PHI; opportunistic TLS is enforced for all other mail flow. No issues noted.

## 4. Backups
Nightly Commvault backups cover all clinical databases and file shares. Backup data is encrypted with AES-256 both in flight and at rest, and a secondary copy replicates to Azure immutable blob storage with a 14-day immutability lock. Encryption keys for the backup environment are escrowed in the same Managed HSM noted in 2.1.

> FINDING: No test restoration of the LabTrak database has been performed in the last 18 months. The most recent documented restore test for any clinical system was MedChart One in October 2024. Backup job success rates are monitored daily, but restore capability is asserted, not demonstrated.

## 5. Recommendations
| # | Item | Priority |
|---|------|----------|
| 1 | Enable TDE on the LabTrak database and encrypt SAN LUN 47 | High |
| 2 | Migrate all 41 HL7 interfaces to MLLP over TLS in Rhapsody | High |
| 3 | Retire TLS 1.0 and 3DES on appointment-reminders-api or isolate the IVR path | Medium |
| 4 | Establish a semiannual restore test calendar covering every clinical system | Medium |

## 6. Sign-off
Prepared by T. Lindgren, 2026-04-22. Review meeting with D. Reyes (CISO) held 2026-04-24; recommendations 1 and 2 accepted for FY27 budgeting, recommendations 3 and 4 pending owner assignment.
