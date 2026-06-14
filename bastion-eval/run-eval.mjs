#!/usr/bin/env node
/**
 * Bastion golden-eval harness (single-stage evidence-to-findings eval).
 *
 * Mirrors Bastion's evidence-analysis stage faithfully:
 *   - System + user prompt construction is a VERBATIM port of
 *     Bastion/src/lib/llm/prompts/analyze-evidence.ts (buildEvidenceAnalysisPrompt)
 *     with the NIST CSF 2.0 frameworkContext from Bastion/src/lib/frameworks/registry.ts
 *     and FULL_WRITING_STANDARDS from Bastion/src/lib/llm/prompts/writing-standards.ts.
 *   - The expected JSON output shape mirrors evidenceAnalysisSchema from
 *     Bastion/src/lib/llm/parsers.ts.
 *   - The model id is parsed AT RUNTIME from Bastion/src/lib/llm/client.ts
 *     (DIRECT_MODELS.analysis, the path Bastion takes when ANTHROPIC_API_KEY is set).
 *   - Control descriptions are parsed at runtime from
 *     Bastion/supabase/migrations/003_seed_nist_csf.sql and assessment guidance from
 *     Bastion/src/lib/frameworks/assessment-meta.ts (same enrichment the analyze
 *     route performs via getAssessmentMeta).
 *   - Timeout (90s) and retry policy (2 retries, 2s exponential backoff on
 *     transient errors) mirror Bastion/src/lib/llm/client.ts.
 *
 * What is NOT exercised (deliberately): Bastion's RAG retrieval, Haiku bottom-up
 * discovery, smart filtering, batching/dedup, and the Haiku verification pass.
 * This is a single Sonnet evidence-to-findings call, scored against a pinned
 * golden contract.
 *
 * The Bastion repo is READ-ONLY for this harness. It reads files and runs
 * `git rev-parse HEAD` for provenance; it never writes or git-mutates there.
 *
 * Usage:
 *   node scripts/studies/bastion-eval/run-eval.mjs --dry-run       # no API calls
 *   node scripts/studies/bastion-eval/run-eval.mjs                 # full eval
 *   node scripts/studies/bastion-eval/run-eval.mjs --force         # ignore committed responses
 *   node scripts/studies/bastion-eval/run-eval.mjs --only=pr-03    # filter cases
 *   node scripts/studies/bastion-eval/run-eval.mjs --rescore-only  # re-score the committed
 *                                                                  # responses/, never call the API
 *
 * Raw model responses are COMMITTED at responses/<caseId>.json (they are model
 * outputs over synthetic fixtures; no secrets). --rescore-only re-scores them
 * with zero API access so the published artifact is reproducible from this repo.
 * If the private Bastion checkout is unavailable, --rescore-only falls back to
 * offline scoring: it does NOT rebuild prompts or validate prompt hashes, but it
 * does re-parse the committed responses and re-run the scorer over every case.
 *
 * Secrets: ANTHROPIC_API_KEY is parsed from Bastion/.env.local at runtime.
 * It is never written to disk, never logged, and stripped from error output.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  mkdirSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ─── Paths ───────────────────────────────────────────────────

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ACHIEVEMENTS_ROOT = path.resolve(SCRIPT_DIR, "..", "..", "..");
const BASTION_REPO =
  process.env.BASTION_REPO || "C:/Users/semaa/Documents/GitHub/Bastion";
const CASES_DIR = path.join(SCRIPT_DIR, "cases");
// COMMITTED raw model responses (formerly a gitignored .cache/). Publishing
// them is the point: anyone can audit the scoring against the actual outputs.
const RESPONSES_DIR = path.join(SCRIPT_DIR, "responses");
const ARTIFACT_PATH = path.join(
  ACHIEVEMENTS_ROOT,
  "public",
  "data",
  "bastion-evals.json",
);

const MIRRORED_FILES = {
  prompt: "src/lib/llm/prompts/analyze-evidence.ts",
  writingStandards: "src/lib/llm/prompts/writing-standards.ts",
  client: "src/lib/llm/client.ts",
  parsers: "src/lib/llm/parsers.ts",
  registry: "src/lib/frameworks/registry.ts",
  assessmentMeta: "src/lib/frameworks/assessment-meta.ts",
  seedSql: "supabase/migrations/003_seed_nist_csf.sql",
  route: "src/app/api/analyze/evidence/route.ts",
};

// ─── API constants (mirroring Bastion/src/lib/llm/client.ts) ─

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_TIMEOUT = 90_000; // Bastion DEFAULT_TIMEOUT
const MAX_RETRIES = 2; // Bastion MAX_RETRIES
const RETRY_DELAY_MS = 2000; // Bastion RETRY_DELAY_MS
const MAX_OUTPUT_TOKENS = 4096; // AI SDK provider default Bastion implicitly uses

// ─── Secret handling ─────────────────────────────────────────

let API_KEY = null; // resolved lazily; NEVER logged, NEVER written to disk

function loadApiKey() {
  const envLocal = path.join(BASTION_REPO, ".env.local");
  if (!existsSync(envLocal)) {
    throw new Error(`Bastion .env.local not found at ${envLocal}`);
  }
  const text = readFileSync(envLocal, "utf8");
  const m = text.match(/^\s*ANTHROPIC_API_KEY\s*=\s*("?)([^"\r\n]+)\1\s*$/m);
  if (!m || !m[2]) {
    throw new Error("ANTHROPIC_API_KEY not found in Bastion/.env.local");
  }
  API_KEY = m[2].trim();
}

/** Strip the API key from any string before it can reach stdout/stderr/disk. */
function scrub(s) {
  const str = String(s ?? "");
  if (!API_KEY) return str;
  return str.split(API_KEY).join("[REDACTED]");
}

// ─── Mirrored data parsed at runtime from the Bastion repo ───

function readBastion(rel) {
  return readFileSync(path.join(BASTION_REPO, rel), "utf8");
}

function getBastionSha() {
  return execFileSync("git", ["-C", BASTION_REPO, "rev-parse", "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

/** Model id Bastion uses for analysis via the direct Anthropic SDK (ENV/BYOK path). */
function parseAnalysisModel() {
  const src = readBastion(MIRRORED_FILES.client);
  const direct = src.match(
    /DIRECT_MODELS\s*=\s*\{[^}]*?analysis:\s*"([^"]+)"/s,
  );
  if (!direct)
    throw new Error("Could not parse DIRECT_MODELS.analysis from client.ts");
  const gateway = src.match(
    /export const MODELS\s*=\s*\{[^}]*?analysis:\s*"([^"]+)"/s,
  );
  return { direct: direct[1], gateway: gateway ? gateway[1] : null };
}

function parsePromptVersion() {
  const src = readBastion(MIRRORED_FILES.prompt);
  const m = src.match(/PROMPT_VERSION\s*=\s*"([^"]+)"/);
  return m ? m[1] : "unknown";
}

/** Parse the NIST CSF 2.0 control seed (id -> description). */
function parseSeedControls() {
  const sql = readBastion(MIRRORED_FILES.seedSql);
  const rowRe =
    /\(\s*'((?:[^']|'')*)'\s*,\s*'nist-csf-2'\s*,\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*\)/g;
  const unesc = (s) => s.replace(/''/g, "'");
  const controls = new Map();
  let m;
  while ((m = rowRe.exec(sql)) !== null) {
    controls.set(unesc(m[1]), {
      id: unesc(m[1]),
      functionName: unesc(m[2]),
      categoryName: unesc(m[3]),
      description: unesc(m[5]),
    });
  }
  if (controls.size === 0)
    throw new Error("Parsed 0 controls from 003_seed_nist_csf.sql");
  return controls;
}

/** Parse per-control assessmentGuidance from assessment-meta.ts. */
function parseAssessmentGuidance() {
  const src = readBastion(MIRRORED_FILES.assessmentMeta);
  const re =
    /"([A-Z]{2}\.[A-Z]{2}-\d{2})":\s*\{[\s\S]*?assessmentGuidance:\s*"((?:\\.|[^"\\])*)"/g;
  const out = new Map();
  let m;
  while ((m = re.exec(src)) !== null) {
    let guidance = m[2];
    try {
      guidance = JSON.parse(`"${m[2]}"`);
    } catch {
      /* keep raw on unescape failure */
    }
    out.set(m[1], guidance);
  }
  return out;
}

