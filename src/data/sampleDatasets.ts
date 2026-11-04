import {
  SyntheticSecurityDataset,
  DatasetValidationResult,
  SecurityAgentId,
} from '../types/cybersecurity.js';

/**
 * 1. Web Security Dataset: Simulated SQLi, XSS, and IDOR
 */
export const WEB_SECURITY_DATASET: SyntheticSecurityDataset = {
  id: 'dataset-web-owasp-top3',
  agentId: 'web_security',
  title: 'Synthetic Banking Portal & Profile API',
  tagline: 'Simulated SQL Injection, DOM XSS, and Insecure Direct Object References',
  description:
    'Synthetic Node.js / Express source code containing realistic vulnerable patterns across OWASP Top 10 categories for static code analysis benchmarking.',
  category: 'web',
  tags: ['OWASP-Top10', 'SQLi', 'XSS', 'IDOR', 'Express', 'Static-Analysis'],
  inputs: {
    userPrompt:
      'Perform a defensive application security review of the account lookup and statement download endpoints. Identify injection vectors and broken access control.',
    sourceCode: `import express from 'express';
import { db } from './mockDatabase';

const router = express.Router();

// 1. Account authentication & lookup endpoint
router.post('/api/v1/auth/login', async (req, res) => {
  const { username, passwordHash } = req.body;
  // Vulnerable SQL concatenation
  const query = "SELECT id, email, role, balance FROM accounts WHERE username = '" + username + "' AND password_hash = '" + passwordHash + "';";
  const account = await db.rawQuery(query);
  if (!account) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: 'mock-jwt-token', account });
});

// 2. User profile rendering with client bio
router.get('/api/v1/profile/:username', async (req, res) => {
  const profile = await db.getProfile(req.params.username);
  // Unsanitized bio passed to frontend dangerouslySetInnerHTML
  res.send(\`
    <div class="user-card">
      <h2>\${profile.displayName}</h2>
      <div class="bio" id="user-bio">\${profile.bio}</div>
    </div>
  \`);
});

// 3. Statement retrieval endpoint
router.get('/api/v1/statements/:accountNumber', async (req, res) => {
  const { accountNumber } = req.params;
  // Missing session user authorization check (IDOR)
  const statement = await db.getStatementByAccount(accountNumber);
  res.json({ accountNumber, statement });
});

export default router;`,
  },
  expectedFindings: [
    {
      id: 'EXP-WEB-001',
      agentId: 'web_security',
      title: 'SQL Injection in Account Authentication Endpoint',
      category: 'confirmed',
      severity: 'critical',
      cweId: 'CWE-89',
      cvssScore: 9.8,
      description:
        'Unsanitized user-controlled string concatenation in raw SQL query string allows complete authentication bypass and unauthorized database exposure.',
      evidence: [
        {
          sourceType: 'code',
          location: 'router.post("/api/v1/auth/login")',
          rawExcerpt:
            'const query = "SELECT id, email, role, balance FROM accounts WHERE username = \'" + username + "\' AND password_hash = \'" + passwordHash + "\';";',
          explanation:
            'Direct string concatenation of username into query structure without parameter binding.',
        },
      ],
      remediation: {
        explanation: 'Replace raw string concatenation with parameterized query placeholders.',
        suggestedCode:
          'const query = "SELECT id, email, role, balance FROM accounts WHERE username = ? AND password_hash = ?;";\nconst account = await db.query(query, [username, passwordHash]);',
        preventionSteps: [
          'Enforce parameterized SQL prepared statements',
          'Use an ORM with automatic query escaping',
        ],
      },
    },
    {
      id: 'EXP-WEB-002',
      agentId: 'web_security',
      title: 'Insecure Direct Object Reference (IDOR) on Financial Statements',
      category: 'confirmed',
      severity: 'high',
      cweId: 'CWE-639',
      cvssScore: 8.6,
      description:
        'The statement download endpoint relies solely on the route parameter accountNumber without verifying if the authenticated user owns or is authorized to view that account.',
      evidence: [
        {
          sourceType: 'code',
          location: 'router.get("/api/v1/statements/:accountNumber")',
          rawExcerpt:
            'const { accountNumber } = req.params;\nconst statement = await db.getStatementByAccount(accountNumber);',
          explanation:
            'Account number is consumed directly from URL params without cross-referencing req.session.userId.',
        },
      ],
      remediation: {
        explanation: 'Enforce ownership verification against authenticated session identity.',
        suggestedCode:
          'if (req.user.accountNumber !== req.params.accountNumber && req.user.role !== "admin") {\n  return res.status(403).json({ error: "Access denied: Unauthorized account" });\n}',
        preventionSteps: [
          'Implement server-side object ownership verification',
          'Use indirect randomized references (UUIDv4) rather than sequential IDs',
        ],
      },
    },
    {
      id: 'EXP-WEB-003',
      agentId: 'web_security',
      title: 'Cross-Site Scripting (XSS) via Unsanitized Bio Interpolation',
      category: 'confirmed',
      severity: 'high',
      cweId: 'CWE-79',
      cvssScore: 8.2,
      description:
        'Stored user bio is interpolated directly into HTML output without escaping or sanitization, allowing arbitrary script execution in victim browsers.',
      evidence: [
        {
          sourceType: 'code',
          location: 'router.get("/api/v1/profile/:username")',
          rawExcerpt: '<div class="bio" id="user-bio">${profile.bio}</div>',
          explanation:
            'Unescaped variable interpolation directly into raw HTML response payload.',
        },
      ],
      remediation: {
        explanation: 'Sanitize user HTML with DOMPurify or encode all HTML special characters.',
        suggestedCode:
          'import DOMPurify from "isomorphic-dompurify";\nconst cleanBio = DOMPurify.sanitize(profile.bio);',
        preventionSteps: [
          'Use contextual HTML auto-escaping template engines',
          'Deploy a strict Content-Security-Policy (CSP) header',
        ],
      },
    },
  ],
  demoSimulatedResult: {
    id: 'DEMO-SIM-WEB-001',
    agentId: 'web_security',
    timestamp: '2026-11-03T12:00:00.000Z',
    providerUsed: 'simulated',
    scopeValid: true,
    rawText: `[DEMO / SIMULATED BENCHMARK RESULT - NO EXTERNAL OR DISRUPTIVE ACTIONS]
STATIC APPLICATION SECURITY REVIEW (WEB SECURITY AGENT)
Audited Asset: Synthetic Banking Portal & Profile API

Findings Summary:
1. [CONFIRMED CRITICAL] SQL Injection in /api/v1/auth/login (CWE-89, CVSS 9.8)
2. [CONFIRMED HIGH] Insecure Direct Object Reference in /api/v1/statements/:accountNumber (CWE-639, CVSS 8.6)
3. [CONFIRMED HIGH] Cross-Site Scripting (XSS) in /api/v1/profile/:username (CWE-79, CVSS 8.2)

All 3 vulnerabilities verified with source code line evidence.`,
    findings: [], // Populated dynamically with expectedFindings
  },
  metadata: {
    isSynthetic: true,
    license: 'MIT / Defensive Benchmark Suite',
    containsCredentials: false,
    version: '1.0.0',
    safeForDemo: true,
  },
};

