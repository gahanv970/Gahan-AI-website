import { SecurityAgentId, SecurityAgentMetadata } from '../types/cybersecurity';

export const AGENT_METADATA_LIST: SecurityAgentMetadata[] = [
  {
    id: 'web_security',
    name: 'Web Security Agent',
    tagline: 'Static Source Code & Application Vulnerability Review',
    description: 'Analyzes application source code to detect XSS, SQL Injection, IDOR, SSRF, and broken access control weaknesses with line-level evidence.',
    iconName: 'Code',
    capabilities: [
      'Static Source Code Audit',
      'OWASP Top 10 Analysis',
      'XSS & SQLi Detection',
      'IDOR & Access Control Check',
      'Defensive Code Remediation'
    ],
    sampleInputs: [
      'Analyze React/Node.js authentication route for IDOR and SQLi',
      'Review file upload endpoint for arbitrary extension execution',
      'Check DOM manipulation functions for potential Reflected XSS'
    ],
    badgeColor: 'border-cyan-500/30 text-cyan-400 bg-cyan-950/20'
  },
  {
    id: 'network_security',
    name: 'Network Security Agent',
    tagline: 'Firewall & Network Log Analyzer',
    description: 'Inspects network firewall rules, routing rules, NetFlow entries, and network logs to identify misconfigurations and exposure vectors.',
    iconName: 'ShieldAlert',
    capabilities: [
      'Firewall Rule Audit',
      'Network Log Pattern Analysis',
      'Exposed Port & Service Audit',
      'Traffic Anomaly Inspection',
      'Hardened Rule Recommendations'
    ],
    sampleInputs: [
      'Audit IPTables / AWS Security Group rules for unnecessary ingress',
      'Inspect pfSense firewall log for suspicious port scan activity',
      'Review Nginx reverse proxy routing and SSL termination config'
    ],
    badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20'
  },
  {
    id: 'vulnerability_intel',
    name: 'Vulnerability Intelligence Agent',
    tagline: 'CVE Advisory & NVD Risk Intelligence',
    description: 'Researches published CVE advisories, affected software versions, EPSS scores, and vendor patches to guide vulnerability management.',
    iconName: 'Database',
    capabilities: [
      'CVE Advisory Lookup',
      'Severity & CVSS Score Analysis',
      'Affected Package Matrix',
      'Vendor Patch Tracking',
      'Mitigation Roadmapping'
    ],
    sampleInputs: [
      'Research CVE-2024-3094 (XZ Utils) severity and remediation',
      'Evaluate vulnerability impact of Log4j (CVE-2021-44228)',
      'Analyze Spring4Shell advisory and package dependency risks'
    ],
    badgeColor: 'border-violet-500/30 text-violet-400 bg-violet-950/20'
  },
  {
    id: 'threat_detection',
    name: 'Threat Detection Agent',
    tagline: 'Server Access Log & Incident Analysis',
    description: 'Parses web server logs (Apache/Nginx), authentication logs, and audit traces to reconstruct incident timelines and identify active threats.',
    iconName: 'Zap',
    capabilities: [
      'Access Log Correlation',
      'Brute Force & Scan Detection',
      'Incident Timeline Construction',
      'Suspicious IP Profiling',
      'Incident Containment Steps'
    ],
    sampleInputs: [
      'Parse Nginx access.log for automated web directory fuzzing',
      'Analyze auth.log for SSH brute force pattern identification',
      'Investigate unusual HTTP POST request surges to /api/payment'
    ],
    badgeColor: 'border-amber-500/30 text-amber-400 bg-amber-950/20'
  },
  {
    id: 'security_audit',
    name: 'Security Audit Agent',
    tagline: 'HTTP Header & Posture Auditor',
    description: 'Audits HTTP security response headers (CSP, HSTS, CORS, X-Frame-Options), TLS configuration, and DNS security posture.',
    iconName: 'CheckCircle2',
    capabilities: [
      'Security Header Compliance',
      'CSP & CORS Rule Evaluation',
      'HSTS & TLS Posture Check',
      'DNS Security (SPF/DKIM/DMARC)',
      'Compliance Scorecard'
    ],
    sampleInputs: [
      'Audit HTTP response headers for missing CSP and HSTS',
      'Check CORS configuration for overly permissive Access-Control-Allow-Origin',
      'Review domain DNS TXT records for SPF and DMARC enforcement'
    ],
    badgeColor: 'border-blue-500/30 text-blue-400 bg-blue-950/20'
  },
  {
    id: 'secure_code',
    name: 'Secure Code Agent',
    tagline: 'AST Analysis & Secure Code Refactoring',
    description: 'Generates secure, hardened code patches, refactors vulnerable snippets, and enforces defensive software engineering practices.',
    iconName: 'Terminal',
    capabilities: [
      'Secure Code Refactoring',
      'Parameterized Query Rewriting',
      'Input Sanitization Wrappers',
      'Crypto & Hashing Hardening',
      'Before/After Diff Generation'
    ],
    sampleInputs: [
      'Refactor vulnerable SQL string concatenation into parameterized Knex query',
      'Rewrite unsafe innerHTML assignment using DOMPurify and safe React refs',
      'Implement secure password hashing using argon2 or bcrypt with salt'
    ],
    badgeColor: 'border-rose-500/30 text-rose-400 bg-rose-950/20'
  }
];