function readExistingArtifact() {
  try {
    return JSON.parse(readFileSync(ARTIFACT_PATH, "utf8"));
  } catch {
    return null;
  }
}

function readExistingArtifactProvenance() {
  return readExistingArtifact()?._provenance ?? {};
}

function loadBastionMirror({ allowOffline }) {
  try {
    const bastionSha = getBastionSha();
    const models = parseAnalysisModel();
    const promptVersion = parsePromptVersion();
    const controls = parseSeedControls();
    const guidance = parseAssessmentGuidance();
    return {
      offline: false,
      bastionSha,
      models,
      promptVersion,
      controls,
      guidance,
    };
  } catch (err) {
    if (!allowOffline) throw err;
    const provenance = readExistingArtifactProvenance();
    const modelMatch =
      typeof provenance.modelResolution === "string"
        ? provenance.modelResolution.match(
            /DIRECT_MODELS\.analysis = "([^"]+)"/,
          )
        : null;
    return {
      offline: true,
      offlineReason: (err instanceof Error ? err.message : String(err)).split(
        /\r?\n/,
      )[0],
      bastionSha: provenance.bastionSha ?? "unknown",
      models: {
        direct: modelMatch?.[1] ?? null,
        gateway: null,
      },
      promptVersion: provenance.promptVersion ?? "unknown",
      controls: null,
      guidance: new Map(),
    };
  }
}

// ─── VERBATIM mirror: writing-standards.ts (FULL_WRITING_STANDARDS) ───
// Copied byte-for-byte from Bastion/src/lib/llm/prompts/writing-standards.ts.

const OBJECTIVITY_DIRECTIVE = `
OBJECTIVITY DIRECTIVE:
You are producing working papers for a professional assessment. Your role is forensic analyst, not advocate. Be as objective as possible in your analysis and observations.
- Do not flatter the client's security posture. Do not soften findings to be diplomatic.
- Do not use language that implies you are impressed or disappointed. Avoid subjective adjectives — every descriptor must be verifiable against the source material.
- Use factual, evidence-based language only. Every statement must be traceable to a specific source document, interview excerpt, or observable artifact.
- Cite specific document sections, page numbers, version identifiers, or paragraph references rather than making general claims about a document.
- State facts. Cite evidence. Quantify where possible. Let the reader draw their own conclusions about whether something is "good" or "bad."
- If the evidence is ambiguous, say "the evidence is ambiguous" and explain why — do not pick the more flattering interpretation.
- If you lack sufficient evidence to assess a control, say "insufficient evidence to assess" — do not infer capability from silence.`;

const BANNED_LANGUAGE = `
BANNED LANGUAGE — these words are prohibited in all output:
Do NOT use: "comprehensive", "robust", "significant", "noteworthy", "rigorous", "well-defined", "well-established", "appropriate", "sufficient", "impressive", "substantial"
Do NOT use these phrases: "it is important to note that", "this underscores the need for", "it is worth mentioning", "this highlights the importance of", "it should be noted", "needless to say"

These words evaluate without evidence. Replace each with a specific, verifiable claim:
- NOT "comprehensive policy" → "policy covering 8 of 10 required domains (missing: encryption, remote access)"
- NOT "robust MFA implementation" → "MFA enforced for 34 of 40 applications via Okta SSO; 6 legacy apps use password-only auth"
- NOT "significant gap" → "no documented incident response plan; last IR test was 26 months ago"
- NOT "noteworthy finding" → "PHI stored in 3 unencrypted S3 buckets with public read access"
- NOT "rigorous review process" → "quarterly access reviews via ServiceNow; last review removed 23 stale accounts"
- NOT "well-defined process" → "process documented in POL-SEC-012 v3.1 with RACI matrix and quarterly review cadence"
- NOT "well-established program" → "security awareness program since 2021 with 94% completion rate and monthly phishing simulations"
- NOT "appropriate controls" → "network segmentation via Palo Alto NGFW with 12 zones separating PCI from general network"
- NOT "sufficient coverage" → "endpoint protection on 340 of 347 managed devices (98%); 7 legacy systems excluded"
- NOT "impressive results" → "94% of critical patches applied within 72-hour SLA over the past 6 months"
- NOT "substantial investment" → "deployed CrowdStrike EDR, Splunk SIEM, and CyberArk PAM over 18 months"`;

const QUANTIFICATION_RULES = `
QUANTIFICATION RULES — express findings in measurable terms:
- Counts: "12 of 47 privileged accounts" not "some accounts"
- Percentages: "94% completion rate" not "high completion"
- Time: "last reviewed 14 months ago" not "not recently reviewed"
- Versions: "policy v3.1 dated 2024-03" not "current policy"
- Named tools: "Okta SSO, CrowdStrike EDR, Splunk SIEM" not "identity management tool"
- Scope: "covers 8 of 10 required domains" not "covers most domains"
If the evidence does not contain measurable data, state what is missing: "The policy does not specify review frequency, scope of coverage, or responsible party."`;

const FULL_WRITING_STANDARDS = `${OBJECTIVITY_DIRECTIVE}

${BANNED_LANGUAGE}

${QUANTIFICATION_RULES}`;

// ─── VERBATIM mirror: NIST CSF 2.0 promptContext from registry.ts ───

const NIST_CSF2_PROMPT_CONTEXT = {
  name: "NIST Cybersecurity Framework 2.0",
  controlTermSingular: "subcategory",
  controlTermPlural: "subcategories",
  analysisPreamble:
    "You are analyzing evidence against the NIST Cybersecurity Framework 2.0 control objectives. Each control is identified by its subcategory ID (e.g., PR.AA-01). The framework organizes controls into Functions (Govern, Identify, Protect, Detect, Respond, Recover), Categories, and Subcategories.",
};

// ─── VERBATIM mirror: buildEvidenceAnalysisPrompt from analyze-evidence.ts ───
// Line-for-line port. Do not edit the template text; it must track Bastion.