/**
 * 2. Network Security Dataset: Firewall Rules & Anomaly Telemetry
 */
export const NETWORK_SECURITY_DATASET: SyntheticSecurityDataset = {
  id: 'dataset-net-firewall-anomalies',
  agentId: 'network_security',
  title: 'Synthetic DMZ Gateway & Firewall Posture',
  tagline: 'Simulated Global SSH Exposure, Cleartext FTP, and Egress Anomalies',
  description:
    'Synthetic iptables rules and perimeter connection logs demonstrating dangerous exposure patterns and non-standard egress port communications.',
  category: 'network',
  tags: ['Firewall', 'iptables', 'Network-Security', 'Port-22', 'DMZ', 'Egress'],
  inputs: {
    userPrompt:
      'Review perimeter firewall rules and egress connection records for ingress exposure vulnerabilities and traffic anomalies.',
    logs: `# --- Perimeter iptables rules (DMZ Gateway) ---
*filter
:INPUT DROP [0:0]
:FORWARD DROP [0:0]
:OUTPUT ACCEPT [0:0]

# Established traffic
-A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Insecure rules:
-A INPUT -p tcp --dport 22 -s 0.0.0.0/0 -j ACCEPT -m comment --comment "Global SSH access"
-A INPUT -p tcp --dport 21 -s 0.0.0.0/0 -j ACCEPT -m comment --comment "Legacy FTP cleartext"
-A INPUT -p tcp --dport 443 -j ACCEPT

# --- Active NetFlow / Connection Log Snippet ---
2026-11-03 14:10:02 PROTO=TCP SRC=10.0.1.150 SPT=49210 DST=198.51.100.44 DPT=4444 STATE=ESTABLISHED BYTES_OUT=48291000
2026-11-03 14:10:05 PROTO=TCP SRC=10.0.1.150 SPT=49212 DST=198.51.100.44 DPT=4444 STATE=ESTABLISHED BYTES_OUT=12940200
2026-11-03 14:10:18 PROTO=TCP SRC=192.0.2.88 SPT=58392 DST=10.0.1.2 DPT=21 STATE=SYN_SENT`,
  },
  expectedFindings: [
    {
      id: 'EXP-NET-001',
      agentId: 'network_security',
      title: 'Global SSH Exposure to Public Internet (0.0.0.0/0 on Port 22)',
      category: 'confirmed',
      severity: 'critical',
      cweId: 'CWE-284',
      cvssScore: 9.1,
      description:
        'Management SSH port 22 is exposed to all public IPv4 addresses without VPN, bastion host, or IP whitelist restrictions.',
      evidence: [
        {
          sourceType: 'config',
          location: 'iptables rules line 9',
          rawExcerpt: '-A INPUT -p tcp --dport 22 -s 0.0.0.0/0 -j ACCEPT',
          explanation:
            'Wildcard source address 0.0.0.0/0 grants universal network access to administration shell.',
        },
      ],
      remediation: {
        explanation: 'Restrict SSH ingress to designated management CIDR or require a wireguard VPN.',
        suggestedCode:
          '-A INPUT -p tcp --dport 22 -s 10.0.0.0/8 -j ACCEPT\n-A INPUT -p tcp --dport 22 -j DROP',
        preventionSteps: [
          'Place SSH behind internal VPN or zero-trust bastion',
          'Enforce key-based authentication and disable root login',
        ],
      },
    },
    {
      id: 'EXP-NET-002',
      agentId: 'network_security',
      title: 'Insecure Cleartext FTP Service Exposed on Port 21',
      category: 'confirmed',
      severity: 'medium',
      cweId: 'CWE-319',
      cvssScore: 6.5,
      description:
        'Legacy FTP protocol transmits authentication credentials and payload data in unencrypted plaintext, vulnerable to network interception.',
      evidence: [
        {
          sourceType: 'config',
          location: 'iptables rules line 10',
          rawExcerpt: '-A INPUT -p tcp --dport 21 -s 0.0.0.0/0 -j ACCEPT',
          explanation: 'Cleartext FTP port 21 is exposed globally.',
        },
      ],
      remediation: {
        explanation: 'Decommission legacy FTP in favor of SFTP (SSH File Transfer) or FTPS with enforced TLS.',
        suggestedCode: '# Drop port 21 and migrate to SFTP port 2222 over TLS',
        preventionSteps: [
          'Deprecate plaintext protocols across all DMZ interfaces',
          'Enforce encrypted protocols (SFTP / HTTPS) exclusively',
        ],
      },
    },
    {
      id: 'EXP-NET-003',
      agentId: 'network_security',
      title: 'Anomalous High-Volume Egress to External Host on Port 4444',
      category: 'potential',
      severity: 'high',
      cweId: 'CWE-406',
      cvssScore: 8.1,
      description:
        'Internal host 10.0.1.150 is streaming large volumes of outbound data to non-standard port 4444, exhibiting patterns characteristic of command-and-control or data exfiltration.',
      evidence: [
        {
          sourceType: 'log',
          location: 'NetFlow log line 1',
          rawExcerpt:
            '2026-11-03 14:10:02 PROTO=TCP SRC=10.0.1.150 SPT=49210 DST=198.51.100.44 DPT=4444 STATE=ESTABLISHED BYTES_OUT=48291000',
          explanation:
            'High outbound transfer (48MB) from internal client to foreign IP on known reverse-shell port.',
        },
      ],
      remediation: {
        explanation: 'Immediately isolate host 10.0.1.150 from the network and investigate endpoint memory.',
        suggestedCode: 'iptables -I FORWARD -s 10.0.1.150 -j DROP\niptables -I INPUT -s 10.0.1.150 -j DROP',
        preventionSteps: [
          'Enforce strict egress filtering blocking non-standard outbound ports',
          'Implement network anomaly alerts in SIEM',
        ],
      },
    },
  ],
  demoSimulatedResult: {
    id: 'DEMO-SIM-NET-001',
    agentId: 'network_security',
    timestamp: '2026-11-03T12:00:00.000Z',
    providerUsed: 'simulated',
    scopeValid: true,
    rawText: `[DEMO / SIMULATED BENCHMARK RESULT - NO EXTERNAL OR DISRUPTIVE ACTIONS]
NETWORK SECURITY AUDIT REPORT
Audited Asset: Synthetic DMZ Gateway & Firewall Posture

Findings:
1. [CONFIRMED CRITICAL] Global SSH Access on Port 22 (0.0.0.0/0)
2. [POTENTIAL HIGH] Anomalous Egress Stream to 198.51.100.44:4444
3. [CONFIRMED MEDIUM] Unencrypted Legacy FTP Port 21 Open`,
    findings: [],
  },
  metadata: {
    isSynthetic: true,
    license: 'MIT / Defensive Benchmark Suite',
    containsCredentials: false,
    version: '1.0.0',
    safeForDemo: true,
  },
};

