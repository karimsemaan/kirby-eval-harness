# Interview Transcript: SOC Operations Review
**Interviewee:** Priya Raman, SOC Manager, Meridian Health Systems
**Interviewer:** Karim Consultant, Bastion Security
**Date:** April 14, 2026
**Duration:** 45 minutes
**Location:** Virtual (Microsoft Teams)

---

**Karim:** Priya, thanks for the time. Walk me through what the SOC looks like today at Meridian Health Systems.

**Priya:** Sure. We are a team of six: four analysts, one detection engineer, and me. We cover four hospital campuses and 23 clinics, about 9,200 employees. Our shift runs 0700 to 1900 Eastern, Monday through Friday.

**Karim:** What happens to alerts outside those hours?

**Priya:** Honestly, nothing happens in real time. **Nights and weekends, SIEM alerts route to a shared mailbox that nobody monitors. We check it Monday morning.** We asked for an MDR contract to cover after-hours last year, but it did not make the budget. If ransomware detonates at 2 a.m. on a Saturday, the first human to see the alert is whoever opens that mailbox on Monday.

**Karim:** Tell me about alert volume and triage.

**Priya:** Splunk generates around 3,800 notable events a day before tuning. Automated dedup closes maybe 60 percent. The rest, the analysts triage. We do have a documented triage runbook for phishing and malware alerts with a 30-minute acknowledgment SLA during shift hours, and we consistently meet it. That part works.

**Karim:** How do you track cases once an analyst picks an alert up?

**Priya:** Everything goes into ServiceNow with a security-incident record type. Handoffs between analysts are documented in the ticket, and I review aging tickets every Friday. It is not fancy, but the audit trail is solid.

**Karim:** Which sources feed those notable events today?

**Priya:** Firewalls, VPN, the Windows domain, and CrowdStrike. Those four feeds carry essentially all of our detection content. Anything outside them, we are blind at the SIEM layer and we know it.

**Karim:** Any tuning issues you are aware of?

**Priya:** One that bothers me. In November 2025 an analyst was drowning in false positives from our Windows lateral movement correlation searches, so he created a suppression rule. **The suppression rule silenced the entire lateral movement detection category, not just the noisy hosts, and it has been active for five months.** I found it during a spot check in March. It is still in place because nobody has had time to rebuild the underlying searches.

**Karim:** So lateral movement inside the Windows domain is effectively undetected right now?

**Priya:** At the SIEM layer, yes. Our EDR would still catch some of it at the endpoint. That is the one place I sleep okay. **CrowdStrike Falcon is deployed on 98 percent of workstations and servers, and the automatic containment policy has stopped two ransomware precursors this year** before they spread.

**Karim:** When does an alert become an incident? What are your criteria?

**Priya:** That is the awkward one. **We have no documented criteria for declaring an incident. It depends who is on shift; the senior analysts escalate by gut feel.** Last quarter one analyst worked a credential-stuffing case as a routine ticket for nine days before anyone called it an incident. A different analyst would have declared it on day one.

**Karim:** Do you consume threat intelligence?

**Priya:** Not in any structured way. **No threat intelligence feeds are integrated into the SIEM.** The analysts read vendor blogs and CISA advisories when they have time, and indicator checks are manual copy-paste.

**Karim:** What about proactive work, threat hunting?

**Priya:** **There is no threat hunting program. We are purely reactive.** The detection engineer had a hypothesis-driven hunt planned for Q1, but he got pulled into the CareBridge EHR upgrade project and it never happened.

**Karim:** If you had one investment approved tomorrow, what would it be?

**Priya:** After-hours coverage. Everything else we can claw back with tuning time. The coverage gap is the one we cannot.

**Karim:** Thank you, Priya. This was very direct, which helps.

---

**Interviewer Notes:**
- SOC manager is candid and operationally sharp. The phishing and malware triage runbook with a measured 30-minute SLA is a genuine strength.
- Lateral movement detections suppressed wholesale since November 2025; confirm the rule scope in Splunk during technical validation.
- No after-hours monitoring of any kind; alerts queue in an unmonitored shared mailbox until Monday.
- No incident declaration criteria; escalation is inconsistent between analysts.
- No threat intelligence integration; no threat hunting program.
- EDR coverage at 98 percent with automatic containment is the strongest detect-layer control observed.