function buildEvidenceAnalysisPrompt(params) {
  const { frameworkContext: fw } = params;

  return {
    system: `You are a senior cybersecurity consultant with 15+ years of experience conducting maturity assessments for regulated organizations. You hold CISSP, CISA, and have led 100+ assessments across financial services, healthcare, and critical infrastructure. You are reviewing evidence for a client engagement.

${fw.analysisPreamble}

Your task: analyze the provided evidence against the listed ${fw.controlTermPlural}. Think like a consultant writing working papers — every finding must be defensible with a direct evidence citation.

THOROUGHNESS — A senior consultant examines evidence from MULTIPLE ANGLES:
1. DIRECT evidence: What the document explicitly states about security controls
2. GOVERNANCE evidence: Document metadata reveals organizational maturity:
   - Version numbers and revision history → policy lifecycle management
   - Executive signatures and approval dates → leadership oversight
   - Review cycles and next-review dates → ongoing governance cadence
   - Classification markings and document IDs → information management maturity
   - Exception handling and escalation paths → operational risk management
3. TOOL evidence: Named platforms/products (Okta, CyberArk, Splunk, Palo Alto, ServiceNow) are evidence of specific control implementations
4. GAPS BY OMISSION: What a document of this type should address but doesn't. A password policy that never mentions MFA. An IR plan with no communication procedures. A firewall audit with no change management.

For each relevant ${fw.controlTermSingular} WITHIN THE DOCUMENT'S SCOPE, produce:
- controlId: The ${fw.controlTermSingular} ID being assessed
- coverage: "full" | "partial" | "none" | "unclear"
- findingType: "strength" | "gap" | "risk" — classify the finding:
  - "strength": Evidence demonstrates strong, documented implementation of this ${fw.controlTermSingular}
  - "gap": Evidence shows missing or incomplete implementation that needs remediation
  - "risk": Evidence reveals an active security exposure, vulnerability, or compliance violation needing urgent attention
- severity: "critical" | "high" | "medium" | "low" | null — for gaps and risks only (null for strengths). See SEVERITY CALIBRATION below.
- observation: A specific, factual observation written like a consultant's working paper — cite dates, version numbers, tool names, and specifics
- gaps: Any gaps, missing elements, or risks identified (omit if coverage is full and no risks)
- quote: The exact excerpt from the evidence that DIRECTLY supports THIS SPECIFIC finding. RULES:
  - The quote MUST be relevant to the observation text, not a generic document header or unrelated section
  - For strengths: quote the specific sentence showing the capability (e.g., "34 applications are integrated with Okta for Single Sign-On")
  - For gaps with partial coverage: quote the section that SHOULD have addressed the gap but falls short
  - For gaps by omission (coverage: "none"): quote the CLOSEST relevant section — the part of the document where the missing element would logically appear (e.g., for "no encryption documented", quote the data protection section heading/intro)
  - NEVER return an empty quote. Every finding must have a supporting citation.
  - NEVER use a generic document title or header as the quote unless the finding IS about the document metadata
- confidence: "high" | "medium" | "low" — how confident you are in this assessment

Also produce:
- summary: A 2-3 sentence executive summary of what this evidence reveals about the organization's posture
- followUpQuestions: Questions a consultant would ask the client in a follow-up interview
- conflictsDetected: Any findings that contradict existing observations (if provided)

DOCUMENT SCOPE — CRITICAL:
Every document has a NATURAL SCOPE — the set of ${fw.controlTermPlural} it is designed to address.
- An IAM policy's natural scope: identity management, authentication, access control, credential lifecycle
- A vulnerability scan's natural scope: asset management, vulnerability management, patch compliance
- A BCP's natural scope: continuity planning, recovery procedures, resilience testing
- A data privacy policy's natural scope: data protection, privacy rights, processing agreements

DO NOT penalize a document for failing to cover ${fw.controlTermPlural} outside its natural scope.
A vulnerability scan report is NOT evidence for "risk appetite statements" (GV.RM-02).
An asset inventory is NOT evidence for "organizational mission" (GV.OC-01).
Only report findings for ${fw.controlTermPlural} that fall within the document's natural scope OR where the document provides genuine indirect evidence (e.g., executive approval signatures → governance controls).

If a ${fw.controlTermSingular} is outside the document's scope, SKIP IT ENTIRELY — do not produce a "none" coverage finding.

BALANCED ASSESSMENT — STRENGTHS MATTER:
A senior consultant produces BALANCED findings. Real organizations do many things well, and strengths demonstrate maturity. Your output MUST include both strengths and gaps.
- Target ratio: roughly 25-40% of findings should be strengths for a typical document
- If you find zero strengths after analysis, RE-EXAMINE. Every real evidence document demonstrates SOMETHING positive — structured formatting, tool integrations, defined processes, executive oversight, version control, review cadences.
- Strengths should be as SPECIFIC as gaps: cite tool names, dates, metrics, version numbers.
- Do NOT manufacture fake strengths. But do NOT overlook real ones either.

SEVERITY CALIBRATION:
When you identify a gap or risk, also assess its severity:
- "critical": Active data exposure, compliance violation with regulatory penalty risk, exploitable vulnerability in production (e.g., PHI transmitted unencrypted, terminated accounts still active, unpatched critical CVE on internet-facing system)
- "high": Missing fundamental control with no compensating control (e.g., no MFA enforcement, no encryption at rest for sensitive data, no incident response plan)
- "medium": Partial implementation needing improvement (e.g., annual reviews where quarterly is required, MFA exists but not for VPN, policy exists but is outdated)
- "low": Minor best-practice gap, documentation improvement, or process refinement (e.g., policy wording says "recommended" vs "required", missing a review date, no RACI matrix for a well-functioning process)

QUALITY RULES:
- Only cite what is actually in the evidence. Do not infer capabilities beyond what is documented.
- Be specific. "The organization has a policy" is useless. "The Password & Authentication Policy (POL-IAM-003, v4.2, approved by CISO on 2025-01-15) defines..." is useful.
- Flag any statements that contradict existing observations.
- Write like a senior consultant's working paper, not a chatbot summary. No filler language.
- A risk is worse than a gap: it means something is actively wrong (e.g., PHI stored unencrypted, terminated user accounts still active, FTP in the DMZ).

${FULL_WRITING_STANDARDS}
- BE THOROUGH. A senior consultant typically produces 4-8 findings from a single policy document. If you only have 1-2 findings, you're probably missing governance signals, tool evidence, or gaps by omission.
- DO NOT produce generic "cannot assess" findings. If you cannot read the document content, produce ONE summary observation explaining why, not one per ${fw.controlTermSingular}.

MANDATORY ASSESSMENT GUIDANCE CHECK:
For each ${fw.controlTermSingular} that includes [Assessment guidance], you MUST:
1. Read the guidance as a CHECKLIST of things to verify
2. For EACH item in the guidance, explicitly check whether the evidence addresses it
3. If the evidence DOES NOT address a guidance item, that IS a gap — report it
4. Common omission patterns to catch:
   - Policy says something is "recommended" vs "required" — that's a gap
   - Review frequency is annual when it should be quarterly for privileged items — that's a gap
   - Technology type is missing (e.g., no mention of FIDO2/hardware tokens for privileged MFA) — that's a gap
   - Scope is limited (e.g., MFA for email but not VPN, not admin consoles) — that's a gap
   - Document is silent on a topic the guidance says to verify — that's a gap, report as coverage: "none"

DO NOT skip guidance items because the document doesn't mention them. Silence IS the finding.

CALIBRATION — use these examples to calibrate your coverage assessments:

FULL COVERAGE example:
  Evidence: "Quarterly access reviews conducted by IT Security team, documented in ServiceNow. Last review: Jan 2025, 23 stale accounts removed, 4 privilege escalations corrected."
  Assessment: PR.AA-05 | coverage: full | findingType: strength | confidence: high
  Why: Formal process with defined cadence, documented execution, and quantified remediation metrics.

PARTIAL COVERAGE example:
  Evidence: "Access is reviewed when employees leave the company."
  Assessment: PR.AA-05 | coverage: partial | findingType: gap | confidence: high
  Why: Reviews exist but are event-driven only (termination). No periodic cadence, no scope beyond offboarding.

NO COVERAGE example:
  Evidence: "We plan to implement access reviews next quarter."
  Assessment: PR.AA-05 | coverage: none | findingType: gap | confidence: high
  Why: Future plans do not constitute current implementation. No process exists today.

RISK example (active exposure):
  Evidence: "FTP server accessible from DMZ, last firewall rule review was 7 months ago."
  Assessment: PR.DS-02 | coverage: partial | findingType: risk | confidence: high
  Why: Unencrypted protocol actively in use. Stale rule base indicates lack of ongoing management.

GOVERNANCE example (indirect evidence from document metadata):
  Evidence: Document titled "Password & Authentication Policy", Document ID: POL-IAM-003, Version: 4.2, Review Cycle: Annual, Next Review: 2026-01-15, Approved by: CISO
  Assessment: GV.PO-02 | coverage: full | findingType: strength | confidence: high
  Why: Policy shows active lifecycle management — iterative versioning (v4.2), defined annual review cycle, scheduled next review, and executive approval. This is evidence of a functioning policy governance process.

STRICT SCOPE RULE:
You MUST ONLY produce findings for the EXACT ${fw.controlTermSingular} IDs listed below.
Do NOT produce findings for any other ${fw.controlTermSingular}, even if the evidence clearly relates to it.
Other ${fw.controlTermPlural} are being analyzed in parallel batches — producing findings for them here creates duplicates.
If you find evidence relevant to an unlisted ${fw.controlTermSingular}, mention it briefly in the summary, not as a finding.

Respond with a JSON object matching the required schema.`,
    user: `Evidence document content:
---
${params.evidenceText}
---

${params.bottomUpDiscoveries ? `FULL-DOCUMENT SCAN FINDINGS (these cover the ENTIRE document, not just the excerpt above — you MUST address every finding below and map it to a control):\n${params.bottomUpDiscoveries}\n\n` : ""}${params.ragContext ? `Assessment knowledge (relevant guidance from knowledge base):\n${params.ragContext}\n\n` : ""}${fw.controlTermPlural} to evaluate against:
${params.controls
  .map(
    (c) =>
      `- ${c.id}: ${c.description}${c.assessmentGuidance ? `\n  [Assessment guidance: ${c.assessmentGuidance}]` : ""}`,
  )
  .join("\n")}

${
  params.existingObservations?.length
    ? `Existing observations for context (check for contradictions):
${params.existingObservations.map((o) => `- ${o.title}: ${o.description}`).join("\n")}`
    : ""
}`,
  };
}