/**
 * 3. Vulnerability Intelligence Dataset: Real CVE Records & Advisories
 */
export const VULNERABILITY_INTEL_DATASET: SyntheticSecurityDataset = {
  id: 'dataset-vuln-cve-intel',
  agentId: 'vulnerability_intel',
  title: 'Critical Upstream Supply Chain & CVE Advisories',
  tagline: 'Authentic Vulnerability Intel: XZ Utils Backdoor and Log4Shell',
  description:
    'Synthetic package dependency manifest mapping authentic industry CVE advisories (CVE-2024-3094, CVE-2021-44228, CVE-2024-39338) with verified CVSS scores and remediation steps.',
  category: 'vulnerability',
  tags: ['CVE', 'NVD', 'Supply-Chain', 'Log4Shell', 'XZ-Utils', 'Advisories'],
  inputs: {
    userPrompt:
      'Analyze the following package dependencies manifest for known CVE vulnerabilities, severity rankings, and patch advisories.',
    configFiles: `{
  "name": "enterprise-backend-service",
  "version": "2.4.1",
  "dependencies": {
    "xz-utils": "5.6.0",
    "log4j-core": "2.14.1",
    "axios": "1.7.2",
    "express": "4.19.2"
  },
  "runtime": {
    "openssh-server": "8.9p1",
    "systemd": "249.11"
  }
}`,
  },
  expectedFindings: [
    {
      id: 'EXP-VULN-001',
      agentId: 'vulnerability_intel',
      title: 'Malicious Supply Chain Backdoor in liblzma / xz-utils',
      category: 'confirmed',
      severity: 'critical',
      cveId: 'CVE-2024-3094',
      cvssScore: 10.0,
      description:
        'Malicious code in versions 5.6.0 and 5.6.1 of the xz-utils package modifies functions in liblzma, allowing unauthorized attackers to bypass sshd authentication.',
      evidence: [
        {
          sourceType: 'cve',
          location: 'dependencies["xz-utils"]',
          rawExcerpt: '"xz-utils": "5.6.0"',
          explanation: 'Pinned version matches compromised upstream tarball releases.',
        },
      ],
      remediation: {
        explanation: 'Downgrade immediately to known safe version 5.4.6 or update to vendor-sanitized distribution patch.',
        suggestedCode: 'npm install xz-utils@5.4.6 --save-exact',
        preventionSteps: [
          'Verify upstream cryptographic signatures on package tarballs',
          'Audit systemd integration hooks for unauthorized pre-load libraries',
        ],
      },
    },
    {
      id: 'EXP-VULN-002',
      agentId: 'vulnerability_intel',
      title: 'Log4Shell JNDI Remote Code Execution in Apache Log4j',
      category: 'confirmed',
      severity: 'critical',
      cveId: 'CVE-2021-44228',
      cvssScore: 10.0,
      description:
        'Apache Log4j2 versions 2.0-beta9 through 2.15.0 JNDI features do not protect against attacker-controlled LDAP and other JNDI-related endpoints, allowing full unauthenticated RCE.',
      evidence: [
        {
          sourceType: 'cve',
          location: 'dependencies["log4j-core"]',
          rawExcerpt: '"log4j-core": "2.14.1"',
          explanation: 'Matches vulnerable Log4j2 version range susceptible to JNDI lookups.',
        },
      ],
      remediation: {
        explanation: 'Upgrade Log4j to version 2.17.1 or higher.',
        suggestedCode: 'mvn versions:use-latest-releases -Dincludes=org.apache.logging.log4j:log4j-core',
        preventionSteps: [
          'Set system property -Dlog4j2.formatMsgNoLookups=true as immediate hotfix',
          'Deploy WAF rules blocking ${jndi: patterns',
        ],
      },
    },
    {
      id: 'EXP-VULN-003',
      agentId: 'vulnerability_intel',
      title: 'Server-Side Request Forgery & Confidentiality Leakage in Axios',
      category: 'confirmed',
      severity: 'high',
      cveId: 'CVE-2024-39338',
      cvssScore: 7.5,
      description:
        'Axios versions prior to 1.7.4 allow confidentiality leakage of custom headers across cross-origin redirects.',
      evidence: [
        {
          sourceType: 'cve',
          location: 'dependencies["axios"]',
          rawExcerpt: '"axios": "1.7.2"',
          explanation: 'Installed version 1.7.2 is below the security fix release 1.7.4.',
        },
      ],
      remediation: {
        explanation: 'Upgrade Axios dependency to version 1.7.4 or above.',
        suggestedCode: 'npm install axios@^1.7.4',
        preventionSteps: [
          'Enable automated Dependabot or Renovate dependency updates',
          'Enforce strict redirect validation in HTTP client wrappers',
        ],
      },
    },
  ],
  demoSimulatedResult: {
    id: 'DEMO-SIM-VULN-001',
    agentId: 'vulnerability_intel',
    timestamp: '2026-11-03T12:00:00.000Z',
    providerUsed: 'simulated',
    scopeValid: true,
    rawText: `[DEMO / SIMULATED BENCHMARK RESULT - NO EXTERNAL OR DISRUPTIVE ACTIONS]
VULNERABILITY INTELLIGENCE REPORT
Audited Asset: Enterprise Dependencies Manifest

CVE Breakdown:
1. [CONFIRMED CRITICAL] CVE-2024-3094 (CVSS 10.0) - xz-utils 5.6.0 Backdoor
2. [CONFIRMED CRITICAL] CVE-2021-44228 (CVSS 10.0) - Log4j2 JNDI RCE
3. [CONFIRMED HIGH] CVE-2024-39338 (CVSS 7.5) - Axios Redirect Leakage`,
    findings: [],
  },
  metadata: {
    isSynthetic: true,
    license: 'MIT / Defensive Benchmark Suite',
    containsCredentials: false,
    version: '1.0.0',
    safeForDemo: true,
  },
};

