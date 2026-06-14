# Post-Incident Technical Review: INC-2026-0142
**Document ID:** SEC-PIR-2026-0142
**Author:** Tom Okafor, Senior Security Engineer, Meridian Health Systems
**Date:** 2026-04-06
**Status:** Final
**Distribution:** Security Operations, CISO (D. Whitfield)
**Subject:** Credential compromise of Epic remote-access jump server MER-JMP-02 following phishing campaign

## 1. Summary
On Sunday 2026-03-15 at 23:40 EDT, CrowdStrike Falcon raised a high-confidence detection on jump server MER-JMP-02 after an attacker authenticated with credentials harvested from a clinic scheduling coordinator via a phishing email sent earlier that week. The alert was first reviewed by an analyst on Monday 2026-03-16 at 07:52. The host was network-contained at 08:10, **18 minutes after first human review**, and the compromised account was disabled with all Active Directory sessions revoked by 08:45. Eradication was confirmed by a full Falcon estate scan and a credential audit completed 2026-03-20; no persistence mechanisms were found on any other host.

## 2. Review Scope and Method
This review was commissioned by the CISO on 2026-04-01, twelve days after incident closure, to assess the quality of the technical response and the state of forensic readiness it revealed. Sources: the ServiceNow incident and change records, Falcon console history, retained Splunk events, the Exchange message trace, and interviews with the three responding analysts. Findings are limited to what those sources can support.

## 3. Reconstructed Timeline
| Time (EDT) | Event | Source |
|------------|-------|--------|
| 2026-03-11 09:14 | Phishing email delivered to 41 mailboxes | Exchange message trace |
| 2026-03-11 09:31 | Scheduling coordinator submits credentials to lookalike portal | User interview |
| 2026-03-15 23:38 | Attacker authenticates to MER-JMP-02 via GlobalProtect VPN | Falcon telemetry |
| 2026-03-15 23:40 | Falcon detection: credential-based lateral movement tooling | Splunk |
| 2026-03-16 07:52 | Analyst opens alert (first human review) | ServiceNow |
| 2026-03-16 08:10 | MER-JMP-02 network-contained via Falcon | Falcon console |
| 2026-03-16 08:45 | Account disabled, AD sessions and tokens revoked | ServiceNow |
| 2026-03-17 14:00 | MER-JMP-02 reimaged by Infrastructure | ServiceNow change record |
| 2026-03-20 16:30 | Estate-wide eradication scan clean | Falcon console |

## 4. Containment and Eradication
Containment performed well once the incident was in front of an analyst. Falcon network containment isolated the host in minutes, the playbook steps for credential compromise were followed in order, and eradication was verified rather than assumed: the closing ticket includes the clean estate scan and the credential audit results. This sequence is a repeatable strength.

## 5. Evidence Handling
> OBSERVATION: **MER-JMP-02 was reimaged by the Infrastructure team on 2026-03-17 before any forensic disk image or memory capture was taken. The original disk contents are unrecoverable.** The reimage was requested through a routine ServiceNow ticket that made no reference to evidence preservation, and no forensic hold procedure exists that would have stopped it.

The only artifact preserved from the response is an export of the phishing mailbox. **The export was saved as a PST file and circulated by email among three analysts; no chain of custody record exists for this artifact**, and the three retained copies differ in file size, so the canonical version cannot be established.

> OBSERVATION: **No investigation log was kept during the response.** The analyst actions in Section 2 were reconstructed from memory and from scattered Teams messages roughly three weeks after the fact. Several timestamps could not be corroborated by any system record.

## 6. Scope and Magnitude Assessment
MER-JMP-02 brokers remote access into the Epic electronic health record platform for approximately 240 clinical users.

> OBSERVATION: **The incident was closed without any estimate of what the attacker accessed during the roughly eight-hour dwell window.** No one determined whether the attacker reached Epic or viewed ePHI. **Epic access audit logs for the dwell window were never pulled**, and the question "were patient records exposed?" remains unanswered in the closing ticket. Without that answer, the reportability analysis performed by the response team had no factual basis.

Separately, the GlobalProtect VPN appliance logs that would show the attacker's source address and full session activity **rotate at 14 days and had already been overwritten** by the time this review began on 2026-04-01.

## 7. Root Cause
The closing ticket records the root cause as "user clicked phishing link." **This review found no analysis of how the attacker satisfied multi-factor authentication on the jump server.** Candidate explanations (MFA fatigue prompting, a legacy authentication path on the VPN gateway, or session token theft) were not investigated, and the phishing kit was never examined. The recorded root cause describes the initial lure, not the control failure that allowed interactive access.

## 8. Retained Detection Record (Splunk, abridged)
```
2026-03-15T23:40:12Z host=MER-JMP-02 sensor=falcon severity=high
  technique="T1021.001 Remote Services: RDP" user=MERIDIAN\\kdaly
  detail="credential-based lateral movement tooling staged in C:\\Users\\Public"
2026-03-16T08:10:03Z host=MER-JMP-02 action=network_contain operator=avasquez result=success
```

## 9. Engineer Recommendations (draft, not yet accepted)
1. Add a forensic hold step to the reimage change template; no compromised host is rebuilt before imaging.
2. Adopt an investigation logging template and a chain of custody form for all SEV1/SEV2 incidents.
3. Make pulling Epic access audit logs a mandatory scoping step for any incident touching clinical access paths.
4. Extend GlobalProtect log retention from 14 days to 180 days.
5. Add an MFA bypass analysis step to the credential compromise playbook.