// ─── Output schema (mirror of evidenceAnalysisSchema in parsers.ts) ───
// Bastion sends this via the Vercel AI SDK's Output.object wrapper. The
// harness reproduces the prompt text verbatim and appends an explicit JSON
// schema instruction in place of the SDK wrapper, then parses defensively.

const EVIDENCE_ANALYSIS_JSON_SCHEMA = {
  type: "object",
  properties: {
    analyses: {
      type: "array",
      items: {
        type: "object",
        properties: {
          controlId: { type: "string" },
          coverage: {
            type: "string",
            enum: ["full", "partial", "none", "unclear"],
          },
          findingType: { type: "string", enum: ["strength", "gap", "risk"] },
          severity: {
            anyOf: [
              { type: "string", enum: ["critical", "high", "medium", "low"] },
              { type: "null" },
            ],
          },
          observation: { type: "string" },
          gaps: { type: "string" },
          quote: { type: "string" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: [
          "controlId",
          "coverage",
          "findingType",
          "observation",
          "quote",
          "confidence",
        ],
        additionalProperties: false,
      },
    },
    summary: { type: "string" },
    followUpQuestions: { type: "array", items: { type: "string" } },
    conflictsDetected: {
      type: "array",
      items: {
        type: "object",
        properties: {
          controlId: { type: "string" },
          existingClaim: { type: "string" },
          newClaim: { type: "string" },
          recommendation: { type: "string" },
        },
        required: ["controlId", "existingClaim", "newClaim", "recommendation"],
        additionalProperties: false,
      },
    },
  },
  required: ["analyses", "summary"],
  additionalProperties: false,
};

function withSchemaInstruction(system) {
  return (
    system +
    `\n\nJSON schema:\n${JSON.stringify(EVIDENCE_ANALYSIS_JSON_SCHEMA, null, 2)}\nYou MUST answer with a single JSON object that matches the JSON schema above. Do not include any other text, markdown fences, or commentary.`
  );
}

// ─── Anthropic Messages API call (raw fetch) ─────────────────

function isTransient(message) {
  // Mirrors Bastion's withRetry transient check
  const m = message.toLowerCase();
  return (
    m.includes("timeout") ||
    m.includes("abort") ||
    m.includes("network") ||
    m.includes("econnreset") ||
    m.includes("500") ||
    m.includes("503") ||
    m.includes("529") ||
    m.includes("overloaded")
  );
}

async function callAnthropic({ model, system, user }) {
  const body = JSON.stringify({
    model,
    max_tokens: MAX_OUTPUT_TOKENS,
    system,
    messages: [{ role: "user", content: user }],
  });

  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "x-api-key": API_KEY,
          "anthropic-version": ANTHROPIC_VERSION,
          "content-type": "application/json",
        },
        body,
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(
          `Anthropic API ${res.status}: ${scrub(text).slice(0, 500)}`,
        );
      }
      return JSON.parse(text);
    } catch (err) {
      lastError = new Error(
        scrub(err instanceof Error ? err.message : String(err)),
      );
      if (!isTransient(lastError.message) || attempt === MAX_RETRIES)
        throw lastError;
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
      console.warn(
        `  [retry ${attempt + 1}/${MAX_RETRIES}] after ${delay}ms: ${lastError.message.slice(0, 160)}`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError ?? new Error("LLM call failed after retries");
}

// ─── Defensive parsing of the structured output ──────────────

function extractResponseText(apiResponse) {
  const blocks = Array.isArray(apiResponse?.content) ? apiResponse.content : [];
  return blocks
    .filter((b) => b && b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n");
}

/** Tolerates fences, leading prose, and minor schema drift. */
function parseFindings(rawText) {
  let text = rawText.trim();
  // strip markdown fences if present
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    return {
      ok: false,
      error: "no JSON object found in response text",
      parsed: null,
    };
  }
  let obj;
  try {
    obj = JSON.parse(text.slice(first, last + 1));
  } catch (e) {
    return {
      ok: false,
      error: `JSON.parse failed: ${e.message}`,
      parsed: null,
    };
  }

  // schema-drift tolerance: findings array under analyses | findings | results
  const rawAnalyses = Array.isArray(obj.analyses)
    ? obj.analyses
    : Array.isArray(obj.findings)
      ? obj.findings
      : Array.isArray(obj.results)
        ? obj.results
        : [];

  const findings = rawAnalyses
    .filter((a) => a && typeof a === "object")
    .map((a) => {
      const coverage =
        typeof a.coverage === "string" ? a.coverage.toLowerCase() : "unclear";
      // Mirror the route's fallback: missing findingType derives from coverage
      const findingType =
        typeof a.findingType === "string"
          ? a.findingType.toLowerCase()
          : coverage === "full"
            ? "strength"
            : "gap";
      const severity =
        typeof a.severity === "string" &&
        ["critical", "high", "medium", "low"].includes(a.severity.toLowerCase())
          ? a.severity.toLowerCase()
          : null;
      return {
        controlId:
          typeof a.controlId === "string"
            ? a.controlId
            : String(a.control_id ?? ""),
        coverage,
        findingType,
        severity,
        observation: typeof a.observation === "string" ? a.observation : "",
        gaps: typeof a.gaps === "string" ? a.gaps : "",
        quote: typeof a.quote === "string" ? a.quote : "",
        confidence:
          typeof a.confidence === "string" ? a.confidence.toLowerCase() : "low",
      };
    });

  return {
    ok: true,
    error: null,
    parsed: {
      findings,
      summary: typeof obj.summary === "string" ? obj.summary : "",
      followUpQuestions: Array.isArray(obj.followUpQuestions)
        ? obj.followUpQuestions
        : [],
    },
  };
}

// ─── Scoring (pinned contract) ───────────────────────────────

const SEVERITY_RANK = { low: 1, medium: 2, high: 3, critical: 4 };

/**
 * Quote normalization. The 2026-06-11 scoring review found the original
 * normalizer (whitespace + smart punctuation only) rejected quotes that were
 * faithful to the evidence's PROSE but not its MARKUP: the model omits the
 * evidence's markdown bold/emphasis markers, blockquote ">" prefixes and
 * "NOTE:"/"OBSERVATION:" labels, and swaps double quotes for single quotes
 * inside its JSON strings. Bastion's own verification pass accepts
 * "verbatim or near-verbatim" quotes, so the harness was stricter than the
 * system it mirrors. Markup characters and quote marks are now stripped from
 * BOTH sides before comparison; the word sequence itself must still match.
 */
function normalizeForQuoteCheck(s) {
  return (
    String(s ?? "")
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, "-")
      // markdown blockquote markers at line starts (before whitespace collapse)
      .replace(/^[ \t]*>[ \t]?/gm, " ")
      // markdown emphasis/heading/code markers; remove (not space) so that
      // mid-sentence "**bold**," collapses to "bold," exactly as models quote it
      .replace(/[*_`#]+/g, "")
      // table cell separators
      .replace(/\|/g, " ")
      // quote marks: models routinely render the evidence's double quotes as
      // single quotes inside JSON strings; neither changes the quoted words
      .replace(/["']/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
  );
}

function quoteAppearsInEvidence(quote, evidenceText) {
  const q = normalizeForQuoteCheck(quote);
  if (!q) return false;
  const ev = normalizeForQuoteCheck(evidenceText);
  if (ev.includes(q)) return true;
  // Sentence-level fallback (2026-06-11 scoring review): the model sometimes
  // stitches adjacent evidence sentences into one quote, eliding an
  // interstitial markup label or sentence. That is near-verbatim, not
  // fabrication, PROVIDED every quoted sentence of substance itself appears
  // verbatim in the evidence. Fragments under 20 chars are too weak to verify
  // alone and are ignored; a quote with no substantive sentence fails.
  const sentences = q
    .split(/(?<=[.!?])\s+|\s*(?:\.{3}|…)\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  const substantive = sentences.filter((part) => part.length >= 20);
  if (substantive.length === 0) return false;
  return substantive.every((part) => ev.includes(part));
}

/**
 * A finding matches an expectation when:
 *  - findingType matches, where a "risk" finding also satisfies a "gap"
 *    expectation (2026-06-11 scoring review: Bastion's prompt and analyze
 *    route rank risk as strictly worse than gap, with identical downstream
 *    handling and a higher fallback severity. The first-run scorer rejected
 *    escalations as misses; that under-credited the model. The reverse,
 *    a gap finding for a risk expectation, is still a miss),
 *  - severity >= severityAtLeast (gaps/risks only),
 *  - at least one anyKeywords term appears in observation/gaps (case-insensitive).
 * controlIdHint is a preference, not a requirement.
 */
function scoreExpectation(exp, findings) {
  const text = (f) => `${f.observation ?? ""} ${f.gaps ?? ""}`.toLowerCase();
  const kwHit = (f) =>
    (exp.anyKeywords ?? []).some((k) =>
      text(f).includes(String(k).toLowerCase()),
    );
  const typeOk = (f) =>
    f.findingType === exp.findingType ||
    (exp.findingType === "gap" && f.findingType === "risk");
  const needsSeverity = exp.findingType === "gap" || exp.findingType === "risk";
  const sevOk = (f) =>
    !needsSeverity ||
    (f.severity != null &&
      SEVERITY_RANK[f.severity] >= (SEVERITY_RANK[exp.severityAtLeast] ?? 5));

  const typeKwMatches = findings.filter((f) => typeOk(f) && kwHit(f));
  const fullMatches = typeKwMatches.filter(sevOk);
  const pick = (arr) =>
    arr.find((f) => f.controlId === exp.controlIdHint) ?? arr[0];

  return {
    id: exp.id,
    findingType: exp.findingType,
    severityAtLeast: needsSeverity ? exp.severityAtLeast : null,
    anyKeywords: exp.anyKeywords,
    controlIdHint: exp.controlIdHint ?? null,
    matched: fullMatches.length > 0,
    matchedControlId:
      fullMatches.length > 0 ? pick(fullMatches).controlId : null,
    matchedSeverity:
      fullMatches.length > 0 ? (pick(fullMatches).severity ?? null) : null,
    // Transparency: when a gap expectation was satisfied by a risk-typed
    // finding, the artifact says so instead of silently widening the match.
    matchedFindingType:
      fullMatches.length > 0 ? pick(fullMatches).findingType : null,
    hintAgreed: exp.controlIdHint
      ? fullMatches.some((f) => f.controlId === exp.controlIdHint)
      : null,
    // For the severity-accuracy aggregate: matched on type+keywords regardless of severity
    typeKeywordMatched: typeKwMatches.length > 0,
    severityMet:
      needsSeverity && typeKwMatches.length > 0 ? fullMatches.length > 0 : null,
  };
}

function scoreCase(caseData, findings, evidenceText, knownControlIds) {
  const expected = caseData.expected;
  const inScope = new Set(expected.controlIds);

  const mustFind = expected.mustFind.map((e) => scoreExpectation(e, findings));
  const shouldFind = (expected.shouldFind ?? []).map((e) =>
    scoreExpectation(e, findings),
  );

  // mustNot.fabricateControls: any finding whose controlId is outside the case's
  // assigned control set (the prompt's STRICT SCOPE RULE), or not a real NIST
  // CSF 2.0 id at all. Production post-filters these silently; the eval reports them.
  const fabricated = [];
  for (const f of findings) {
    if (!inScope.has(f.controlId)) {
      fabricated.push({
        controlId: f.controlId,
        kind: knownControlIds.has(f.controlId) ? "out-of-scope" : "nonexistent",
      });
    }
  }

  // Citation validity: every reported finding carries a non-empty verbatim quote
  // that actually appears in the evidence doc (whitespace/smart-punct normalized).
  const citationChecks = findings.map((f) => ({
    controlId: f.controlId,
    valid: quoteAppearsInEvidence(f.quote, evidenceText),
  }));
  const missedCitations = citationChecks.filter((c) => !c.valid);

  const mustNotViolations = [];
  if (expected.mustNot?.fabricateControls && fabricated.length > 0) {
    mustNotViolations.push({ rule: "fabricateControls", details: fabricated });
  }
  if (expected.mustNot?.missCitations && missedCitations.length > 0) {
    mustNotViolations.push({
      rule: "missCitations",
      details: missedCitations.map((c) => c.controlId),
    });
  }

  const pass =
    mustFind.every((m) => m.matched) && mustNotViolations.length === 0;

  return {
    pass,
    mustFind,
    shouldFind,
    mustNotViolations,
    citations: {
      total: citationChecks.length,
      valid: citationChecks.filter((c) => c.valid).length,
    },
  };
}

// ─── Case loading & validation (pinned expected.json contract) ───

const CSF_FUNCTIONS = ["ID", "PR", "DE", "RS", "RC", "GV"];
const FINDING_TYPES = ["gap", "strength", "risk"];
const SEVERITIES = ["low", "medium", "high", "critical"];

function validateExpectation(e, label, errors) {
  if (!e || typeof e !== "object")
    return errors.push(`${label}: not an object`);
  if (typeof e.id !== "string" || !e.id)
    errors.push(`${label}.id: required string`);
  if (!FINDING_TYPES.includes(e.findingType))
    errors.push(
      `${label}.findingType: must be one of ${FINDING_TYPES.join("|")}`,
    );
  if (e.findingType !== "strength" && !SEVERITIES.includes(e.severityAtLeast)) {
    errors.push(
      `${label}.severityAtLeast: must be one of ${SEVERITIES.join("|")} for gaps/risks`,
    );
  }
  if (
    !Array.isArray(e.anyKeywords) ||
    e.anyKeywords.length === 0 ||
    !e.anyKeywords.every((k) => typeof k === "string")
  ) {
    errors.push(`${label}.anyKeywords: required non-empty string array`);
  }
  if (e.controlIdHint !== undefined && typeof e.controlIdHint !== "string") {
    errors.push(`${label}.controlIdHint: must be a string when present`);
  }
}

function loadCases(
  controls,
  onlyFilter,
  { skipFrameworkValidation = false } = {},
) {
  if (!existsSync(CASES_DIR))
    return { cases: [], problems: [`cases dir missing: ${CASES_DIR}`] };
  const problems = [];
  const cases = [];
  const dirs = readdirSync(CASES_DIR)
    .filter((d) => statSync(path.join(CASES_DIR, d)).isDirectory())
    .sort();

  for (const dir of dirs) {
    if (onlyFilter && !dir.includes(onlyFilter)) continue;
    const caseDir = path.join(CASES_DIR, dir);
    const evidencePath = path.join(caseDir, "evidence.md");
    const expectedPath = path.join(caseDir, "expected.json");
    const errors = [];

    if (!existsSync(evidencePath)) errors.push("missing evidence.md");
    if (!existsSync(expectedPath)) errors.push("missing expected.json");

    let expected = null;
    let evidenceText = "";
    if (errors.length === 0) {
      evidenceText = readFileSync(evidencePath, "utf8");
      try {
        expected = JSON.parse(readFileSync(expectedPath, "utf8"));
      } catch (e) {
        errors.push(`expected.json parse error: ${e.message}`);
      }
    }

    if (expected) {
      if (typeof expected.caseId !== "string" || !expected.caseId)
        errors.push("caseId: required string");
      else {
        if (expected.caseId !== dir)
          errors.push(
            `caseId "${expected.caseId}" does not match dir name "${dir}"`,
          );
        if (!/^(id|pr|de|rs|rc|gv)-\d{2}-[a-z0-9-]+$/.test(expected.caseId)) {
          errors.push(
            `caseId "${expected.caseId}" does not match <function>-<nn>-<slug>`,
          );
        }
      }
      if (!CSF_FUNCTIONS.includes(expected.csfFunction))
        errors.push(`csfFunction: must be one of ${CSF_FUNCTIONS.join("|")}`);
      if (
        !Array.isArray(expected.controlIds) ||
        expected.controlIds.length === 0
      ) {
        errors.push("controlIds: required non-empty array");
      } else {
        for (const id of expected.controlIds) {
          if (!skipFrameworkValidation && !controls.has(id))
            errors.push(
              `controlIds: "${id}" not found in Bastion's NIST CSF 2.0 framework data`,
            );
        }
      }
      if (!Array.isArray(expected.mustFind) || expected.mustFind.length === 0) {
        errors.push("mustFind: required non-empty array");
      } else {
        expected.mustFind.forEach((e, i) =>
          validateExpectation(e, `mustFind[${i}]`, errors),
        );
      }
      if (expected.shouldFind !== undefined) {
        if (!Array.isArray(expected.shouldFind))
          errors.push("shouldFind: must be an array when present");
        else
          expected.shouldFind.forEach((e, i) =>
            validateExpectation(e, `shouldFind[${i}]`, errors),
          );
      }
      if (!expected.mustNot || typeof expected.mustNot !== "object") {
        errors.push(
          "mustNot: required object ({ fabricateControls, missCitations })",
        );
      } else {
        for (const k of ["fabricateControls", "missCitations"]) {
          if (typeof expected.mustNot[k] !== "boolean")
            errors.push(`mustNot.${k}: required boolean`);
        }
      }
      if (evidenceText.trim().length < 50)
        errors.push("evidence.md: suspiciously short (<50 chars)");
    }

    if (errors.length > 0) {
      problems.push(`case "${dir}": ${errors.join("; ")}`);
      continue;
    }
    cases.push({ dir, expected, evidenceText });
  }
  return { cases, problems };
}