/**
 * 4. Threat Detection Dataset: Server Access & Incident Logs
 */
export const THREAT_DETECTION_DATASET: SyntheticSecurityDataset = {
  id: 'dataset-threat-access-logs',
  agentId: 'threat_detection',
  title: 'Synthetic Web Ingress & Incident Logs',
  tagline: 'Simulated SQLMap Automation, Directory Traversal, and SSH Brute Force',
  description:
    'Synthetic web server access logs and authentication syslog telemetry capturing automated vulnerability scanner activity and brute-force patterns.',
  category: 'threat',
  tags: ['SIEM', 'Access-Logs', 'SQLMap', 'Brute-Force', 'Syslog', 'Incident-Response'],
  inputs: {
    userPrompt:
      'Analyze the provided access.log and auth.log excerpts to detect active probing campaigns, credential brute-forcing, and directory traversal.',
    logs: `# /var/log/nginx/access.log
198.51.100.22 - - [03/Nov/2026:14:02:11 +0000] "GET /api/products?cat=1%20UNION%20SELECT%20null,schema_name%20FROM%20information_schema.schemata HTTP/1.1" 200 4821 "-" "sqlmap/1.7#stable"
198.51.100.22 - - [03/Nov/2026:14:02:12 +0000] "GET /api/products?cat=1%27%20AND%201=1--%20 HTTP/1.1" 200 4810 "-" "sqlmap/1.7#stable"
203.0.113.88 - - [03/Nov/2026:14:02:44 +0000] "GET /static/../../../../etc/passwd HTTP/1.1" 403 162 "-" "Mozilla/5.0 (Nikto/2.1)"
203.0.113.88 - - [03/Nov/2026:14:02:45 +0000] "GET /static/%2e%2e/%2e%2e/%2e%2e/etc/shadow HTTP/1.1" 403 162 "-" "Mozilla/5.0 (Nikto/2.1)"

# /var/log/auth.log
Nov 03 14:05:01 bastion sshd[4912]: Failed password for root from 198.51.100.77 port 38291 ssh2
Nov 03 14:05:02 bastion sshd[4914]: Failed password for root from 198.51.100.77 port 38293 ssh2
Nov 03 14:05:03 bastion sshd[4916]: Failed password for admin from 198.51.100.77 port 38295 ssh2
Nov 03 14:05:04 bastion sshd[4918]: Failed password for ubuntu from 198.51.100.77 port 38297 ssh2
Nov 03 14:05:05 bastion sshd[4920]: Failed password for root from 198.51.100.77 port 38299 ssh2`,
  },
  expectedFindings: [
    {
      id: 'EXP-THREAT-001',
      agentId: 'threat_detection',
      title: 'Automated SQL Injection Probing via SQLMap Scanner',
      category: 'confirmed',
      severity: 'critical',
      cweId: 'CWE-89',
      cvssScore: 9.8,
      description:
        'Attacker IP 198.51.100.22 is running an automated SQLMap extraction probe targeting /api/products, receiving HTTP 200 success codes with information_schema payloads.',
      evidence: [
        {
          sourceType: 'log',
          location: 'access.log lines 1-2',
          rawExcerpt:
            '198.51.100.22 - - [03/Nov/2026:14:02:11 +0000] "GET /api/products?cat=1%20UNION%20SELECT%20null,schema_name%20FROM%20information_schema.schemata HTTP/1.1" 200 ... "sqlmap/1.7#stable"',
          explanation: 'Clear SQL injection signature and sqlmap user-agent string.',
        },
      ],
      remediation: {
        explanation: 'Block offending IP 198.51.100.22 at the perimeter and parameterize the underlying query.',
        suggestedCode: 'iptables -I INPUT -s 198.51.100.22 -j DROP',
        preventionSteps: [
          'Enable WAF rule blocking sqlmap User-Agent and SQL union patterns',
          'Audit the /api/products database query for prepared statement usage',
        ],
      },
    },
    {
      id: 'EXP-THREAT-002',
      agentId: 'threat_detection',
      title: 'SSH Authentication Brute-Force Campaign from 198.51.100.77',
      category: 'confirmed',
      severity: 'high',
      cweId: 'CWE-307',
      cvssScore: 8.5,
      description:
        'Rapid consecutive authentication failures for root and standard accounts within seconds indicate an active dictionary brute-force assault.',
      evidence: [
        {
          sourceType: 'log',
          location: 'auth.log lines 1-5',
          rawExcerpt:
            'Nov 03 14:05:01 bastion sshd[4912]: Failed password for root from 198.51.100.77 port 38291 ssh2',
          explanation: 'Multiple rapid failed root logins from single source IP.',
        },
      ],
      remediation: {
        explanation: 'Deploy Fail2ban jail on sshd and prohibit root SSH authentication.',
        suggestedCode:
          '# /etc/ssh/sshd_config\nPermitRootLogin no\nPasswordAuthentication no\nPubkeyAuthentication yes',
        preventionSteps: [
          'Configure fail2ban maxretry = 3',
          'Deploy SSH key-only authentication with MFA',
        ],
      },
    },
  ],
  demoSimulatedResult: {
    id: 'DEMO-SIM-THREAT-001',
    agentId: 'threat_detection',
    timestamp: '2026-11-03T12:00:00.000Z',
    providerUsed: 'simulated',
    scopeValid: true,
    rawText: `[DEMO / SIMULATED BENCHMARK RESULT - NO EXTERNAL OR DISRUPTIVE ACTIONS]
THREAT DETECTION & INCIDENT ANALYSIS
Audited Asset: Ingress Nginx & Syslog Traces

Threat Incidents Detected:
1. [CONFIRMED CRITICAL] Active SQLMap Union-Based Extraction Probe (198.51.100.22)
2. [CONFIRMED HIGH] SSH Rapid Dictionary Brute-Force Attack (198.51.100.77)
3. [INFORMATIONAL LOW] Blocked Path Traversal Probing (203.0.113.88)`,
    findings: [],
  },
  metadata: {
    isSynthetic: true,
    license: 'MIT / Defensive Benchmark Suite',
    containsCredentials: false,
    version: '1.0.0',
    safeForDemo: true,
  },
};

