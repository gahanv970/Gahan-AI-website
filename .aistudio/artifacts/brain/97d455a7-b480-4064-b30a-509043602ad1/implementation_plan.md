# GAHAN AI: Cinematic Cybersecurity Multi-Agent Platform

Transform GAHAN AI into a professional, cinematic AI-powered defensive cybersecurity platform with 6 specialized agents (Web Security, Network Security, Vulnerability Intel, Threat Detection, Security Audit, Secure Code) and a central Security Orchestrator.

## User Review & Critical Decisions

> [!IMPORTANT]
> Key constraints and instructions provided by the user:
>
> - **AI Inference Provider**: Primary provider is **Local Ollama** (running at `http://localhost:11434`, default model `qwen3:1.7b` or installed local Qwen model) requiring NO paid API keys for local operation. Google Gemini API remains available as an optional cloud fallback provider.
> - **Infrastructure Preservation & Database Backup**: Preserve SQLite/JSON database structure (`data/gahan.db` / `data/gahan_db.json`), bcrypt password hashing, JWT owner authentication (`/admin/login`), subscription tier infrastructure, and admin portal. Created verified backup at `data/gahan_db.backup.json`.
> - **Sequential Orchestration First**: Implement and test the 6 specialized security agents individually first before connecting them to the central orchestrator using sequential agent delegation initially.
> - **Scope & Authorization**: Enforce authorization and defined scope for active security assessments. Keep potentially disruptive actions strictly disabled.
> - **Evidence-Based Findings**: Require explicit evidence (exact line numbers, log snippets, code excerpts, header keys) for all findings. Strictly distinguish between Confirmed Vulnerabilities, Potential Vulnerabilities, and Informational Observations. Never fabricate CVEs, CVSS scores, scan results, or successful tests.
> - **Cinematic Visual Identity**: Preserve existing dark WebGL 3D AI Core, responsive hero typography, and high-tech command center visual theme.
> - **Robust Error Handling**: Catch failures for individual cybersecurity agents without halting the entire pipeline, logging metadata about the failure for the final consolidated report.

---

## 1. Overview & Core Concept

### What It Does
GAHAN AI evolves into an enterprise-grade defensive security intelligence platform. Users can engage individual specialized agents or initiate a multi-agent orchestration sequence to analyze web application source code, review firewall and network configurations, research CVE advisories, investigate server incident logs, audit TLS/DNS security, and generate secure refactored code.

### Target Audience
Security Analysts, Incident Responders, DevSecOps Engineers, System Administrators, Security Auditors, and Developers performing authorized security assessments and code hardening.

### Key Value
- **Dual AI Provider Engine**: Direct connection to local Ollama inference (`http://localhost:11434` with model `qwen3:1.7b` or local Qwen) without external API costs, with optional Gemini cloud acceleration fallback.
- **6 Specialized Security Agents**:
  1. **Web Security Agent**: Static source code review for XSS, SQLi, IDOR, SSRF, and broken access control.
  2. **Network Security Agent**: Firewall rules review, log pattern analysis, and traffic anomaly identification.
  3. **Vulnerability Intelligence Agent**: Real CVE lookup, NVD severity scoring, affected software analysis, and remediation advisories.
  4. **Threat Detection Agent**: Application/server log parsing, incident report generation, and defensive response playbooks.
  5. **Security Audit Agent**: Header inspection (CSP, HSTS, CORS), TLS/DNS posture review, and configuration auditing.
  6. **Secure Code Agent**: Automated AST/pattern security analysis, secure code refactoring, and language-agnostic patches.
- **Evidence-Based Reporting**: All findings require concrete evidence clips (code lines, log lines, header names) categorized as Confirmed, Potential, or Informational.

---

## 2. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GAHAN AI CLIENT (REACT / VITE)                     │
├──────────────────────────────────────┬──────────────────────────────────────┤
│  Homepage Hero & 3D WebGL AI Core   │  Cyber Operations Workbench          │
│  - Hero Typography & Agent Cards    │  - Orchestrator Stream & Tabs        │
│  - Auth Modal (Customer Login)      │  - Dataset Selector (6 Domains)      │
│  - Admin Portal Modal (/admin)      │  - Demo Mode (Simulated Results)     │
│  - Local Ollama / Gemini Provider   │  - Expected vs Live Finding Compare  │
└──────────────────────────────────┬───┴──────────────────────────────────────┘
                                   │ HTTPS / REST / SSE Streaming