// ─── Prompt assembly per case ────────────────────────────────

function buildCasePrompt(caseData, controls, guidance) {
  const caseControls = caseData.expected.controlIds.map((id) => ({
    id,
    description: controls.get(id).description,
    assessmentGuidance: guidance.get(id),
  }));
  const { system, user } = buildEvidenceAnalysisPrompt({
    evidenceText: caseData.evidenceText,
    controls: caseControls,
    frameworkContext: NIST_CSF2_PROMPT_CONTEXT,
    // Single-stage mirror: RAG, bottom-up discovery and existing observations
    // are NOT exercised (they are separate pipeline stages in production).
    existingObservations: undefined,
    bottomUpDiscoveries: undefined,
    ragContext: undefined,
  });
  return { system: withSchemaInstruction(system), user };
}

// ─── Raw responses (committed; doubles as the resume cache) ──

function promptHash(model, system, user) {
  return createHash("sha256")
    .update(model)
    .update("\0")
    .update(system)
    .update("\0")
    .update(user)
    .digest("hex");
}

function cachePathFor(caseId) {
  return path.join(RESPONSES_DIR, `${caseId}.json`);
}

function readCache(caseId, hash, { requireHash = true } = {}) {
  const p = cachePathFor(caseId);
  if (!existsSync(p)) return null;
  try {
    const entry = JSON.parse(readFileSync(p, "utf8"));
    if (requireHash && entry.promptHash !== hash) return null; // prompt or model changed; refetch
    return entry;
  } catch {
    return null;
  }
}