/**
 * 5. Security Audit Dataset: HTTP Headers, TLS, and DNS Configuration
 */
export const SECURITY_AUDIT_DATASET: SyntheticSecurityDataset = {
  id: 'dataset-audit-headers-dns',
  agentId: 'security_audit',
  title: 'Synthetic Production Headers & DNS Posture',
  tagline: 'Simulated Permissive CORS, Missing CSP/HSTS, and Permissive SPF Records',
  description:
    'Synthetic HTTP response header capture and public DNS zone export demonstrating common configuration weaknesses and email spoofing exposure.',
  category: 'audit',
  tags: ['Headers', 'CSP', 'HSTS', 'CORS', 'DNS', 'SPF', 'DMARC', 'Compliance'],
  inputs: {
    userPrompt:
      'Perform a compliance and defensive configuration audit on the provided HTTP response headers and DNS zone records.',
    configFiles: `# --- HTTP Response Headers (https://api.example.com) ---
HTTP/1.1 200 OK
Date: Tue, 03 Nov 2026 14:20:00 GMT
Server: Apache/2.4.41 (Ubuntu) OpenSSL/1.1.1
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
X-Frame-Options: ALLOW-FROM https://untrusted-site.com
Content-Type: text/html; charset=utf-8
Content-Length: 4210

# Note: Missing Content-Security-Policy (CSP)
# Note: Missing Strict-Transport-Security (HSTS)
# Note: Missing Referrer-Policy

# --- DNS Zone Records ---
example.com.      300  IN  A      198.51.100.10
example.com.      300  IN  TXT    "v=spf1 +all"
# Note: Missing _dmarc.example.com record`,
  },
  expectedFindings: [
    {
      id: 'EXP-AUDIT-001',
      agentId: 'security_audit',
      title: 'Insecure Permissive CORS Wildcard with Credentials Enabled',
      category: 'confirmed',
      severity: 'high',
      cweId: 'CWE-942',
      cvssScore: 7.8,
      description:
        'Wildcard Access-Control-Allow-Origin: * combined with Access-Control-Allow-Credentials: true constitutes an invalid and insecure cross-origin configuration that modern browsers reject or expose to cross-origin credential leakage.',
      evidence: [
        {
          sourceType: 'header',
          location: 'HTTP Response Headers',
          rawExcerpt:
            'Access-Control-Allow-Origin: *\nAccess-Control-Allow-Credentials: true',
          explanation:
            'Wildcard origin combined with credentials flag violates cross-origin safety standards.',
        },
      ],
      remediation: {
        explanation: 'Specify explicit trusted origins dynamically rather than wildcard.',
        suggestedCode:
          'res.setHeader("Access-Control-Allow-Origin", "https://app.example.com");\nres.setHeader("Access-Control-Allow-Credentials", "true");',
        preventionSteps: [
          'Maintain an explicit origin allowlist',
          'Never reflect arbitrary Origin request headers with credentials',
        ],
      },
    },
    {
      id: 'EXP-AUDIT-002',
      agentId: 'security_audit',
      title: 'Overly Permissive SPF Record (+all) Permitting Global Email Spoofing',
      category: 'confirmed',
      severity: 'high',
      cweId: 'CWE-290',
      cvssScore: 7.5,
      description:
        'The SPF record uses the +all directive, authorizing every server on the internet to send emails purporting to be from @example.com, enabling trivial phishing.',
      evidence: [
        {
          sourceType: 'config',
          location: 'DNS Zone Records line 2',
          rawExcerpt: 'example.com. 300 IN TXT "v=spf1 +all"',
          explanation: '+all explicitly authorizes any host to originate email for domain.',
        },
      ],
      remediation: {
        explanation: 'Restrict SPF to specific mail relays and enforce hardfail (-all).',
        suggestedCode: 'example.com. IN TXT "v=spf1 ip4:198.51.100.10 -all"',
        preventionSteps: [
          'Deploy a DMARC policy: _dmarc.example.com TXT "v=DMARC1; p=reject;"',
          'Sign all outbound messages with DKIM',
        ],
      },
    },
    {
      id: 'EXP-AUDIT-003',
      agentId: 'security_audit',
      title: 'Missing Content-Security-Policy and HSTS Enforcing Headers',
      category: 'confirmed',
      severity: 'medium',
      cweId: 'CWE-16',
      cvssScore: 6.5,
      description:
        'The web server fails to supply Content-Security-Policy (CSP) to restrict script origins and lacks Strict-Transport-Security (HSTS) to prevent SSL stripping.',
      evidence: [
        {
          sourceType: 'header',
          location: 'HTTP Response Headers',
          rawExcerpt: '# Note: Missing Content-Security-Policy (CSP)\n# Note: Missing Strict-Transport-Security (HSTS)',
          explanation: 'Essential defense-in-depth headers are absent.',
        },
      ],
      remediation: {
        explanation: 'Configure HSTS and a restrictive CSP header in the reverse proxy configuration.',
        suggestedCode:
          'Strict-Transport-Security: max-age=63072000; includeSubDomains; preload\nContent-Security-Policy: default-src \'self\'; script-src \'self\'; object-src \'none\';',
        preventionSteps: [
          'Enforce baseline security headers in Nginx/Apache templates',
          'Run automated header compliance audits in CI/CD pipeline',
        ],
      },
    },
  ],
  demoSimulatedResult: {
    id: 'DEMO-SIM-AUDIT-001',
    agentId: 'security_audit',
    timestamp: '2026-11-03T12:00:00.000Z',
    providerUsed: 'simulated',
    scopeValid: true,
    rawText: `[DEMO / SIMULATED BENCHMARK RESULT - NO EXTERNAL OR DISRUPTIVE ACTIONS]
SECURITY POSTURE & COMPLIANCE AUDIT
Audited Asset: Production HTTP Headers & DNS Records

Audit Observations:
1. [CONFIRMED HIGH] Insecure CORS Wildcard with Credentials (CWE-942, CVSS 7.8)
2. [CONFIRMED HIGH] Overly Permissive SPF Record (+all) Permitting Spoofing (CWE-290, CVSS 7.5)
3. [CONFIRMED MEDIUM] Missing CSP & Strict-Transport-Security (HSTS) Headers (CWE-16, CVSS 6.5)`,
    findings: [],
  },
  metadata: {
    isSynthetic: true,
    license: 'MIT / Defensive Benchmark Suite',
    containsCredentials: false,
    version: '1.0.0',
    safeForDemo: true,
  },
};

