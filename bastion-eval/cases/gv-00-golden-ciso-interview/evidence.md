# Interview Transcript: CISO Strategic Overview
Interviewee: Lisa Wong, Chief Information Security Officer
Interviewer: Karim Consultant, Bastion Security
Date: March 20, 2026
Duration: 60 minutes
Location: Virtual (Microsoft Teams)

---

Karim: Lisa, thank you for making time today. Let's start with an overview of your security program. How would you describe Acme's current security posture?

Lisa: I'd say we're in a transitional phase. We've made real progress on some foundational areas — our MFA rollout is complete, network segmentation is solid, and our security awareness program is getting results. But we have significant gaps in detection and response capabilities.

Karim: Can you elaborate on the detection gaps?

Lisa: We don't have a centralized SIEM. Security logs sit on individual systems — our firewall logs go to one place, endpoint logs go to another, and our cloud audit logs are in yet another console. If we had an incident, correlating those logs manually would take days. We've been trying to get budget for a SIEM for two years, but the business case keeps getting deprioritized against revenue-generating projects.

Karim: What's your log retention situation?

Lisa: It varies wildly. Our firewall keeps 90 days. Most Windows servers keep 30 days by default, though some have been configured for 90. Our cloud environments — AWS and Azure — those have configurable retention, but I honestly couldn't tell you what it's set to right now. That's a gap I'm aware of.

Karim: Let's talk about incident response. Do you have a formal IR plan?

Lisa: We do. It was written in 2023 when I first joined. It covers the standard phases — preparation, identification, containment, eradication, recovery, lessons learned. But I'll be honest with you — we haven't tested it. No tabletop exercises, no simulations. And some of the contact information is outdated. Our previous SOC Manager left six months ago and his name is still on the escalation list.

Karim: That's helpful context. What about the team? Do you have enough people?

Lisa: We have a team of 5, which includes me. Two security analysts, one security engineer, and a GRC analyst. For a company of 2,000 employees, that's thin. We don't have 24/7 coverage. Our analysts work business hours, and we rely on automated alerts for after-hours. The problem is, without a SIEM, those automated alerts are very basic — just endpoint AV alerts and firewall blocks.

Karim: How about vulnerability management?

Lisa: We run Tenable scans weekly on our corporate network. Coverage is decent for on-prem — maybe 80% of known assets. But our cloud workloads are a blind spot. We have about 40 EC2 instances and 20 Azure VMs that aren't in the scanning scope. And we have no scanning for our container workloads in EKS. IoT devices — we have about 200 IP cameras and building management systems — those are completely unscanned.

Karim: On the topic of passwords, what's your rotation policy?

Lisa: We rotate passwords every 60 days for standard users. Admin accounts rotate every 30 days. Service accounts every 180 days. We're actually considering moving to passkeys for some use cases, but that's a 2027 initiative.

Karim: Interesting. I've seen documentation that references 90-day rotation for standard users. Is there a discrepancy?

Lisa: The written policy says 90 days — that's the old standard from before my time. When I joined, I changed the Active Directory GPO to enforce 60 days, but I never updated the policy document. That's on me. The actual enforcement is 60 days, not 90.

Karim: Let's discuss third-party risk management. How do you manage vendor access?

Lisa: This is one of our weakest areas, and I know it. We have vendors with persistent VPN access that hasn't been reviewed. Some of those connections go back years. I know CloudOps has been connected since 2022 and they have elevated privileges we should audit. We don't do formal vendor security assessments — we rely on SOC 2 reports when vendors provide them, but we don't request them proactively.

Karim: Are vendor sessions monitored?

Lisa: No. That's another gap. We have no privileged access management (PAM) solution, so vendor sessions aren't recorded. If a vendor compromised our network through their access, we'd have very limited forensic evidence.

Karim: Last area — business continuity and disaster recovery. Where do you stand?

Lisa: Backups run nightly for our critical databases and file servers. We use Veeam for on-prem and native tools for cloud. But we haven't tested a full restoration in over a year. Our BCP document defines an RTO of 4 hours and RPO of 24 hours for critical systems, but those targets are aspirational — they've never been validated. I actually found out last week that our main financial database backup job has been failing for about 3 weeks. The alerts were going to the old SOC Manager's email.

Karim: Thank you, Lisa. This is very comprehensive and honest. We'll incorporate all of this into our assessment.

Lisa: I'd rather be upfront about our gaps now than have them show up as surprises in the final report. We know where we need to improve — we just need the formal assessment to help us build the business case for investment.

---

Interviewer Notes:
- CISO is engaged and transparent. Willingness to acknowledge gaps is a positive indicator of security culture.
- Key concern: password policy mismatch (policy says 90 days, enforcement is 60 days) — DATA CONFLICT with Access Control Policy
- Detection capability is the biggest strategic gap (no SIEM, fragmented logs, no 24/7 coverage)
- Third-party risk management is effectively non-existent
- BCP/DR targets are untested and likely unrealistic
- Backup monitoring has a known failure that was recently discovered