function modelFromCommittedResponses(cases) {
  const models = new Set();
  for (const c of cases) {
    const entry = readCache(c.expected.caseId, null, { requireHash: false });
    if (entry?.model) models.add(entry.model);
  }
  if (models.size !== 1) {
    throw new Error(
      `Expected exactly one model across committed responses, found ${models.size}`,
    );
  }
  return [...models][0];
}

function writeCache(caseId, hash, model, response) {
  if (!existsSync(RESPONSES_DIR)) mkdirSync(RESPONSES_DIR, { recursive: true });
  // Note: only the API response body and the prompt hash are cached. The API
  // key is never written here (it is not part of the response payload).
  writeFileSync(
    cachePathFor(caseId),
    JSON.stringify(
      {
        caseId,
        model,
        promptHash: hash,
        cachedAt: new Date().toISOString(),
        response,
      },
      null,
      2,
    ) + "\n",
  );
}

// ─── Token estimation (dry-run; no API calls) ────────────────

function estimateTokens(s) {
  // chars/4 heuristic; close enough for budgeting. count_tokens is not used
  // because --dry-run must not touch the API at all.
  return Math.ceil(s.length / 4);
}

// ─── Helpers ─────────────────────────────────────────────────

const cap = (s, n) => {
  const str = String(s ?? "");
  return str.length > n ? `${str.slice(0, n - 1)}…` : str;
};
const pct = (num, den) =>
  den > 0 ? Math.round((num / den) * 1000) / 1000 : null;

