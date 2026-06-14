# Access Control Policy
Document ID: POL-AC-002
Version: 2.0
Last Reviewed: 2024-03-15
Owner: IT Security Team
Classification: Internal

## 1. Purpose
This policy establishes the requirements for managing access to Acme Corporation's information systems and data assets.

## 2. Scope
This policy applies to all employees, contractors, and third-party users who access Acme Corporation information systems.

## 3. User Account Management

### 3.1 Account Provisioning
All user accounts must be requested through the IT Service Desk ticketing system. Requests require manager approval before provisioning. Accounts are created within 3 business days of approved request.

### 3.2 Privileged Accounts
Privileged accounts (domain admin, root, database admin) are provisioned through a separate approval process requiring CISO sign-off. Privileged accounts must use separate credentials from standard user accounts.

### 3.3 Account Deprovisioning
Upon employee termination, all access must be revoked within 24 hours. HR must notify IT Security via the termination checklist. Remote access (VPN, email) is disabled immediately. Application access is removed within 24 hours.

> NOTE: The current offboarding process relies on a manual ticketing system. HR submits a ticket and IT processes it during business hours. Average time to full access revocation is 2-3 business days, not 24 hours as specified.

## 4. Access Reviews

### 4.1 Periodic Reviews
Access reviews should be conducted quarterly for all systems containing sensitive data. Reviews are performed by system owners with IT Security oversight.

> OBSERVATION: As of the most recent audit (Q2 2024), no formal periodic access review has been completed in the last 12 months. System owners report they review access "informally" but no documentation exists.

### 4.2 Privileged Access Reviews
Privileged accounts must be reviewed monthly by the IT Security team.

## 5. Authentication

### 5.1 Password Requirements
- Minimum length: 12 characters
- Complexity: uppercase, lowercase, number, special character
- Password rotation: every 90 days
- Password history: last 12 passwords remembered
- Account lockout: after 5 failed attempts

### 5.2 Multi-Factor Authentication
MFA is required for:
- VPN access
- Email access from external networks
- All administrative consoles
- Cloud application portals (Office 365, AWS, Azure)

MFA implementation uses Microsoft Authenticator app. Hardware FIDO2 security keys are issued to all members of the IT Security team and system administrators.

### 5.3 Service Accounts
Service accounts must have passwords rotated every 180 days. Service accounts must not be used for interactive login. Each service account must have a documented owner.

## 6. Remote Access

Remote access is provided through Cisco AnyConnect VPN with MFA enforcement. Split tunneling is disabled. All remote sessions are logged in the VPN concentrator.

## 7. Third-Party Access

Third-party vendors requiring system access are provisioned through the Vendor Access Request form. Vendor accounts are time-limited (maximum 90 days, renewable). Vendor sessions are not monitored or recorded.

> NOTE: Three vendors currently have persistent VPN access that has not been reviewed or time-limited: CloudOps Inc (since 2022), DataMigrate LLC (since 2023), and SecureAudit Partners (since 2021). Two of these vendors have domain admin equivalent privileges.

## 8. Policy Compliance
Violations of this policy may result in disciplinary action up to and including termination.

## 9. Document History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2022-01-15 | J. Smith | Initial release |
| 1.5 | 2023-06-20 | J. Smith | Added MFA requirements |
| 2.0 | 2024-03-15 | M. Torres | Updated password policy, added remote access section |
