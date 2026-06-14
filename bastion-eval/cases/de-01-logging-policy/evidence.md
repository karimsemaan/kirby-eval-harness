# Security Logging and Monitoring Policy
**Document ID:** POL-LM-007
**Version:** 1.3
**Last Reviewed:** 2025-08-19
**Owner:** Information Security, Meridian Health Systems
**Classification:** Internal

## 1. Purpose
This policy establishes requirements for generating, collecting, retaining, protecting, and reviewing security log records across Meridian Health Systems' hospital, clinic, corporate, and cloud environments.

## 2. Scope
This policy applies to all information systems owned or operated by Meridian Health Systems, including the four hospital campuses, 23 outpatient clinics, the Columbus corporate data center, and the Microsoft Azure tenant.

## 3. Log Generation

### 3.1 Required Sources
The following sources must generate security-relevant log records and forward them to the enterprise SIEM:
- Perimeter and internal firewalls, VPN concentrators
- Windows and Linux servers (authentication, privilege use, object access)
- Endpoint detection and response (CrowdStrike Falcon)
- The CareBridge EHR and all systems storing or processing ePHI
- Azure activity and Entra ID sign-in logs
- Network infrastructure (switches, wireless controllers)

### 3.2 Clinical Systems
The CareBridge EHR must generate audit records for all access to electronic protected health information (ePHI), including record views, modifications, exports, and break-the-glass events.

> NOTE: Database-tier audit logging on the CareBridge production cluster **was disabled in October 2025 during a performance incident and has not been re-enabled.** Only application-tier login events are currently captured, and **CareBridge audit records are not forwarded to the SIEM.** Direct database access to ePHI is currently unlogged.

### 3.3 Medical Devices
> OBSERVATION: The biomedical device VLANs, covering approximately 1,100 infusion pumps, telemetry monitors, and imaging workstations, **are excluded from log collection entirely. No medical device log records reach the SIEM**, and the biomedical VLANs carry no network monitoring sensors.

## 4. Centralized Collection
All in-scope sources forward to the enterprise SIEM (Splunk Enterprise) within 5 minutes of event generation. Source onboarding follows the Log Source Onboarding Standard (STD-LM-002), which defines parsing, field normalization, and per-feed health checks. Firewall, VPN, Windows domain, and CrowdStrike sources are fully onboarded and their feeds are verified quarterly by Security Engineering.

## 5. Retention
Security log records must be retained for a minimum of 365 days, with the most recent 90 days searchable online. Records relating to ePHI access must be retained for 6 years per HIPAA documentation requirements.

> OBSERVATION: Splunk hot and warm storage currently holds **30 days of searchable data. The cold archive tier was decommissioned during the FY2025 budget reduction and was never replaced.** Firewall, VPN, and authentication events older than 30 days are unrecoverable. The 365-day and 6-year retention requirements are not being met for any source.

## 6. Log Review
- High-severity SIEM alerts must be reviewed by the SOC within 30 minutes during business hours.
- Authentication and privileged-access logs must be reviewed weekly by a named analyst, with exceptions documented.
- Review findings are recorded in the SOC shift log.

> NOTE: **The weekly authentication and privileged-access log review has not been performed since January 2026**, when the analyst who owned the task left the company. The duty was never reassigned.

## 7. Time Synchronization
All systems must synchronize time to the approved internal NTP hierarchy so that events can be correlated across sources.

> NOTE: A February 2026 correlation exercise found **clock drift of up to 4 minutes between the domain controllers and Azure-hosted workloads**, which sync to vendor defaults rather than the internal NTP hierarchy. Cross-source correlation of fast-moving events is unreliable at this level of drift.

## 8. Protection of Log Records
SIEM indexes are append-only. Search and administrative access is restricted by role to seven named SOC and Security Engineering staff. Index integrity is verified with SHA-256 hashing on ingest, and all administrative actions on the SIEM are themselves logged.

## 9. Exceptions
Exceptions to this policy require a completed risk acceptance form approved by the CISO and expire after a maximum of 12 months.

## 10. Document History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2023-02-10 | R. Delgado | Initial release |
| 1.2 | 2024-07-30 | T. Wexler | Added Azure sources, retention requirements |
| 1.3 | 2025-08-19 | T. Wexler | Added medical device section, review cadence |