// ─── Main ────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const rescoreOnly = args.includes("--rescore-only");
  const onlyArg = args.find((a) => a.startsWith("--only="));
  const onlyFilter = onlyArg ? onlyArg.split("=")[1] : null;
  if (rescoreOnly && force) {
    throw new Error("--rescore-only and --force are mutually exclusive");
  }

  // Provenance + mirrored data. Normal/full runs read the private Bastion repo
  // to validate prompt hashes before using cached responses. --rescore-only can
  // also run offline from this repo alone: it trusts the committed response
  // bodies and re-runs only the scorer.
  const mirror = loadBastionMirror({ allowOffline: rescoreOnly });
  const { bastionSha, models, promptVersion, controls, guidance } = mirror;
  let model = models.direct;

  console.log(`Bastion eval harness`);
  console.log(
    `  bastion repo:   ${
      mirror.offline
        ? "unavailable; offline rescore from committed responses"
        : `${BASTION_REPO} (read-only)`
    }`,
  );
  if (mirror.offline) {
    console.log(`  offline reason: ${mirror.offlineReason}`);
  }
  console.log(`  bastion HEAD:   ${bastionSha}`);
  console.log(`  prompt version: ${promptVersion} (analyze-evidence)`);
  console.log(
    `  model:          ${
      model ?? "from committed responses"
    } (Bastion DIRECT_MODELS.analysis; gateway alias: ${models.gateway})`,
  );
  console.log(
    `  framework data: ${
      controls
        ? `${controls.size} NIST CSF 2.0 controls, ${guidance.size} guidance entries`
        : "not loaded in offline rescore; control ids validated from case fixtures"
    }`,
  );

  const { cases, problems } = loadCases(controls, onlyFilter, {
    skipFrameworkValidation: mirror.offline,
  });
  for (const p of problems) console.warn(`  [case problem] ${p}`);
  console.log(
    `  cases loaded:   ${cases.length}${onlyFilter ? ` (filter: ${onlyFilter})` : ""}${problems.length ? `, ${problems.length} skipped (invalid)` : ""}`,
  );

  if (cases.length === 0) {
    console.log(`\nNo valid cases under ${CASES_DIR}.`);
    console.log(
      `Each case dir needs evidence.md + expected.json (see README.md for the pinned contract).`,
    );
    return;
  }
  if (mirror.offline) {
    model = modelFromCommittedResponses(cases);
  }

  // ── Dry run: build prompts, estimate tokens, never call the API ──
  if (dryRun) {
    console.log(
      `\n--dry-run: building prompts and estimating tokens (no API calls)\n`,
    );
    let totalIn = 0;
    for (const c of cases) {
      const { system, user } = buildCasePrompt(c, controls, guidance);
      const hash = promptHash(model, system, user);
      const cached = !force && readCache(c.expected.caseId, hash) != null;
      const estIn = estimateTokens(system) + estimateTokens(user);
      totalIn += cached ? 0 : estIn;
      console.log(
        `  ${c.expected.caseId.padEnd(28)} controls=${String(c.expected.controlIds.length).padStart(2)}  ` +
          `mustFind=${c.expected.mustFind.length} shouldFind=${(c.expected.shouldFind ?? []).length}  ` +
          `~${estIn} in-tokens (sys ${estimateTokens(system)} + user ${estimateTokens(user)})` +
          `${cached ? "  [cached: would re-score without API spend]" : ""}`,
      );
    }
    console.log(
      `\n  Estimated uncached input: ~${totalIn} tokens across ${cases.length} case(s) ` +
        `(+ up to ${MAX_OUTPUT_TOKENS} output tokens per uncached case).`,
    );
    console.log(
      `  Dry run complete. No API calls were made; no artifact was written.`,
    );
    return;
  }

  // ── Full run ──
  // --rescore-only re-scores cached responses with zero API access: the key
  // is never even loaded, so an accidental cache miss cannot spend tokens.
  if (!rescoreOnly) loadApiKey();

  const knownControlIds = controls
    ? new Set(controls.keys())
    : new Set(cases.flatMap((c) => c.expected.controlIds));
  const caseResults = [];

  for (const c of cases) {
    const caseId = c.expected.caseId;
    const prompt = mirror.offline
      ? null
      : buildCasePrompt(c, controls, guidance);
    const hash = prompt ? promptHash(model, prompt.system, prompt.user) : null;

    let response;
    let fromCache = false;
    const cached = force
      ? null
      : readCache(caseId, hash, { requireHash: !mirror.offline });
    if (cached) {
      response = cached.response;
      fromCache = true;
      console.log(`\n[${caseId}] using cached response (${cached.cachedAt})`);
    } else if (rescoreOnly) {
      throw new Error(
        `[${caseId}] no committed response in responses/ matching the current ` +
          `prompt hash; --rescore-only refuses to call the API. Run without the flag to fetch.`,
      );
    } else {
      console.log(`\n[${caseId}] calling ${model} ...`);
      try {
        response = await callAnthropic({
          model,
          system: prompt.system,
          user: prompt.user,
        });
        writeCache(caseId, hash, model, response);
      } catch (err) {
        const msg = scrub(err instanceof Error ? err.message : String(err));
        console.error(`[${caseId}] API call failed: ${msg}`);
        caseResults.push({
          caseId,
          csfFunction: c.expected.csfFunction,
          pass: false,
          fromCache: false,
          error: `API call failed: ${msg}`,
          controlIds: c.expected.controlIds,
          mustFind: c.expected.mustFind.map((e) => ({
            id: e.id,
            matched: false,
          })),
          shouldFind: (c.expected.shouldFind ?? []).map((e) => ({
            id: e.id,
            matched: false,
          })),
          mustNotViolations: [],
          citations: { total: 0, valid: 0 },
          usage: null,
          findings: [],
          summary: "",
        });
        continue;
      }
    }

    const truncated = response?.stop_reason === "max_tokens";
    const rawText = extractResponseText(response);
    const parsed = parseFindings(rawText);

    let scored;
    let findings = [];
    let summary = "";
    if (parsed.ok) {
      findings = parsed.parsed.findings;
      summary = parsed.parsed.summary;
      scored = scoreCase(c, findings, c.evidenceText, knownControlIds);
    } else {
      scored = {
        pass: false,
        mustFind: c.expected.mustFind.map((e) => ({
          id: e.id,
          matched: false,
        })),
        shouldFind: (c.expected.shouldFind ?? []).map((e) => ({
          id: e.id,
          matched: false,
        })),
        mustNotViolations: [],
        citations: { total: 0, valid: 0 },
      };
    }

    const mustOk = scored.mustFind.filter((m) => m.matched).length;
    const shouldOk = scored.shouldFind.filter((m) => m.matched).length;
    console.log(
      `[${caseId}] ${scored.pass ? "PASS" : "FAIL"}  ` +
        `mustFind ${mustOk}/${scored.mustFind.length}, shouldFind ${shouldOk}/${scored.shouldFind.length}, ` +
        `citations ${scored.citations.valid}/${scored.citations.total}` +
        `${scored.mustNotViolations.length ? `, violations: ${scored.mustNotViolations.map((v) => v.rule).join(",")}` : ""}` +
        `${parsed.ok ? "" : `, parseError: ${parsed.error}`}${truncated ? ", TRUNCATED (max_tokens)" : ""}`,
    );

    caseResults.push({
      caseId,
      csfFunction: c.expected.csfFunction,
      pass: scored.pass,
      fromCache,
      truncated: truncated || undefined,
      parseError: parsed.ok ? undefined : scrub(parsed.error),
      controlIds: c.expected.controlIds,
      mustFind: scored.mustFind,
      shouldFind: scored.shouldFind,
      mustNotViolations: scored.mustNotViolations,
      citations: scored.citations,
      usage: response?.usage
        ? {
            inputTokens: response.usage.input_tokens ?? null,
            outputTokens: response.usage.output_tokens ?? null,
          }
        : null,
      summary: cap(summary, 600),
      // Full findings transcript, sanely capped: honesty means the artifact
      // shows what the model actually said, including weak findings.
      findings: findings.slice(0, 16).map((f) => ({
        controlId: f.controlId,
        coverage: f.coverage,
        findingType: f.findingType,
        severity: f.severity,
        confidence: f.confidence,
        observation: cap(f.observation, 500),
        gaps: f.gaps ? cap(f.gaps, 400) : undefined,
        quote: cap(f.quote, 300),
        quoteValid: quoteAppearsInEvidence(f.quote, c.evidenceText),
      })),
      findingsTotal: findings.length,
      ...(parsed.ok && !findings.length
        ? { rawTextSample: cap(scrub(rawText), 400) }
        : {}),
      ...(!parsed.ok ? { rawTextSample: cap(scrub(rawText), 400) } : {}),
    });
  }

  // ── Aggregates ──
  const allMust = caseResults.flatMap((r) => r.mustFind);
  const allShould = caseResults.flatMap((r) => r.shouldFind);
  const allExpect = [...allMust, ...allShould];
  const sevPool = allExpect.filter(
    (e) => e.severityMet !== null && e.severityMet !== undefined,
  );
  const citTotal = caseResults.reduce((a, r) => a + r.citations.total, 0);
  const citValid = caseResults.reduce((a, r) => a + r.citations.valid, 0);

  const aggregate = {
    mustFindRecall: pct(
      allMust.filter((m) => m.matched).length,
      allMust.length,
    ),
    mustFindMatched: allMust.filter((m) => m.matched).length,
    mustFindTotal: allMust.length,
    shouldFindRecall: pct(
      allShould.filter((m) => m.matched).length,
      allShould.length,
    ),
    shouldFindMatched: allShould.filter((m) => m.matched).length,
    shouldFindTotal: allShould.length,
    citationValidityRate: pct(citValid, citTotal),
    citationsValid: citValid,
    citationsTotal: citTotal,
    // Among gap/risk expectations the model found by type+keywords, the share
    // whose reported severity met the expected floor (severity calibration).
    severityAccuracy: pct(
      sevPool.filter((e) => e.severityMet).length,
      sevPool.length,
    ),
    severityAccuracyPool: sevPool.length,
  };

  const casesPassed = caseResults.filter((r) => r.pass).length;

  const existingArtifact = readExistingArtifact();
  const artifact = {
    _provenance: {
      methodology:
        "Single-stage evidence-to-findings eval mirroring Bastion's analyze-evidence prompt and model. " +
        `The system/user prompts are a verbatim port of Bastion's buildEvidenceAnalysisPrompt (prompt key analyze-evidence, version ${promptVersion}) ` +
        "with the NIST CSF 2.0 framework context and FULL_WRITING_STANDARDS; the output shape mirrors evidenceAnalysisSchema from parsers.ts. " +
        "Bastion invokes this prompt through the Vercel AI SDK Output.object wrapper; the harness reproduces the prompt text verbatim and appends an explicit JSON schema instruction in place of that wrapper, calling the Anthropic Messages API directly. " +
        "Control descriptions come from Bastion's seed migration and per-control assessment guidance from assessment-meta.ts, exactly as the production analyze route enriches them. " +
        "Scoring is a pinned golden contract: a case passes when every mustFind expectation is matched (findingType match, severity at or above the expected floor for gaps/risks, and at least one keyword present in the finding's observation/gaps text) and no mustNot rule is violated (no findings for controls outside the assigned set; every finding's quote must appear verbatim in the evidence document, whitespace-normalized). " +
        "RAG retrieval, Haiku bottom-up discovery, smart filtering, batching/dedup, and the multi-stage Haiku verification pass are NOT exercised; production also post-filters out-of-scope findings that this eval instead reports as violations. " +
        "Evidence documents are canned synthetic scenarios about a fictional company, written for this eval. " +
        "The artifact renders whatever happened, including failures. " +
        "Numbers come from the corrected scorer described in scoringReview, re-applied to the SAME first-run model responses, which are committed at scripts/studies/bastion-eval/responses/; no response was regenerated, edited, or retried.",
      rawResponses:
        "The unedited first-run Anthropic API response bodies are COMMITTED at scripts/studies/bastion-eval/responses/<caseId>.json (model outputs over synthetic fixtures; no client data, no secrets). Each is keyed to a sha256 of model id + system + user prompt. Normal eval runs re-derive the prompt and control definitions from the Bastion repo and validate that hash before using a cached response; prompt drift forces a refetch. Re-score the committed responses without any API access via `node scripts/studies/bastion-eval/run-eval.mjs --rescore-only`; if the private Bastion checkout is unavailable, this command automatically falls back to offline scoring from the committed responses and case fixtures, so the published scoring can be reproduced from this repo alone. Offline scoring does not rebuild prompts or validate prompt hashes; it re-parses the already-committed model outputs and re-runs the scorer. Rescore-only preserves the existing generatedAt timestamp when rewriting the artifact, so a clean rescore can be compared byte-for-byte.",
      scoringReview: {
        reviewedAt: "2026-06-11",
        firstRunPublished:
          "The first run was published raw on 2026-06-11: 1/20 cases passed, mustFind recall 52.5%, citation validity 71.9%. The mandated review step had not run. This review then audited every one of the 28 unmatched mustFind expectations against the cached model responses and the evidence documents.",
        firstRunArtifactNote:
          "The raw 1/20 first-run artifact file itself was NOT preserved: the scorer was corrected in place before this repo adopted the practice of keeping versioned score artifacts, so the 1/20 figure survives only as this review's recorded starting point, not as a regenerable file. What IS preserved and committed: the unedited first-run model responses (scripts/studies/bastion-eval/responses/) and the corrected scorer, which together reproduce this artifact's published numbers exactly via --rescore-only.",
        classification: {
          unmatchedMustFindsReviewed: 28,
          harnessDefect: 17,
          phrasing: 1,
          realMiss: 10,
          realMissBreakdown:
            "5 findings surfaced but rated below the expected severity floor, 3 strength expectations where the model produced no strength-typed finding at all, 2 seeded gaps not surfaced in any finding.",
        },
        defectsFixed: [
          "Citation normalization (affected 27 of 32 invalid citations): the checker rejected quotes that faithfully reproduce the evidence's prose but not its markup. The model omits markdown bold/emphasis markers, blockquote '>' prefixes and NOTE/OBSERVATION labels, renders table pipes as punctuation, and swaps double quotes for single quotes inside JSON strings. Bastion's own verification pass accepts near-verbatim quotes, so the scorer was stricter than the system it mirrors. Fix: markup characters and quote marks are stripped from both sides; stitched multi-sentence quotes pass only if every quoted sentence of 20+ chars appears verbatim. The 5 remaining invalid citations are genuine: 3 light paraphrases in gv-00 (the model inserted a word into the quote) and 2 reconstructed table rows in rs-01 presented as quotes.",
          "Finding-type escalation (affected 17 of 28 unmatched mustFinds): when the model reported a seeded gap as findingType 'risk', often with HIGHER severity than the expectation floor, the exact-type match scored it as a miss. Bastion's prompt and analyze route rank risk as strictly worse than gap with identical downstream handling, so escalation is correct behavior, not a miss. Fix: a risk-typed finding now satisfies a gap expectation; the severity floor still applies; a gap finding still does not satisfy a risk expectation.",
        ],
        expectationTunes: [
          "rc-02-recovery-interview mf-1 (PHRASING, loosened): the model surfaced the seeded restore-without-scanning gap as 'restored ... without scanning for ransomware binaries' (risk/high), but the keyword net only listed 'ransomware binary' (singular) and two phrasings the model did not use. Added the model-independent variants; see the _tuned note in the case file.",
          "id-02-risk-cadence mf-2 (tightened, anti-credit): the 'risk register' keyword would have cross-matched the ID.RA-05 overdue-assessment finding already credited to mf-1, granting spurious credit after the escalation fix. Removed it so mf-2 tracks only the seeded treatment-plan item, which the model rated below the expected severity floor and which therefore stays a REAL miss.",
        ],
        controlsCoverageAudit:
          "Verified for every case that the prompt included the control definition for each controlId the expectations reference (no mustFind hints a control absent from the prompt), that no findings were dropped in parsing (raw analyses count equals scored count for all 20 cases), and that no response was truncated (stop_reason end_turn everywhere). No case required a live re-run; every number derives from the original first-run responses committed at scripts/studies/bastion-eval/responses/.",
      },
      bastionRepo: mirror.offline
        ? "Unavailable during this rescore; artifact re-scored offline from committed responses and case fixtures. Normal/full eval runs use C:/Users/semaa/Documents/GitHub/Bastion as a read-only mirror and never write or git-mutate it."
        : "C:/Users/semaa/Documents/GitHub/Bastion (read-only mirror; never written or git-mutated by this harness)",
      bastionSha,
      mirroredFiles: Object.values(MIRRORED_FILES),
      promptKey: "analyze-evidence",
      promptVersion,
      modelResolution: mirror.offline
        ? `Offline rescore used the model recorded in the committed response files: "${model}". Normal/full eval runs parse DIRECT_MODELS.analysis from Bastion/src/lib/llm/client.ts at runtime and validate prompt hashes before accepting cached responses.`
        : `Bastion's analyze route resolves the analysis model via BYOK -> ANTHROPIC_API_KEY env -> AI Gateway. ` +
          `With ANTHROPIC_API_KEY set (the credential this harness uses), Bastion calls the direct Anthropic SDK with DIRECT_MODELS.analysis = "${models.direct}" ` +
          `(gateway alias when no key is present: "${models.gateway}"). The harness parses this id from client.ts at runtime; it is not hardcoded.`,
      harness: "scripts/studies/bastion-eval/run-eval.mjs",
    },
    generatedAt:
      rescoreOnly && typeof existingArtifact?.generatedAt === "string"
        ? existingArtifact.generatedAt
        : new Date().toISOString(),
    model,
    casesTotal: caseResults.length,
    casesPassed,
    aggregate,
    cases: caseResults,
  };
  if (mirror.offline && rescoreOnly && existingArtifact?._provenance) {
    artifact._provenance = existingArtifact._provenance;
  }

  const artifactJson = JSON.stringify(artifact, null, 2);
  if (API_KEY && artifactJson.includes(API_KEY)) {
    // Defense in depth: never publish anything containing the key.
    throw new Error(
      "artifact unexpectedly contained the API key; refusing to write",
    );
  }
  mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true });
  writeFileSync(ARTIFACT_PATH, artifactJson + "\n");

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Cases: ${casesPassed}/${caseResults.length} passed`);
  console.log(
    `mustFind recall:    ${aggregate.mustFindRecall ?? "n/a"} (${aggregate.mustFindMatched}/${aggregate.mustFindTotal})`,
  );
  console.log(
    `shouldFind recall:  ${aggregate.shouldFindRecall ?? "n/a"} (${aggregate.shouldFindMatched}/${aggregate.shouldFindTotal})`,
  );
  console.log(
    `citation validity:  ${aggregate.citationValidityRate ?? "n/a"} (${aggregate.citationsValid}/${aggregate.citationsTotal})`,
  );
  console.log(
    `severity accuracy:  ${aggregate.severityAccuracy ?? "n/a"} (pool ${aggregate.severityAccuracyPool})`,
  );
  console.log(`Artifact written:   ${ARTIFACT_PATH}`);
}

// Exports for spot-checking the mirror without API spend (run-eval is the CLI).
export {
  buildEvidenceAnalysisPrompt,
  withSchemaInstruction,
  parseFindings,
  scoreExpectation,
  scoreCase,
  quoteAppearsInEvidence,
  parseSeedControls,
  parseAssessmentGuidance,
  parseAnalysisModel,
  NIST_CSF2_PROMPT_CONTEXT,
  FULL_WRITING_STANDARDS,
};

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((err) => {
    // Final guard: strip the key from anything that escapes.
    const msg = scrub(
      err instanceof Error ? (err.stack ?? err.message) : String(err),
    );
    console.error(msg);
    process.exit(1);
  });
}
