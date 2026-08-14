# SiteSphere Project Handover & Technical Transfer Document

> **HANDOVER DOCUMENTATION**: This document is intended for project managers, lead developers, and clients taking over operational and technical ownership of SiteSphere. It details all third-party services, configuration environments, deployment workflows, troubleshooting steps, and ownership transfer procedures.

---

## 1. Third-Party Services Registry

Below is the complete registry of all cloud services powering SiteSphere in production and staging environments:

| Service Name | Purpose | Production Dashboard Link | Staging / Free Tier Link | Current Account Owner / Notes |
|---|---|---|---|---|
| **Render** | Application Hosting (Web Service & Static Site) | [Render Dashboard](https://dashboard.render.com/) | Integrated with Render Team Account | Hosts `sitetrack-backend` & `sitesphere-app` (Prod) + `sitetrack-backend-staging` & `sitesphere-staging` (Staging). |
| **MongoDB Atlas** | Database Cloud Cluster | [Atlas Dashboard](https://cloud.mongodb.com/) | Free/M10 Cluster | Stores `sitetrack_production` & `sitetrack_staging` databases. |
| **Cloudinary** | Image CDN & Photo Storage | [Cloudinary Console](https://console.cloudinary.com/) | Free / Paid Plan | Stores DPR progress photos under `sitetrack_production/` & `sitetrack_staging/` folder namespaces. |
| **Resend / SMTP** | Transactional Email Provider | [Resend Dashboard](https://resend.com/dashboard) | Ethereal (Dev/Test) | Delivers user verification emails and password reset links. |
| **Sentry.io** | Production Error Tracking & APM | [Sentry Issues](https://sentry.io/organizations/) | Sentry Organization | Tracks unhandled `500` server errors tagged by environment (`production` vs `staging`). |
| **Better Stack / UptimeRobot** | Synthetic Uptime Monitoring | [Better Stack Dashboard](https://uptime.betterstack.com/) | Free Tier (3-min checks) | Pings `GET /health` endpoint continuously; triggers SMS/Email alerts on downtime. |
| **Registrar (Cloudflare / Namecheap)** | Custom Domain & DNS Management | [Cloudflare Console](https://dash.cloudflare.com/) | Domain Management | Manages DNS records (`app.sitesphere.com`, `api.sitesphere.com`, `app-staging.sitesphere.com`). |

---

## 2. Complete Environment Variables Reference

All environment secrets are stored securely in the **Render Dashboard Environment Settings** for each service. Never commit `.env` files to git.

### Backend Web Service Environment Variables (`sitetrack-backend`)

| Variable Name | Staging Value Example | Production Value Example | Purpose & Rotation Guide |
|---|---|---|---|
| `PORT` | `5000` | `5000` | Internal HTTP listening port. |
| `NODE_ENV` | `production` | `production` | Enables production optimizations & error masking. |
| `MONGODB_URI` | `mongodb+srv://.../sitetrack_staging` | `mongodb+srv://.../sitetrack_production` | Database connection string. **Rotate**: Update password in Atlas, then update this string. |
| `FRONTEND_URL` | `https://app-staging.sitesphere.com` | `https://app.sitesphere.com` | Allowed CORS origins for credentials. |
| `JWT_SECRET` | 64-char hex string | 64-char hex string | Access token signing key (15-min expiry). **Rotate**: Generate via `openssl rand -hex 64`. |
| `JWT_REFRESH_SECRET` | 64-char hex string | 64-char hex string | Refresh token signing key (7-day expiry). **Rotate**: Update in Render env settings. |
| `CLOUDINARY_CLOUD_NAME` | Staging Cloud Name | Prod Cloud Name | Cloudinary account identifier. |
| `CLOUDINARY_API_KEY` | Staging API Key | Prod API Key | Cloudinary API access key. |
| `CLOUDINARY_API_SECRET` | Staging Secret | Prod Secret | Cloudinary secret key. **Rotate**: Regenerate in Cloudinary Console. |
| `SMTP_HOST` | `smtp.resend.com` | `smtp.resend.com` | Transactional email SMTP server host. |
| `SMTP_PORT` | `587` | `587` | SMTP TLS port. |
| `SMTP_USER` | `resend` | `resend` | SMTP username / API token key. |
| `SMTP_PASS` | Secret API Key | Secret API Key | SMTP password / API token secret. |
| `SMTP_FROM` | `SiteTrack <no-reply@sitesphere.com>` | `SiteTrack <no-reply@sitesphere.com>` | Verified email sender identity. |
| `SENTRY_DSN` | `https://staging-key@sentry.io/...` | `https://prod-key@sentry.io/...` | Sentry error reporting ingest DSN. |
| `SENTRY_ENVIRONMENT` | `staging` | `production` | Environment filter tag for Sentry issues. |

### Frontend Static Site Environment Variables (`sitetrack-frontend`)

| Variable Name | Staging Value | Production Value | Purpose |
|---|---|---|---|
| `VITE_API_URL` | `https://api-staging.sitesphere.com/api` | `https://api.sitesphere.com/api` | Base API target URL for Axios HTTP client. |

---

## 3. Deployment Workflow & Promotion Process

```
[ Local Development ] ──> Push to `staging` ──> [ Staging Environment ]
                                                        │
                                                        │ (Verified Functionality)
                                                        ▼
                                              Merge to `main` ──> [ Production Deployment ]
```

### Step 1: Feature Development & Testing
1. Create a local feature branch from `staging`:
   ```bash
   git checkout staging
   git checkout -b feature/your-feature-name
   ```
2. Run local tests before pushing:
   ```bash
   npm test
   npm run typecheck
   ```

### Step 2: Deploy to Staging (`sitesphere-staging`)
1. Push your branch and open a Pull Request against `staging`:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Merge the PR into `staging`.
3. Render automatically builds and deploys to `sitetrack-backend-staging` and `sitesphere-staging`.
4. **Verification Step**: Log into `https://app-staging.sitesphere.com`, submit a DPR with photos, and verify PM dashboard update.

### Step 3: Promote to Production (`sitesphere-app`)
1. Open a Pull Request from `staging` → `main`.
2. Review the diff and merge into `main`.
3. Render automatically triggers zero-downtime deployment to production:
   - Backend: `https://api.sitesphere.com`
   - Frontend: `https://app.sitesphere.com`

---

## 4. Known Scope Limitations & Phase 2 Roadmap

### Scope Boundaries (Current MVP)
- **Domain Focus**: Restricted to **building construction** (residential, commercial, industrial). Not designed for linear infrastructure (bridges, highways, railways).
- **Edit Window**: Site engineers can only edit DPRs within 24 hours of submission. Admin override is required for edits beyond 24 hours.

### Phase 2 Feature Roadmap
1. **Multi-Tenant SaaS Management**: Self-service organization signup, plan tiers, and billing integration.
2. **Native Mobile Application**: React Native app with offline camera capturing and background sync.
3. **Quality Inspection Module**: Structural inspection checklists and defect punch-list tracking.
4. **Safety & Equipment Modules**: Daily safety logs, incident reporting, and heavy equipment downtime tracking.
5. **Export Engine**: One-click PDF & Excel daily report export for client presentation.

---

## 5. "If Something Breaks" Troubleshooting Playbook

When an issue is reported, follow this exact diagnostic cascade:

```
[ Problem Reported ] ──> Step 1: Render Logs ──> Step 2: Sentry Issues ──> Step 3: MongoDB Atlas
```

### Scenario A: API Returning 500 Internal Server Error
1. **Check Render Backend Logs**:
   - Go to Render Dashboard → `sitetrack-backend` → **Logs**. Look for stack trace output.
2. **Inspect Sentry Errors**:
   - Open Sentry.io → Filter by `environment:production`. Check for unhandled exceptions or database timeouts.
3. **Check MongoDB Atlas Status**:
   - Log into MongoDB Atlas → **Database Deployments** → Check metrics for CPU usage, memory utilization, or network IP access blocks.

### Scenario B: Users Unable to Log In (401 / 403 / 423)
- **403 Forbidden ("Email address is not verified")**: User has not clicked the verification link. Trigger email resend or manually set `isEmailVerified: true` in Atlas.
- **423 Locked ("Account is temporarily locked")**: User attempted 5 consecutive wrong passwords. Wait 15 minutes or reset `failedLoginAttempts: 0` and unset `lockUntil` in MongoDB.
- **401 Unauthorized ("Invalid email or password")**: Password mismatch or user document does not exist.

### Scenario C: Photo Upload Failures
1. Check Cloudinary quota and credentials in Render Environment Settings.
2. Confirm file payload is `< 10 MB` and format is valid (`image/jpeg`, `image/png`, `image/webp`).

### Scenario D: CORS Error in Browser Console
- Confirm `FRONTEND_URL` on Render matches the exact client URL (including `https://` protocol and no trailing slash).

---

## 6. Ownership Transfer Checklist

When transferring ownership of SiteSphere to a client or new team, complete the following handoff checklist:

- [ ] **1. Domain Registrar Access**: Transfer domain (`sitesphere.com`) or update DNS nameservers to client's registrar.
- [ ] **2. Render Dashboard Ownership**: Go to Render Team Settings → Add client email as **Owner**, then transfer primary billing.
- [ ] **3. MongoDB Atlas Organization Transfer**: Go to Atlas Settings → Organizations → Invite client as **Organization Owner**.
- [ ] **4. Cloudinary Account Access**: Add client user as Admin in Cloudinary Console → User Management.
- [ ] **5. Transactional Email Provider (Resend)**: Transfer account ownership or update API keys in Render environment variables.
- [ ] **6. Sentry.io Organization Access**: Invite client email to Sentry organization as Admin.
- [ ] **7. GitHub Repository Transfer**: Go to GitHub Repo → Settings → Danger Zone → **Transfer ownership** to client's GitHub org.
