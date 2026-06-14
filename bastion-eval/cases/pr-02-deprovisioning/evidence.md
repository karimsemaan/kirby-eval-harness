# Interview Transcript: Identity Operations and Offboarding
**Interviewee:** Priya Nair, Identity Operations Manager, Meridian Health Systems
**Interviewer:** Karim Consultant, Bastion Security
**Date:** May 28, 2026
**Duration:** 45 minutes
**Location:** Virtual (Microsoft Teams)

---

**Karim:** Priya, thanks for the time. Can you walk me through what happens when an employee leaves Meridian?

**Priya:** For regular employees the process is honestly the part I am proudest of. HR records the termination in Workday, and our SCIM integration suspends the Okta account within 15 minutes. That cuts SSO to every federated application immediately, and a follow-on Okta workflow disables the Active Directory account within the hour. We run a synthetic termination through the pipeline on the first Friday of every month to prove it still works, and it has not missed once in the past year.

**Karim:** Before we get to leavers, what about transfers? Someone moves from one department to another.

**Priya:** Role changes flow through the same Workday integration. Birthright groups are recalculated automatically when the job code changes. Manually assigned application roles persist until the next quarterly Okta access certification, where the new manager either reapproves or revokes them. It is not instant, but it is bounded and documented.

**Karim:** And dormant accounts?

**Priya:** Any Okta account with 60 days of no activity is suspended automatically by a workflow, with a notification to the manager. That has been running since 2024.

**Karim:** That is a strong setup. Does the same flow cover everyone who works here?

**Priya:** No, and that is our blind spot. Travel nurses and agency staff are not in Workday. The staffing office tracks them in a spreadsheet, and offboarding depends on the unit manager emailing the service desk when an assignment ends. Nobody owns the follow-up. In our April access audit we found 23 contractor accounts still active past their assignment end dates. The oldest had been enabled for seven months after the contract ended, and it still had VPN entitlement.

**Karim:** Were any of those accounts used after the end dates?

**Priya:** Two showed logons within a week after the end date, which the managers told us was wrap-up work. The rest were dormant. But dormant or not, they were live credentials for people who no longer work here.

**Karim:** Let me ask about privileged accounts. Are admin accounts in the same automated flow?

**Priya:** They are not, and that one stung this spring. Admin accounts are created manually, outside the SCIM flow, so they do not get suspended automatically. A database administrator was terminated on January 16. His standard account was disabled within the hour, exactly as designed. His separate named admin account was missed. The April audit found it still enabled and still a member of Domain Admins, with a last logon on February 9, three weeks after his termination date. The logon traced back to a maintenance script he had set up before he left, but the account was fully usable for those three weeks. We disabled it the same day and added admin accounts to the audit checklist.

**Karim:** Is there a recurring review that would have caught it sooner?

**Priya:** For the federated apps, yes. Okta access certifications run quarterly and managers actually complete them, our completion rate was 96 percent last quarter. But we have never run a formal recertification of Active Directory privileged group membership. Domain Admins, Server Operators, and the MedChart superuser roles have never been through a documented review. The April audit was a one-off that the CISO requested after the DBA incident.

**Karim:** What about physical access? Badges, server rooms?

**Priya:** Badge deactivation is a weekly batch. Physical Security runs the termination list against the badge system every Friday afternoon. So someone terminated on a Monday keeps a working badge for up to four days. The badge system and our identity systems are not integrated, and there is no project on the roadmap to connect them.

**Karim:** Does the badge cover sensitive areas?

**Priya:** Standard staff badges open clinical floors and the loading dock. Server room access is a separate badge group with about 30 people in it, and that list is updated by the same weekly batch.

**Karim:** One more area: emergency access. Do you maintain break-glass accounts?

**Priya:** Five break-glass accounts, sealed credential envelopes in the pharmacy-grade safe in the data center. The seals are checked quarterly, every use pages the on-call security engineer automatically, and the passwords are rotated after any use. We used one during the Okta maintenance window in February and the process worked as written.

**Karim:** Anything else on the leaver process you want on the record?

**Priya:** Just that we know where the gaps are. The employee flow is genuinely solid and tested. Contractors, admin accounts, and badges are the three places where a leaver can keep access longer than anyone intends.

**Karim:** Thank you, Priya. This was very clear.

---

**Interviewer Notes:**
- Workday to Okta SCIM deprovisioning for employees is automated, fast (15 minutes to SSO cutoff), and tested monthly. Genuine strength.
- Contractor and agency staff offboarding is manual and unowned: 23 accounts found active past assignment end dates, oldest seven months, one with VPN entitlement.
- Privileged accounts sit outside the automated flow. Terminated DBA retained an enabled Domain Admins account for three weeks after termination.
- No recurring recertification of AD privileged group membership has ever been performed.
- Badge deactivation runs as a weekly batch, leaving up to four days of physical access after termination, including server room access for that badge group.