/**
 * 6. Secure Code Dataset: Refactoring & Hardening Patches
 */
export const SECURE_CODE_DATASET: SyntheticSecurityDataset = {
  id: 'dataset-code-refactor-patches',
  agentId: 'secure_code',
  title: 'Vulnerable Authentication & Query Refactoring',
  tagline: 'Automated Hardening: Parameterization, Password Hashing, and Safe Encoding',
  description:
    'Synthetic legacy JavaScript code with insecure cryptographic practices and concatenated database operations, ready for automated security refactoring.',
  category: 'code',
  tags: ['Refactor', 'Hardening', 'Cryptography', 'Bcrypt', 'Secure-Coding'],
  inputs: {
    userPrompt:
      'Refactor the vulnerable authentication module to eliminate plaintext password storage, fix SQL injection, and implement secure rate limiting.',
    sourceCode: `// Legacy User Auth Module
const mysql = require('mysql2');
const connection = mysql.createConnection({ host: 'localhost', user: 'root' });

function authenticateUser(username, plainPassword, callback) {
  // Vulnerable: MD5 hashing is cryptographically broken
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(plainPassword).digest('hex');

  // Vulnerable: SQL string interpolation
  const sql = \`SELECT * FROM users WHERE username = '\${username}' AND password_hash = '\${hash}'\`;
  connection.query(sql, (err, results) => {
    if (err) return callback(err);
    callback(null, results[0]);
  });
}`,
  },
  expectedFindings: [
    {
      id: 'EXP-CODE-001',
      agentId: 'secure_code',
      title: 'Cryptographically Weak MD5 Hash for Password Storage',
      category: 'confirmed',
      severity: 'critical',
      cweId: 'CWE-328',
      cvssScore: 9.0,
      description:
        'MD5 is collision-vulnerable and computationally trivial to invert using modern rainbow tables, making stored passwords susceptible to rapid compromise.',
      evidence: [
        {
          sourceType: 'code',
          location: 'authenticateUser() line 8',
          rawExcerpt: "const hash = crypto.createHash('md5').update(plainPassword).digest('hex');",
          explanation: 'Use of obsolete MD5 digest algorithm for credential verification.',
        },
      ],
      remediation: {
        explanation: 'Upgrade to memory-hard adaptive hashing algorithm such as bcrypt or Argon2id.',
        suggestedCode:
          'import bcrypt from "bcryptjs";\nconst isValid = await bcrypt.compare(plainPassword, user.passwordHash);',
        preventionSteps: [
          'Enforce bcrypt with minimum work factor of 12 or Argon2id',
          'Migrate legacy MD5 hashes upon user next successful login',
        ],
      },
    },
    {
      id: 'EXP-CODE-002',
      agentId: 'secure_code',
      title: 'SQL Injection via Template Literal Interpolation',
      category: 'confirmed',
      severity: 'critical',
      cweId: 'CWE-89',
      cvssScore: 9.8,
      description:
        'Template literal interpolation directly introduces user input into database commands without driver-level parameter escaping.',
      evidence: [
        {
          sourceType: 'code',
          location: 'authenticateUser() line 11',
          rawExcerpt:
            'const sql = `SELECT * FROM users WHERE username = \'${username}\' AND password_hash = \'${hash}\'`;',
          explanation: 'Template literal interpolation inside SQL query string.',
        },
      ],
      remediation: {
        explanation: 'Pass parameters as separate tuple to connection.query placeholder syntax.',
        suggestedCode:
          'const sql = "SELECT id, username, password_hash, role FROM users WHERE username = ?";\nconnection.query(sql, [username], (err, results) => { ... });',
        preventionSteps: [
          'Enforce ESLint security rules preventing string interpolation in queries',
          'Use parameterized prepared statements exclusively',
        ],
      },
    },
  ],
  demoSimulatedResult: {
    id: 'DEMO-SIM-CODE-001',
    agentId: 'secure_code',
    timestamp: '2026-11-03T12:00:00.000Z',
    providerUsed: 'simulated',
    scopeValid: true,
    rawText: `[DEMO / SIMULATED BENCHMARK RESULT - NO EXTERNAL OR DISRUPTIVE ACTIONS]
SECURE CODE REFACTORING REPORT
Audited Asset: Legacy Authentication Module

Defensive Patches:
1. [CONFIRMED CRITICAL] Replaced MD5 with Argon2id / bcrypt password hashing.
2. [CONFIRMED CRITICAL] Converted dynamic SQL template literals to parameterized queries.
3. [HARDENING] Added constant-time password comparison to prevent timing attacks.`,
    findings: [],
  },
  metadata: {
    isSynthetic: true,
    license: 'MIT / Defensive Benchmark Suite',
    containsCredentials: false,
    version: '1.0.0',
    safeForDemo: true,
  },
};

