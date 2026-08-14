# SiteSphere Privacy Policy & Terms of Use (DRAFT TEMPLATE)

> [!WARNING]
> **LEGAL DISCLAIMER & DRAFT NOTICE**: This document is a technical draft template provided strictly for informational purposes. It does **NOT** constitute formal legal advice. Before deploying SiteSphere commercially or presenting these documents to clients or end-users, you **MUST** have this document reviewed and adapted by a qualified legal professional specializing in technology and data protection law in your operating jurisdiction(s).

---

## 📌 Applicable Data Protection Regulations (Regulatory Reference Guide)

Depending on where your business, your client's organization, or your users are located, specific privacy laws apply to personal data collected by SiteSphere:

| Jurisdiction | Applicable Legislation | Key Technical Implications for SiteSphere |
|---|---|---|
| **India** | **Digital Personal Data Protection Act (DPDP Act, 2023)** | Requires clear notice for data processing, explicit consent mechanisms, right to erasure/correction, and strict processing for legitimate use. |
| **European Union / UK** | **General Data Protection Regulation (GDPR / UK GDPR)** | Requires lawful basis for processing, Standard Contractual Clauses (SCCs) for cross-border transfers (e.g. US host servers), Data Protection Impact Assessment (DPIA), and Right to be Forgotten. |
| **United States** | **CCPA / CPRA (California)** + State Privacy Laws | Requires explicit "Do Not Sell/Share My Personal Information" disclosure, privacy notices at collection, and data security safeguards. |
| **Middle East (GCC)** | **Saudi Arabia PDPL / UAE Data Protection Law** | Mandates data localization or approved international transfer frameworks, explicit consent, and mandatory data breach notifications. |

---

# PART 1: PRIVACY POLICY (DRAFT)

**Last Updated: August 14, 2026**

SiteSphere ("we", "us", or "our") operates the SiteSphere construction site daily progress reporting portal. This Privacy Policy describes how we collect, store, process, and protect information when users ("you") access or use SiteSphere.

---

### 1. Information We Collect

We collect information necessary to deliver construction progress tracking, role-based reporting, and audit logging services:

1. **Account & Identity Information**:
   - Name, email address, job title, company name, assigned organizational role (`admin`, `pm`, `site_engineer`), and encrypted password hashes (`bcrypt`).
2. **Daily Progress Report (DPR) Content**:
   - Field progress reports, work completed descriptions, labor headcount statistics (skilled, unskilled, equipment operators), reported site issues, and report timestamps.
3. **Site Photographs & Location Metadata**:
   - Site progress photos uploaded by site engineers.
   - **Embedded EXIF / GPS Metadata**: Image files captured directly on site devices may contain embedded EXIF metadata, including geolocation coordinates (latitude/longitude), device camera type, and timestamp metadata.
4. **Technical & Usage Metadata**:
   - System access logs, IP addresses, browser user-agent details, session refresh token hashes, authentication attempt logs, and audit logs tracking report edit history.

---

### 2. How Data is Stored & Sub-processors

SiteSphere utilizes enterprise cloud infrastructure and third-party sub-processors to store and process data:

| Sub-processor | Purpose | Data Category | Storage Region / Security |
|---|---|---|---|
| **MongoDB Atlas** | Primary Cloud Database | Account data, DPR records, audit logs, project assignments | Cloud Database Cluster (Encrypted at rest & in transit via TLS 1.3) |
| **Cloudinary** | Image CDN & Media Storage | Site progress photos & image thumbnails | Secure CDN Storage (Delivered via HTTPS) |
| **Render** | Cloud Application Hosting | Transient HTTP request logs & API execution | Hosted Application Environment (HTTPS & Helmet security headers) |
| **Resend / SMTP** | Transactional Email Service | User names, emails, verification & reset links | Encrypted SMTP Transmission |
| **Sentry.io** | Error Tracking & Diagnostic Logs | Technical stack traces & error context (no raw passwords) | Encrypted Error Log Vault |

---

### 3. Role-Based Access Control & Organization Isolation

SiteSphere is architected with strict multi-layer access controls:
- **Organization Isolation**: Every database query is strictly scoped to the user's organization (`orgId`). Users from Organization A cannot view, query, or modify resources belonging to Organization B.
- **Role Scoping**:
  - **Site Engineers**: Can submit DPRs and edit their own reports within 24 hours of creation.
  - **Project Managers**: Have read-only access to progress feeds and aggregate KPIs across assigned projects.
  - **Admins**: Manage users, project assignments, override edits, and audit logs within their organization.

---

### 4. Data Retention & Erasure Policy

1. **Active Data Retention**: DPR records, audit logs, and uploaded photos are retained for the duration of the active subscription or project contract.
2. **Account Deactivation**: When an admin sets an account status to `inactive`, the account is immediately blocked from logging in.
3. **Data Deletion / Export**: Upon client written request or subscription termination, organization data will be exported or permanently purged from active MongoDB databases and Cloudinary media stores within thirty (30) days, subject to regulatory record-keeping obligations.

---

# PART 2: TERMS OF USE (DRAFT)

**Last Updated: August 14, 2026**

---

### 1. Acceptance of Terms & Scope

By logging into or accessing SiteSphere, you agree to comply with these Terms of Use. SiteSphere is designed specifically for **building construction daily progress reporting** (residential, commercial, and industrial structures).

---

### 2. User Responsibilities & Account Security

1. **Credentials Security**: You are responsible for maintaining the confidentiality of your account credentials. Sharing account credentials across multiple individuals is strictly prohibited.
2. **Content Accuracy**: Site Engineers are responsible for providing factual, accurate daily progress descriptions, labor counts, and photo evidence.
3. **Authorized Access Only**: Users must not attempt to access resources, projects, or organization data outside their assigned role or organization boundary.

---

### 3. Intellectual Property & Photo License

1. **Client Data Ownership**: All daily progress reports, photos, site notes, and project data submitted to SiteSphere remain the sole property of the client/organization.
2. **Service License**: The client grants SiteSphere a non-exclusive, world-wide license to store, process, transmit, and display submitted content solely for the purpose of operating and delivering the SiteSphere service.

---

### 4. Disclaimer of Warranties & Limitation of Liability

1. **"AS IS" Service Provision**: SiteSphere is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, whether express or implied.
2. **No Liability for Construction Delays or Engineering Decisions**: SiteSphere is a reporting and visibility tool. SiteSphere is **NOT** a structural engineering software, building safety certifier, or project management guarantor. We assume no liability for:
   - Site accidents, structural failures, or construction defects.
   - Project delays, cost overruns, or contractual disputes between contractors and developers.
   - Loss of data resulting from hardware failure, unauthorized local device tampering, or third-party outages.
3. **Cap on Monetary Damages**: To the maximum extent permitted by applicable law, SiteSphere's total cumulative liability for any claims arising from the service shall not exceed the total amount paid by the client to SiteSphere in the three (3) months preceding the incident.

---

### 5. Termination & Suspension

We reserve the right to suspend or deactivate any account or organization access immediately upon:
- Uncured breach of these Terms of Use or security policy.
- Unauthorized attempts to bypass role controls, organization boundaries, or API rate limits.
- Non-payment of subscription fees.

---

### 6. Contact Information

For legal inquiries, data protection requests, or technical support regarding this policy, contact:
- **Email**: `legal@sitesphere.app` (or client's designated support address)
