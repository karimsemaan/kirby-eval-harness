# Interview Transcript: Enterprise Risk Assessment Program
**Interviewee:** Priya Natarajan, Director of Enterprise Risk and Compliance, Meridian Health Systems
**Interviewer:** Karim Consultant, Bastion Security
**Date:** June 3, 2026
**Duration:** 45 minutes
**Location:** Virtual (Microsoft Teams)

---

**Karim:** Priya, thanks for joining. Let's start with the basics. How does Meridian run its cyber risk assessment program?

**Priya:** Our Enterprise Risk Management Standard requires a full cybersecurity risk assessment every year, covering all four hospitals and the clinic network. The output is a risk register that the steering committee is supposed to review quarterly.

**Karim:** When was the last full assessment completed?

**Priya:** January 2024. **We have not completed an enterprise cyber risk assessment in almost two and a half years.** The analyst who ran the methodology left in mid 2024 and the role was never backfilled. We started the 2025 assessment, got through two of the four hospitals, and it stalled. So the current risk register reflects the threat picture from before our Epic go-live and before we moved the data warehouse to Azure.

**Karim:** Tell me about the risk register itself. How are risk responses handled?

**Priya:** Each risk gets a treatment plan with an owner and a target date. That part of the process works on paper. The problem is follow-through. **We have 47 open risks in the register, and I could not tell you how many of the treatment plans have actually been completed. Nobody tracks them after assignment.** When I pulled the register last month, 29 of the 47 treatment plans were past their target dates with no status update recorded. There is no escalation when a date slips.

**Karim:** Is risk status communicated upward?

**Priya:** The steering committee gets a slide twice a year, but it is a count of open risks, not progress on responses. The quarterly review the standard calls for has not happened since 2024.

**Karim:** How do you stay on top of the threat landscape? Threat intelligence feeds, information sharing?

**Priya:** Honestly, we do not. **Meridian is not a member of Health-ISAC and we subscribe to no threat intelligence feeds.** We hear about healthcare ransomware campaigns from the news or from our cyber insurance broker. When the Change Healthcare incident happened, we found out from a vendor email. There is no process for taking an external threat report and checking it against our environment.

**Karim:** What about vulnerability management? How do scan results feed into risk decisions?

**Priya:** Qualys scans run monthly across the corporate and clinical server segments, and coverage there is good. But the results go to a shared mailbox as a PDF. **Nobody validates the findings or records them in a vulnerability register.** There is no triage step, so we cannot say which of the criticals from the May scan are real, mitigated, or false positives. The PDF sits in the mailbox until the next one arrives.

**Karim:** How do new risks enter the register between assessments? Say a new system goes live.

**Priya:** In theory there is an intake form on the intranet. In practice, the big changes of the last two years, the Epic go-live, the Azure data warehouse migration, the new patient portal, none of them went through a risk assessment before launch. They are simply not in the register. The intake form has received four submissions since 2024, all from my own team.

**Karim:** What about findings from audits or your cyber insurer? Do those flow into the register?

**Priya:** The insurer's annual questionnaire and our HIPAA security risk analysis are handled by separate teams, and the outputs live in separate folders. There is no consolidation. We have effectively three partial pictures of risk and no single one.

**Karim:** Are there parts of the program you would call strong?

**Priya:** Penetration testing, definitely. We have an external firm test us every year, and that program is run well. **Every pen test finding is logged in Jira, assigned an owner, and tracked to closure, and the lessons feed directly into the next year's security roadmap.** Last year's test drove the network segmentation work between the guest and clinical networks. The other thing I would defend is our scoring methodology. When we do assess, we use a documented 5 by 5 likelihood and impact matrix with defined criteria, so impacts and likelihoods are recorded consistently rather than guessed.

**Karim:** If you had one ask of leadership, what would it be?

**Priya:** Backfill the risk analyst role and mandate the annual assessment. Everything downstream, the register, the treatment tracking, the committee reporting, depends on that cadence existing.

**Karim:** Thank you, Priya. This is exactly the candor we need.

---

**Interviewer Notes:**
- Enterprise risk assessment is 29 months overdue against an annual requirement; register predates Epic go-live and the Azure migration.
- Risk responses are assigned but never tracked; 29 of 47 treatment plans past due with no status updates and no escalation path.
- No threat intelligence capability: no Health-ISAC membership, no feeds, no process to act on external threat reports.
- Vulnerability scan findings are not validated or recorded; monthly Qualys PDFs accumulate unread in a shared mailbox.
- Major changes (Epic go-live, Azure migration, patient portal) launched without pre-go-live risk assessment; intake process exists but is unused outside the risk team.
- Genuine strengths: mature annual penetration test program with Jira-tracked remediation feeding the roadmap, and a documented 5x5 risk scoring methodology.