/**
 * Master Registry of Pristine Datasets
 */
export const DEFAULT_DATASETS: SyntheticSecurityDataset[] = [
  WEB_SECURITY_DATASET,
  NETWORK_SECURITY_DATASET,
  VULNERABILITY_INTEL_DATASET,
  THREAT_DETECTION_DATASET,
  SECURITY_AUDIT_DATASET,
  SECURE_CODE_DATASET,
];

// Populate demoSimulatedResult.findings with copy of expectedFindings for each dataset
for (const dataset of DEFAULT_DATASETS) {
  dataset.demoSimulatedResult.findings = dataset.expectedFindings.map((f) => ({
    ...f,
    evidence: [...f.evidence],
    remediation: {
      ...f.remediation,
      preventionSteps: [...f.remediation.preventionSteps],
    },
  }));
}

/**
 * In-Memory Dataset Store supporting loading, customization, and factory reset.
 */
class DatasetManager {
  private datasets: Map<string, SyntheticSecurityDataset>;

  constructor() {
    this.datasets = new Map();
    this.reset();
  }

  /**
   * Resets all datasets to their pristine default benchmark states.
   */
  public reset(): void {
    this.datasets.clear();
    for (const d of DEFAULT_DATASETS) {
      // Deep clone to ensure runtime mutations do not pollute baseline
      this.datasets.set(d.id, JSON.parse(JSON.stringify(d)));
    }
  }

