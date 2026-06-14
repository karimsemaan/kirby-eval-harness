# Monitoring Architecture Review: Log Pipeline and Coverage
**Document ID:** ENG-MEMO-2026-019
**Author:** Tom Wexler, Senior Security Engineer, Meridian Health Systems
**Date:** 2026-05-06
**Audience:** Daniel Okafor (CISO), Priya Raman (SOC Manager)
**Classification:** Internal

## 1. Background
This memo records the quarterly review of the Splunk ingest pipeline and detection coverage across Meridian Health Systems' corporate, clinical, and cloud environments. Method: indexer ingest statistics for the trailing 120 days, connector configuration review, and packet capture spot checks on the clinical core switches.

## 2. Ingest Source Status (trailing 120 days)

| Source | Transport | Expected Volume | Last Event Received | Status |
|--------|-----------|-----------------|---------------------|--------|
| Palo Alto perimeter firewalls | syslog | 9 GB/day | 2026-05-06 08:12 | Healthy |
| Windows domain controllers | Universal Forwarder | 6 GB/day | 2026-05-06 08:14 | Healthy |
| CrowdStrike Falcon | API | 4 GB/day | 2026-05-06 08:10 | Healthy |
| GlobalProtect VPN | syslog | 1.5 GB/day | 2026-05-06 08:13 | Healthy |
| Azure activity + Entra ID sign-in | Event Hub | 3 GB/day | 2026-01-07 02:41 | **DEAD** |
| Suricata perimeter IDS | EVE JSON | 2 GB/day | 2026-05-06 08:14 | Healthy |
| Clinical VLAN NetFlow | n/a | n/a | never | Not deployed |
| ClearWell integration server (SFTP) | n/a | n/a | never | Not onboarded |

Volumes are 30-day daily averages from the license usage report. "Last Event Received" is taken from indexer metadata on 2026-05-06 at 08:15 Eastern.

## 3. Findings

### 3.1 Azure ingestion has been dead for four months
**The Azure Event Hub connector stopped delivering on 2026-01-07 when its app registration client secret expired. The SIEM has received zero Azure activity log or Entra ID sign-in events for four months, and no one noticed because there is no ingest health monitoring or feed-silence alerting.** All cloud-hosted workloads (47 VMs, the patient portal, and the analytics warehouse) were effectively unmonitored during this window. Renewing the secret restores the feed; the deeper problem is that the pipeline cannot tell us when a source goes quiet.

### 3.2 No east-west visibility inside the clinical network
There are no NetFlow exporters or internal sensors on the clinical core switches. **We have no east-west visibility between clinical VLANs, and no baseline of expected traffic flows has ever been established**, so lateral movement between, for example, the pharmacy VLAN and the imaging VLAN would be invisible to the SOC. Perimeter coverage is good (see 3.4) but interior coverage is zero.

### 3.3 Vendor data exchange is unmonitored
ClearWell Revenue Partners, our outsourced billing vendor, pulls nightly extracts containing ePHI over SFTP from the integration server and holds a persistent site-to-site VPN. **ClearWell's SFTP sessions and VPN activity generate no log events in the SIEM; the integration server is not onboarded, and the vendor tunnel was excluded from firewall logging in 2024 to reduce license volume.** If ClearWell's credentials were stolen, exfiltration through this channel would be indistinguishable from the nightly job. I consider this our largest third-party monitoring exposure.

### 3.4 What is working
The Suricata perimeter IDS deployment is in good shape: signatures are tuned quarterly, alerts land in Splunk within seconds, and the detection engineer reviews rule performance monthly. File integrity monitoring on the two payment card servers is current and verified. These two controls are operating as designed.

### 3.5 Physical systems (informational)
Badge readers and the camera network are managed by Facilities on a separate Genetec platform. **No badge or camera feed reaches the SIEM, and Security has no visibility into badge anomalies** such as after-hours access to the data center cage. Lower priority than the items above, but worth tracking.

### 3.6 Detection content inventory (informational)
The SIEM carries 64 active correlation searches. Distribution by data source:
- 41 target Windows domain telemetry (authentication, privilege use, lateral movement)
- 12 target firewall and VPN data
- 11 target CrowdStrike detections
- 0 reference Azure or Entra ID data, which is consistent with the dead feed in 3.1; the eight cloud detections written in 2025 have produced no results since 2026-01-07 and nobody questioned the silence

## 4. Recommendations (priority order)
1. Renew the Azure connector client secret immediately; add feed-silence alerting for every ingest source within 30 days.
2. Onboard the ClearWell integration server and re-enable firewall logging on the vendor tunnel.
3. Deploy NetFlow on the clinical core switches and build a 30-day traffic baseline before writing detections.
4. Evaluate a Genetec-to-SIEM integration with Facilities in H2 2026.

## 5. Scope and limitations
This review covered SIEM ingest and network detection coverage only. EDR policy configuration, vulnerability scanning coverage, and backup monitoring are assessed in separate engineering memos. Packet captures were limited to two of the four hospital campuses (Columbus Main and Westview); the clinical core configuration is identical at the remaining two campuses per the network team, but this was not independently verified.

## 6. Sign-off
Prepared by T. Wexler, Security Engineering. Reviewed in draft with P. Raman on 2026-05-05. Final distribution to D. Okafor on 2026-05-06. Next quarterly review scheduled for August 2026.