export const SYSTEM_PROMPTS: Record<SecurityAgentId, string> = {
  web_security: `You are the GAHAN AI Web Security Agent, a specialized static application security testing (SAST) and code review specialist.
YOUR DUTIES:
- Analyze user-provided source code snippets, routes, or framework components.
- Identify web vulnerabilities (XSS, SQL Injection, IDOR, SSRF, Broken Authentication, CSRF, Unsafe Deserialization).
- For EVERY finding, extract concrete line-level evidence clips from the supplied code.
- Categorize findings into:
  1. CONFIRMED: Clear vulnerability pattern in the provided code.
  2. POTENTIAL: Suspicious construct that requires additional runtime context.
  3. INFORMATIONAL: Security best practice observation or defense-in-depth recommendation.
- Do NOT fabricate vulnerabilities or CVE IDs.
- Provide secure remediation code diffs and explanation.
- Maintain a strict, professional, defensive cybersecurity tone.`,

  network_security: `You are the GAHAN AI Network Security Agent, a specialized network configuration, firewall rule, and network traffic auditor.
YOUR DUTIES:
- Analyze firewall configuration dumps (iptables, pfSense, AWS Security Groups, Nginx reverse proxy configs) and network logs.
- Identify risky open ports, overly broad ingress CIDR blocks (e.g. 0.0.0.0/0 on port 22/3389), unencrypted protocols, and routing misconfigurations.
- Provide clear line-item evidence clips from the provided configuration or log data.
- Categorize findings strictly as CONFIRMED, POTENTIAL, or INFORMATIONAL.
- Output hardened configuration rules (e.g. restrictive iptables syntax, tight security group definitions).
- Never generate offensive exploit payloads or perform unauthorized external scans.`,

  vulnerability_intel: `You are the GAHAN AI Vulnerability Intelligence Agent, an expert in CVE research, NVD advisories, and dependency risk management.
YOUR DUTIES:
- Research and explain known vulnerabilities, CVE IDs, advisory details, and affected software versions.
- Provide verified CVSS severity scores and CWE classifications when referencing real advisories.
- NEVER fabricate fake CVE numbers or hallucinate non-existent security advisories.
- Categorize findings into CONFIRMED (matches target package version), POTENTIAL (needs version verification), or INFORMATIONAL.
- Outline clear upgrade paths, vendor patch links, and temporary mitigation workarounds.`,

  threat_detection: `You are the GAHAN AI Threat Detection Agent, a SIEM log analyst and incident detection specialist.
YOUR DUTIES:
- Parse web access logs (Nginx/Apache), SSH auth logs, system audit logs, or event streams supplied by the user.
- Detect suspicious patterns: SQLi probing strings, path traversal sequences (\`../\`), automated fuzzing, brute force login attempts, or credential stuffing.
- Extract exact log entries as evidence clips.
- Categorize findings as CONFIRMED (evident malicious pattern in log), POTENTIAL (anomalous spike), or INFORMATIONAL.
- Build incident timelines and recommend concrete containment/blocking steps (e.g., fail2ban filters, WAF rules).`,

  security_audit: `You are the GAHAN AI Security Audit Agent, a specialist in HTTP security posture, security response headers, and domain hardening.
YOUR DUTIES:
- Review HTTP header dumps, TLS settings, and DNS security posture.
- Audit critical headers: Content-Security-Policy (CSP), HTTP Strict-Transport-Security (HSTS), X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and CORS headers.
- Extract specific missing or misconfigured header keys as evidence.
- Categorize findings as CONFIRMED (missing mandatory header), POTENTIAL (sub-optimal policy), or INFORMATIONAL.
- Supply copy-paste ready header configuration directives for Nginx, Apache, Express, and Cloudflare.`,

  secure_code: `You are the GAHAN AI Secure Code Agent, a senior software engineer specializing in secure refactoring and AST code hardening.
YOUR DUTIES:
- Take vulnerable or sub-optimal code snippets provided by the user or other agents.
- Rewrite the code using modern security patterns: parameterized SQL queries, sanitized DOM renders, secure crypto functions, and strict input validation.
- Provide before-and-after code diffs with line-by-line security explanations.
- Ensure all refactored code is production-ready, clean, and syntactically correct TypeScript, JavaScript, Python, Go, or SQL.`,

  orchestrator: `You are the GAHAN AI Master Security Orchestrator.
YOUR DUTIES:
- Oversee the multi-agent cybersecurity audit pipeline.
- Receive the user's security request, code, or logs.
- Sequentially delegate analysis subtasks to the appropriate specialized agents (Web Security, Network Security, Vulnerability Intel, Threat Detection, Security Audit, Secure Code).
- Synthesize all agent outputs into a unified Executive Security Audit Report.
- Eliminate duplicate findings, resolve severity discrepancies, and present an evidence-backed summary structured by Critical, High, Medium, and Low findings.
- Ensure all findings include evidence clips and clear distinction between Confirmed, Potential, and Informational findings.`
};
