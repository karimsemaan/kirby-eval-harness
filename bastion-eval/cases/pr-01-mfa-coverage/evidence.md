# Multi-Factor Authentication and Password Standard
**Document ID:** POL-IAM-004
**Version:** 3.1
**Effective Date:** 2025-11-04
**Owner:** Identity and Access Management Team, Office of the CISO
**Classification:** Internal
**Organization:** Meridian Health Systems

## 1. Purpose
This standard defines authentication requirements for all Meridian Health Systems information systems, including systems that store or process electronic protected health information (ePHI). It supports POL-SEC-001 (Information Security Policy) and the HIPAA Security Rule safeguards for access control.

## 2. Scope
This standard applies to all employees, employed and contracted clinicians, residents, students, volunteers, and third parties who authenticate to Meridian Health Systems information systems at Riverton General Hospital, Lakeshore Community Hospital, Maple Grove Medical Center, and all 18 outpatient clinics.

## 3. Password Requirements
- Minimum length: 14 characters; passphrases are encouraged
- All new and reset passwords are screened against known-breached password lists in Okta
- No forced periodic rotation for accounts enrolled in MFA, consistent with NIST SP 800-63B
- Account lockout after 6 failed attempts, with a 15 minute lockout window
- Default and vendor-supplied passwords must be changed before a system enters production

## 4. Multi-Factor Authentication

### 4.1 Required Coverage
MFA is required for:
- Remote access (GlobalProtect VPN and the clinician remote portal)
- All Okta-federated cloud applications (Microsoft 365, Workday, ServiceNow)
- MedChart One, the primary EHR platform
- All administrative consoles (Azure, vSphere, network devices)

### 4.2 Approved Factors
- Okta Verify push with number matching (default factor)
- FIDO2 hardware security keys: mandatory for all 22 members of IT Infrastructure and IT Security, including every domain administrator and database administrator
- SMS one-time passcode (fallback only)

> NOTE: SMS one-time passcodes were approved in 2023 as a temporary fallback factor for clinicians without smartphones. As of November 2025, 612 active users still authenticate with SMS as their primary factor, and no sunset date has been set for the SMS factor.

### 4.3 Enrollment and Factor Recovery
- MFA enrollment occurs at new-hire orientation; the service desk verifies a government-issued photo ID before activating the first factor
- Factor resets require the service desk to verify identity by callback to the manager of record in Workday
- Lost FIDO2 keys are deactivated immediately upon report and replaced within one business day

### 4.4 Exceptions
Exceptions to this standard require CISO approval and must be recorded in the IAM exception register with an expiry date and compensating controls.

> NOTE: MedChart Classic, the legacy EHR module still in production at Lakeshore Community Hospital and Maple Grove Medical Center, does not support modern authentication protocols. Under exception EX-2021-014 it is exempt from MFA and is reachable from the internet through the clinician remote portal with username and password only. The exception register has not been reviewed since EX-2021-014 was granted in October 2021, and the exception has no expiry date.

## 5. Shared and Generic Accounts
Shared and generic accounts are prohibited except where a documented clinical workflow requirement exists and compensating controls have been approved by the CISO.

> OBSERVATION: 38 shared generic accounts (for example NURSE-STATION-3W and ED-TRIAGE-01) remain in active use on clinical workstations across all three hospitals. The passwords for these accounts have not been changed since 2022, several of the accounts grant access to the Pyxis medication dispensing interface, and actions taken under these accounts cannot be attributed to an individual user.

## 6. Privileged Authentication
Privileged accounts must be separate from standard user accounts. Privileged access to servers and network devices is brokered through the CyberArk PAM jump host, which enforces FIDO2 authentication and records all privileged sessions.

## 7. Clinical Workstation Sessions
- Clinical workstations in patient care areas use Imprivata tap-badge single sign-on layered on individual user accounts
- Inactivity lock: 90 seconds in patient care areas, 15 minutes in administrative offices
- Walk-away detection re-locks a session when the badge leaves proximity

## 8. Enforcement
Violations of this standard may result in disciplinary action under HR-019. Any system operating without a current, CISO-approved exception is treated as a violation and must be remediated or formally excepted within 30 days of discovery.

## 9. Document History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 2.0 | 2023-05-02 | R. Okafor | Added approved factor list and SMS fallback |
| 3.0 | 2024-09-17 | R. Okafor | Added breached-password screening, removed periodic rotation |
| 3.1 | 2025-11-04 | D. Reyes (CISO) | Annual review, no material changes |