┌──────────────────────────────────▼──────────────────────────────────────────┐
│                         EXPRESS BACKEND SERVER (server.ts)                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  - Middleware: CORS, BodyParser, JWT Auth Guard (`requireAdmin`)             │
│  - `/api/chat/stream`: Dual Ollama (`http://localhost:11434`) / Gemini SSE   │
│  - `/api/cybersecurity/orchestrator`: Multi-Agent Dispatcher & Aggregator    │
│  - `/api/cybersecurity/classify`: Task Classifier & Domain Relevance         │
│  - `/api/cybersecurity/datasets/*`: Dataset Selector, Demo, Reset, Validate  │
│  - `/api/admin/*`: Owner Dashboard, Model Controls, User Directory          │
│  - `/api/auth/*`: JWT Token Generation, Bcrypt Password Verification        │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────────────┐
│                       PERSISTENCE & LOCAL AI ENGINE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  - SQLite / JSON DB (`gahan_db.json` & `gahan_db.backup.json`): DB Persistence │
│  - Synthetic Datasets (`sampleDatasets.ts`): 6 Benchmark Datasets + Reset   │
│  - Local Ollama Engine (`qwen3:1.7b` @ http://localhost:11434): Primary AI   │
│  - Google Gemini API (@google/genai SDK): Optional Cloud Fallback            │
└──────────────────────────────────┴──────────────────────────────────────────┘
```

---

## 3. Incremental Implementation Plan

1. **Step 1: Security Agent Prompts & AI Dual Provider Architecture (`src/types/cybersecurity.ts`, `src/services/agentPrompts.ts`, `src/services/aiProvider.ts`, Backup)** [COMPLETED]
   - Created verified backup of database (`data/gahan_db.backup.json`).
   - Defined TypeScript interfaces for Agents, Evidence-Based Findings (Confirmed, Potential, Informational), Scope Authorization, and Dual AI Provider Config (Ollama / Gemini).
   - Created strict defensive system prompts for the 6 specialized agents and the sequential orchestrator.
   - Implemented `src/services/aiProvider.ts` to connect to local Ollama (`http://localhost:11434`) with fallback to Gemini API.

2. **Step 2: Specialized Agent Execution Handlers & Untrusted Input Validation (`src/services/agentHandlers.ts`, `src/services/agentHandlers.test.ts`)** [COMPLETED]
   - Implemented individual execution handlers, input validation, and structured outputs for all 6 specialized agents.
   - Added anti-fabrication guards (strictly validating CVE IDs and CVSS scores, requiring line-level evidence excerpts).
   - Added explicit `strictLocalOnly` mode preventing any silent fallback to Gemini.
   - Enforced scope validation blocking disruptive actions.
   - Created unit tests verifying execution handlers and evidence extraction.

3. **Step 3: Central Security Orchestrator System (`src/services/securityOrchestrator.ts`, `src/services/securityOrchestrator.test.ts`, `server.ts`)** [COMPLETED]
   - Implemented `classifySecurityTask` for automatic domain classification and agent selection.
   - Implemented sequential delegation across specialized agents with per-agent timeout guards.
   - Built robust error-handling mechanism catching individual agent failures without halting the overall pipeline.
   - Logged failure metadata (`failedAgentId`, `stepName`, `errorMessage`, `errorType`, `timestamp`, `durationMs`) for the final report.
   - Implemented finding aggregation, deduplication, and conflict detection.
   - Generated consolidated audit reports with executive summary, agent execution matrix, prioritized remediations, and incomplete checks/limitations.
   - Exposed endpoints: `POST /api/cybersecurity/orchestrator` and `POST /api/cybersecurity/classify`.

4. **Step 4: Pre-Loaded Security Datasets & Workbench Data (`src/data/sampleDatasets.ts`, `src/services/datasetService.ts`, `server.ts`)** [COMPLETED]
   - Created 6 rich synthetic benchmark datasets covering Web Security (OWASP Top 10 SQLi, XSS, IDOR), Network Security (firewall rules, port 22 exposure, egress anomaly), Vulnerability Intel (real CVEs: CVE-2024-3094, CVE-2021-44228, CVE-2024-39338), Threat Detection (Nginx SQLMap probing, directory traversal, SSH brute force syslog), Security Audit (permissive CORS, SPF +all, missing CSP/HSTS), and Secure Code (MD5 refactoring, parameterized queries).
   - Included structured expected findings with line-level evidence, severity, and remediation for every dataset.
   - Implemented Demo Mode (`executeDemoAnalysis`) returning verified simulated benchmark results with explicit `[SIMULATED BENCHMARK DEMO]` labels and zero external network/token cost.
   - Implemented schema validator (`validateDatasetPayload`) rejecting corrupted structures and blocking secret token / private key strings.
   - Implemented dataset factory reset (`resetDatasets`) restoring pristine defaults from runtime mutations.
   - Added REST endpoints in `server.ts`:
     - `GET /api/cybersecurity/datasets`
     - `GET /api/cybersecurity/datasets/:id`
     - `POST /api/cybersecurity/datasets/:id/demo`
     - `POST /api/cybersecurity/datasets/reset`
     - `POST /api/cybersecurity/datasets/validate`
   - Added full test coverage in `src/services/sampleDatasets.test.ts` (17/17 tests passing across the entire cybersecurity platform).

5. **Step 5: Cyber Operations Workbench (`src/components/CyberWorkbenchModal.tsx`)** [NEXT STEP]
   - Build tabbed workspace with Orchestrator feed, individual agent tabs, dataset selector, evidence highlights, scope authorization toggle, and report generator.

6. **Step 6: Homepage Visual Redesign (`src/components/HeroSection.tsx`, `src/components/AgentCardsGrid.tsx`, `src/App.tsx`)**
   - Update Hero headline & copy to focus on Autonomous Cybersecurity Intelligence.
   - 6 interactive Cybersecurity Agent Cards with direct quick-launch buttons.
   - Preserve 3D WebGL Core, dark cinematic theme, customer Auth modal, and isolated Admin Portal.
