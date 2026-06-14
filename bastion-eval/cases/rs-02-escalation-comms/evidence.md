# Interview Transcript: Incident Escalation and Communications Review
**Interviewee:** Marcus Vega, Security Operations Manager, Meridian Health Systems
**Interviewer:** Karim Consultant, Bastion Security
**Date:** May 28, 2026
**Duration:** 45 minutes
**Location:** Virtual (Microsoft Teams)

---

**Karim:** Marcus, thanks for making the time. Let's focus on what happens once an incident is detected at Meridian. Walk me through triage.

**Marcus:** Sure. Every alert, whether it comes from Splunk, CrowdStrike, or a user report, automatically becomes a ServiceNow security incident ticket. During business hours an analyst picks it up, validates it, and assigns a severity from our SEV1 to SEV4 matrix. **We hit our 30 minute triage target on better than 95 percent of tickets during business hours**, and I personally review every SEV1 and SEV2 classification before it sticks.

**Karim:** That sounds disciplined. What happens outside business hours?

**Marcus:** That is where it falls apart, honestly. We do not have an on-call rotation. **After 6 pm and on weekends, alerts route to a shared mailbox that nobody is required to watch.** If a SEV1 fires at 2 am, the first human look is whenever the early analyst signs in around 7:30. We have asked for funding twice for either an on-call stipend or an MDR service, and it has not been approved.

**Karim:** Has that delay actually bitten you?

**Marcus:** Yes. In the March incident, INC-2026-0142, the initial CrowdStrike detection fired at 11:40 pm on a Sunday. **Nobody saw it until Monday morning.** Once we were on it, containment was fast, but the attacker had roughly eight hours of free time before anyone was even aware.

**Karim:** Let's talk escalation. When an analyst decides to wake you, or the CISO, what triggers that?

**Marcus:** The severity matrix gives definitions, but in practice **whether something gets escalated is a judgment call by whoever is on shift.** Two of my analysts escalate everything, one almost never escalates. We have never written criteria like "confirmed lateral movement equals immediate escalation." And the formal escalation roster in the IR policy is stale; it still lists my predecessor as the primary contact. I keep my own current contact list in my phone, which is not a process.

**Karim:** Who notifies regulators if patient data is involved? Healthcare has specific obligations.

**Marcus:** That is a genuinely uncomfortable question. **There is no named owner for breach notification. I assumed Legal handled HIPAA notification; Legal told our GRC analyst they assumed Security did.** Nobody on my team could tell you the HHS reporting clock off the top of their head. We have no notification letter templates drafted and nothing pre-staged for the Office for Civil Rights. In March we debated for two days whether the incident was even reportable, and **we never documented who made the final call or on what basis.**

**Karim:** What about public communications, press, patients?

**Marcus:** Also unowned. **Our communications office first heard about the March incident from a reporter's email, not from us.** There are no preapproved holding statements and no rule about who is authorized to speak publicly during an incident. The comms director improvised a response in about an hour. She did fine, but that was luck, not process.

**Karim:** The IR policy names internal stakeholders for incident coordination: Legal, Communications, Infrastructure. Have those groups ever actually worked an incident together?

**Marcus:** On paper they are all in the plan. In reality, Legal and Communications have never been on an incident bridge, ever. The first time our general counsel was pulled into an active incident was March, and she had never seen the IR policy before that morning. The plan assigns her a role she did not know she had.

**Karim:** What about status reporting upward during an incident? How do executives stay informed?

**Marcus:** Ad hoc. In March I was writing email updates to the CIO whenever I could grab ten minutes, and the CEO's office was forwarding them around. There is no defined update cadence, no status template, and at one point two different versions of the impact summary were circulating among the executive team. Nobody was wrong on purpose; we just had no single channel.

**Karim:** Do you coordinate internally during a live incident? Bridge calls, status cadence?

**Marcus:** For SEV1 we spin up a dedicated Teams channel and a bridge line, and that part works well. During the March incident the technical bridge ran smoothly with Infrastructure and the Epic team on it. The breakdown is everything outside the technical bridge: executives, Legal, communications, regulators.

**Karim:** If you got one investment approved tomorrow, what would it be?

**Marcus:** After-hours coverage, no question. Everything else we can paper over with process. Right now an incident that starts Friday at 8 pm has the entire weekend to run unattended.

**Karim:** Thanks, Marcus. We will reflect all of this in the assessment, including the parts that are working.

**Marcus:** Please do. The triage discipline is real and my analysts earned it. The rest needs to be on paper before the next incident, not after.

---

**Interviewer Notes:**
- Business-hours triage is a genuine strength: automated ticket creation in ServiceNow, 30 minute triage target met over 95 percent of the time, manager validation of high-severity classifications.
- No after-hours escalation path. Alerts sit in an unmonitored shared mailbox overnight and on weekends; an eight-hour detection-to-response blind spot was confirmed in INC-2026-0142.
- Escalation decisions rest on individual analyst judgment; no written escalation criteria; formal roster stale (consistent with the Appendix A observation in POL-IR-001).
- No owner, templates, or process for regulatory breach notification (HIPAA/OCR). The March reportability decision was undocumented.
- No preapproved public messaging or designated spokesperson; communications team learned of the March incident from external press.
- Internal stakeholder coordination beyond the technical bridge is undefined in practice: Legal and Communications have never participated in an incident, and executive status updates in March were ad hoc with conflicting impact summaries in circulation.