  /**
   * Returns all available synthetic datasets.
   */
  public getAll(): SyntheticSecurityDataset[] {
    return Array.from(this.datasets.values());
  }

  /**
   * Retrieves a dataset by its unique ID.
   */
  public getById(id: string): SyntheticSecurityDataset | undefined {
    return this.datasets.get(id);
  }

  /**
   * Retrieves datasets associated with a specific specialist agent.
   */
  public getByAgent(agentId: SecurityAgentId): SyntheticSecurityDataset[] {
    return Array.from(this.datasets.values()).filter((d) => d.agentId === agentId);
  }

  /**
   * Validates dataset schema to ensure security boundaries, non-empty fields,
   * absence of real secrets, and valid structure.
   */
  public validate(dataset: unknown): DatasetValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!dataset || typeof dataset !== 'object') {
      return { isValid: false, errors: ['Dataset payload must be a non-null object.'], warnings };
    }

    const d = dataset as Partial<SyntheticSecurityDataset>;

    // Required fields
    if (!d.id || typeof d.id !== 'string') errors.push('Missing or invalid dataset "id".');
    if (!d.agentId || typeof d.agentId !== 'string') errors.push('Missing or invalid dataset "agentId".');
    if (!d.title || typeof d.title !== 'string') errors.push('Missing or invalid dataset "title".');
    if (!d.description || typeof d.description !== 'string') errors.push('Missing or invalid dataset "description".');
    if (!d.inputs || typeof d.inputs !== 'object') {
      errors.push('Missing or invalid "inputs" object.');
    } else {
      if (!d.inputs.userPrompt || typeof d.inputs.userPrompt !== 'string') {
        errors.push('Missing or invalid inputs.userPrompt.');
      }
    }

    // Expected findings validation
    if (!Array.isArray(d.expectedFindings)) {
      errors.push('Expected findings must be an array.');
    } else {
      for (let i = 0; i < d.expectedFindings.length; i++) {
        const f = d.expectedFindings[i];
        if (!f.title) errors.push(`Finding at index ${i} is missing a title.`);
        if (!f.category) errors.push(`Finding at index ${i} is missing a category.`);
        if (!f.severity) errors.push(`Finding at index ${i} is missing a severity.`);
        if (!Array.isArray(f.evidence) || f.evidence.length === 0) {
          warnings.push(`Finding "${f.title || i}" does not have attached evidence items.`);
        }
      }
    }

    // Safety checks against real credentials
    const stringified = JSON.stringify(d).toLowerCase();
    if (
      stringified.includes('-----begin private key-----') ||
      stringified.includes('-----begin rsa private key-----') ||
      stringified.includes('akiatest') ||
      stringified.includes('ghp_')
    ) {
      errors.push('CRITICAL: Dataset contains strings resembling real private keys or production tokens.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Updates an existing dataset or stores an authorized custom benchmark dataset.
   */
  public update(id: string, dataset: SyntheticSecurityDataset): DatasetValidationResult {
    const validation = this.validate(dataset);
    if (!validation.isValid) {
      return validation;
    }
    this.datasets.set(id, JSON.parse(JSON.stringify(dataset)));
    return validation;
  }
}

export const datasetStore = new DatasetManager();
