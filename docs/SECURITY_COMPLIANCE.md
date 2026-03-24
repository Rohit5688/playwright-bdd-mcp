# TestForge & AppForge Vendor Security Self-Assessment

This document serves as a comprehensive **Vendor Security Assessment** and **Compliance FAQ**. It is designed to be provided to enterprise Information Security (InfoSec), IT Procurement, and Data Privacy teams to answer any questions regarding data handling, telemetry, and compliance with frameworks such as **GDPR, HIPAA, PCI-DSS, and SOC 2**.

---

## 🏗️ 1. Architecture ও Data Flow Overview

**Q: Is this a cloud-hosted Software-as-a-Service (SaaS) platform?**
**A:** No. TestForge and AppForge are **locally executed developer tools** (implemented as Model Context Protocol servers). They run entirely on the developer's local machine, behind the organization's firewall. 

**Q: Where is customer data stored?**
**A:** All data remains entirely on the local file system. The tool does not use external databases, nor does it sync data to any central server maintained by the tool's authors.

**Q: What data is collected or transmitted by the tool authors?**
**A:** **None.** The tool has absolutely zero built-in telemetry, usage analytics, error reporting ("phone home" features), or crash trackers. 

---

## 🛡️ 2. Regulatory Compliance 

**Q: Is the tool compliant with the General Data Protection Regulation (GDPR)?**
**A:** Yes. Under GDPR, the tool's authors are neither a Data Controller nor a Data Processor, because no data is collected, stored, or processed on the author's servers. Organizations using the tool maintain complete sovereignty over their data locally.

**Q: Is the tool compliant with the Health Insurance Portability and Accountability Act (HIPAA)?**
**A:** Yes. The tool does not store, transmit, or process Protected Health Information (PHI) externally. If developers use the tool to test internal healthcare applications, the DOM structures and test data never leave the local machine (except via the user's explicitly configured LLM provider—see Section 3). 

**Q: Is the tool SOC 2 or ISO 27001 Certified?**
**A:** Because this is an open-core, locally executable CLI/MCP tool rather than a managed cloud service, SOC 2 and ISO 27001 certifications (which audit cloud infrastructure and managed service policies) are generally not applicable. However, the tool enforces strict security by running completely offline / local, meaning it conforms to your organization's existing internal SOC 2 boundaries.

**Q: Can this tool be used in PCI-DSS environments?**
**A:** Yes. Since all test scripts, logs, and screenshots are kept locally, it can be safely used inside a segmented Cardholder Data Environment (CDE) without transmitting sensitive payment details externally.

---

## 🤖 3. Third-Party Data Processors (LLMs)

**Q: Does the tool send code or data to third-party APIs?**
**A:** As a Model Context Protocol (MCP) server, this tool generates context (like DOM accessibility trees, codebase analysis, and error logs) which is passed to the **Large Language Model (LLM) client** configured by the developer (e.g., Claude Desktop, Cursor, local Ollama). 

**Q: Who is the Data Processor for the AI interactions?**
**A:** The Data Processor is the **LLM Provider** chosen by your organization (e.g., Anthropic, OpenAI, Google, AWS). 

**Q: How do we secure the AI connection?**
**A:** To remain compliant with strict data policies (HIPAA, GDPR), enterprise users **must**:
1. Use an Enterprise/API tier with their LLM provider.
2. Ensure a signed **Data Processing Agreement (DPA)** or **Business Associate Agreement (BAA)** is in place with the LLM provider.
3. Verify that the LLM provider explicitly enforces a **Zero-Data Retention / Zero-Training policy** (i.e., they do not use API data to train public models).

---

## 🔒 4. Security & Vulnerability Management

**Q: How is the application secured against malicious intent?**
**A:** The tool operates within the strict boundary of the developer's permissions. It does not require elevated privileges (sudo/admin) to function. The `execute_sandbox_code` feature restricts dynamic code execution by running it within an isolated V8 sandbox Context, preventing access to unauthorized file system operations or unrestricted network calls.

**Q: How are third-party dependencies managed?**
**A:** The project relies on standard NPM modules. Organizations are encouraged to run their standard SCA (Software Composition Analysis) scanners (like Snyk, SonarQube, or Dependabot) against the tool’s `package.json` to monitor for vulnerability CVEs before approving it for internal use.

**Q: How are application secrets handled?**
**A:** The tool generates tests based on `.env` files. It explicitly ignores `.env` files from version control via scaffolded `.gitignore` rules. The tool includes a dry-run feature (`validate_and_write`) with an active **Secret Audit Warning system** that scans generated code for hardcoded passwords or credentials and alerts the developer to use secure environment variables instead.

---

## ✅ 5. Enterprise Usage Checklist

To ensure 100% compliance when adopting TestForge or AppForge in a highly regulated enterprise, complete the following:

- [ ] Install the MCP server within your trusted local network or developer VPN.
- [ ] Connect the MCP server to an Enterprise LLM API that guarantees zero data retention.
- [ ] Use synthetic / mock data (e.g., Faker.js) for test generation rather than scraping production sites containing real PII/PHI.
- [ ] Ensure developers do not commit the `.env` file containing testing credentials to shared repositories.

---

## ☁️ 6. Cloud & Container Deployments (AWS, Docker, K8s)

When transitioning the deployment of this tool from a local developer machine to a containerized cloud environment (e.g., AWS ECS, EKS, Fargate, or a CI/CD pipeline), organizations operate under a **Shared Responsibility Model**. The compliance status of the tool relies on how the hosting infrastructure is configured.

**Q: How is data residency maintained in the cloud?**
**A:** If the container generates artifacts (like Playwright test logs, HTML reports, or visual snapshots), these files will be written to the container's ephemeral storage or attached volumes (like AWS EBS or EFS). Your organization must ensure this storage is configured to reside in the correct geographical region and is encrypted at rest (e.g., using AWS KMS) to maintain GDPR and HIPAA compliance.

**Q: How are secrets managed in a containerized setup?**
**A:** While local developers use `.env` files, production or CI/CD container deployments should **never** bake credentials into the Docker image. Instead, inject secrets at runtime securely using enterprise secret managers (like AWS Secrets Manager, HashiCorp Vault, or Kubernetes Secrets).

**Q: How do we secure the network connection to the container?**
**A:** MCP servers often communicate via `stdio` (standard input/output) or Server-Sent Events (SSE). If exposing the server over a network inside AWS, ensure it is placed within a private VPC, behind a proper API Gateway or Load Balancer, and secured with TLS/HTTPS. It should not be exposed directly to the public internet.

**Q: Are container workloads stateless?**
**A:** Yes. The tool is designed to work statelessly. It connects to the project root you provide, analyzes code, and returns execution results. To maximize PCI-DSS and HIPAA security, treat the container as ephemeral: destroy it following the task execution so no residue DOM data or test credentials persist longer than necessary.
