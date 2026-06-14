# Interview Transcript: Post-Incident Recovery Review
**Interviewee:** Priya Raman, Director of IT Operations, Meridian Health Systems
**Interviewer:** Karim Consultant, Bastion Security
**Date:** April 2, 2026
**Duration:** 45 minutes
**Location:** Virtual (Microsoft Teams)
**Subject:** Recovery from the February 17-18, 2026 ransomware incident affecting radiology imaging servers at the Westgate clinic

---

**Karim:** Priya, thanks for walking me through the February incident. Let's focus on the recovery side. How did the recovery start?

**Priya:** Once the incident commander declared containment complete, we initiated recovery from runbook RB-114, our documented ransomware recovery procedure. The recovery team was assembled within 40 minutes, and honestly that part went well. The runbook steps were current and the on-call engineers knew them.

**Karim:** How long did restoration take end to end?

**Priya:** About 11 hours from declaration to the imaging servers being back online. Our Tier 1 RTO for PACS imaging is 24 hours, so we beat the target with room to spare. I credit the runbook and the fact that the Veeam restore points were intact.

**Karim:** Did you verify the backups before restoring from them?

**Priya:** No, and that one keeps me up at night. We restored straight from the Monday night backup. We did not scan the backup images for the ransomware binary before restoring, and we did not check whether the attacker had been in the environment before that restore point was taken. In hindsight we got lucky that the backup was clean.

**Karim:** What about the restored systems themselves? Was there a validation step before returning them to clinical use?

**Priya:** The imaging servers went back into production the same night. Nobody ran integrity checks on the restored data, and no one validated the application before clinicians started reading studies again the next morning. The radiologists were effectively our smoke test. We found two corrupted study folders a week later that nobody had caught.

**Karim:** How did you decide what to restore first?

**Priya:** That was messier than it should have been. The tier list in the BC plan did not match reality. Nobody could tell me which system to bring back first, so we improvised on a whiteboard at 2 a.m. We restored the billing interface before the lab results interface, and the clinic actually needed lab results far more urgently. The dependency appendix in the plan still references systems we decommissioned last year.

**Karim:** Let's talk about communication during the recovery. Who was kept informed?

**Priya:** Internally, it broke down. Our CEO learned about the outage from a clinic manager, not from us. We never sent recovery status updates to the executive team during the incident. There was no cadence, no template, nothing. My team was heads-down restoring servers and nobody owned communications.

**Karim:** And externally?

**Priya:** External notification actually worked well. Our compliance officer notified the Ohio Department of Health within the required reporting window and kept the regulator updated through closure. That process is documented and she followed it to the letter.

**Karim:** Has there been a post-incident review?

**Priya:** Not yet. We have not held a lessons learned session, and it has been six weeks. Everyone went back to project work the following Monday. I have a draft timeline document sitting in my inbox, but no meeting has been scheduled and no improvement actions have been logged.

**Karim:** If the same thing happened tomorrow, what would be different?

**Priya:** Honestly, not much, and that is the problem. The runbook would still carry us through the mechanics. But we would still be restoring unverified backups, still improvising the restore order, and the executives would still be finding out from a clinic manager.

**Karim:** That's candid, thank you. Anything else you want on the record?

**Priya:** Just that the team performed well under pressure. The gaps are process gaps, not people gaps. I want the assessment to reflect both.

---

**Interviewer Notes:**
- Recovery execution from runbook RB-114 was disciplined and beat the 24 hour RTO. Genuine strength.
- Backups were restored without any scan for the ransomware binary or compromise check. Critical process gap.
- Restored imaging servers returned to production with no integrity checks or application validation; corrupted study folders surfaced a week later.
- Restore prioritization was improvised; the BC plan tier list and dependency appendix are stale.
- No recovery status updates reached the executive team; CEO learned of the outage from a clinic manager.
- Regulator notification to the Ohio Department of Health was timely and well documented. Strength.
- No lessons learned session held six weeks after the incident; no improvement actions logged.
