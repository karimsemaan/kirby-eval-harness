# Incident Response Policy
**Document ID:** POL-IR-001
**Version:** 1.2
**Last Reviewed:** 2025-01-10
**Owner:** Security Operations, Meridian Health Systems
**Classification:** Internal

## 1. Purpose
This policy defines how Meridian Health Systems prepares for, detects, responds to, and recovers from cybersecurity incidents affecting clinical and corporate systems, including the Epic electronic health record platform.

## 2. Scope
This policy applies to all Meridian Health Systems facilities (2 hospitals, 14 outpatient clinics), all employees and contractors, and all information systems that store, process, or transmit company or patient data.

## 3. Incident Response Phases
Meridian follows a six-phase lifecycle: Preparation, Detection and Analysis, Containment, Eradication, Recovery, and Post-Incident Review. Each phase has an assigned owner within the Security Operations team.

## 4. Severity Classification
All suspected incidents are classified at triage using the following matrix:

| Level | Definition | Example | Response Target |
|-------|------------|---------|-----------------|
| SEV1 | Confirmed impact to patient care delivery or suspected ePHI exposure | Ransomware on clinical systems | 15 minute acknowledgment, immediate CISO notification |
| SEV2 | Confirmed compromise with no patient care impact | Compromised workstation, contained malware | 1 hour acknowledgment |
| SEV3 | Suspicious activity under investigation | Phishing click, anomalous login | 4 hour acknowledgment |
| SEV4 | Policy violation or low-risk event | Unapproved software installation | Next business day |

Severity is assigned by the on-duty analyst and validated by the Security Operations Manager. The severity definitions were workshopped with clinical leadership in 2024 and include explicit patient-safety criteria, so incidents are categorized and prioritized consistently at intake.

## 5. Roles and Escalation
Incidents are escalated according to the Escalation Roster (Appendix A). SEV1 incidents require immediate notification of the CISO (Dana Whitfield) and the VP of Information Services. The Security Operations Manager acts as incident commander for SEV1 and SEV2 incidents.

> OBSERVATION (assessor, 2026-06): **The Escalation Roster in Appendix A was last updated in November 2023. It still lists Priya Raman as Security Operations Manager and as the primary SEV1 contact; she left Meridian in November 2024.** The listed after-hours number for the Network Engineering lead is no longer in service. **Two of the six escalation contacts on the roster are no longer employed by Meridian.**

## 6. Containment and Eradication
Containment actions for common scenarios (ransomware, compromised credentials, lost clinical device) are documented in playbooks stored in the Security Operations SharePoint. CrowdStrike Falcon network containment is the default isolation mechanism for endpoints. Eradication is confirmed by a full estate scan before an incident may be closed.

## 7. Recovery
Recovery activities are coordinated with the Infrastructure team. **The decision to begin recovery is made "when the incident commander judges it appropriate." No criteria are defined for confirming that containment is complete before restoration begins.**

> NOTE: During the December 2025 malware event on a clinic file server, restoration from backup was started while the affected VLAN was still under active investigation. The incident commander stated afterward that there was "no checklist for when it is safe to rebuild."

## 8. Plan Testing and Exercises
This plan must be exercised through an annual tabletop exercise involving Security Operations, Infrastructure, Legal, and Communications, plus a semiannual technical drill simulating a SEV1 scenario. Exercise results must be documented and tracked to closure.

> OBSERVATION (assessor, 2026-06): **No tabletop exercise or simulation has been conducted since this plan was approved in February 2024.** The required annual tabletops for 2024 and 2025 did not occur and no technical drills have been scheduled. Security Operations confirmed the plan **has never been tested end to end**, and no exercise reports or after-action documents exist.

## 9. External Coordination
**Meridian does not hold an incident response retainer with any external forensics firm.** This policy does not define when or how to engage law enforcement, the cyber insurance carrier, or external counsel during an incident; coordination with third parties is left "to the discretion of the CISO" with no pre-established contacts or activation procedure.

## 10. Post-Incident Review
A post-incident review is required within 10 business days of closing any SEV1 or SEV2 incident. Lessons learned are tracked as ServiceNow problem records assigned to a named owner.

## 11. Policy Compliance
Violations of this policy may result in disciplinary action up to and including termination.

## 12. Document History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-02-12 | P. Raman | Initial release |
| 1.1 | 2024-08-03 | P. Raman | Added severity matrix examples |
| 1.2 | 2025-01-10 | M. Vega | Annual review, updated playbook locations |
