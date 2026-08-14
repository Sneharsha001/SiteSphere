# SiteSphere

**Real-time daily progress reporting for building construction sites.**  
Built for site engineers who report from the field and project managers who need visibility without walking the site.

---

## The Problem

Site engineers today log daily progress on paper or in WhatsApp messages. Project managers only get a clear picture during periodic site visits — days or weeks after the fact. Issues go unnoticed, photo evidence gets lost, and there's no audit trail.

**SiteSphere replaces this with a structured, role-based web portal** where engineers submit Daily Progress Reports (DPRs) with photos from any device, and PMs get a live dashboard feed the moment a report lands.

> **Scope:** Building construction only — residential, commercial, and industrial structures. This is not a tool for bridges, railways, or linear infrastructure.

---

## Key Features

### 🧱 Site Engineer
- Submit a Daily Progress Report (DPR) with structured fields and up to 5 photos
- Edit your own report within a **24-hour window** after submission
- View your personal report history with status indicators
- Offline-capable form (IndexedDB-backed draft persistence)

### 📊 Project Manager
- Live **dashboard feed** showing DPRs across all assigned projects
- Filter by project, date range, or engineer
- **KPI cards**: reports this week, reports this month, open issues, active projects
- Read-only access to all report details and photos

### 🔐 Admin
- Create and manage projects and user accounts
- Assign engineers and PMs to projects
- **Override edits** on any DPR at any time (bypasses the 24-hour lock)
- Full **audit log** — every edit, who made it, when, and what changed

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7, Axios, React Hook Form, Zod |
| **Backend** | Node.js, Express v5, TypeScript, MongoDB Atlas, Mongoose, JWT (jsonwebtoken), bcrypt, Multer, Nodemailer |
| **File Storage** | Cloudinary (photo uploads) |
| **Deployment** | Render (frontend static site + backend web service) |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│               Browser (React SPA)            │
│  Vite + React + Tailwind + React Router      │
│  Axios → /api/*   │   IndexedDB (offline)   │
└────────────────────┬────────────────────────┘
                     │ HTTPS REST
┌────────────────────▼────────────────────────┐
│         Backend (Node.js / Express v5)       │
│   JWT Auth  │  Role middleware  │  Zod       │
│   Multer (multipart) → Cloudinary SDK        │
└──────────┬──────────────────────────────────┘
           │                         │
  ┌────────▼────────┐    ┌───────────▼──────────┐
  │  MongoDB Atlas  │    │      Cloudinary       │
  │  (Mongoose ODM) │    │  (photo storage CDN)  │
  └─────────────────┘    └──────────────────────┘
```

**Data flow for a DPR submission:**
1. Engineer fills form → React Hook Form + Zod validates client-side
2. `multipart/form-data` POST to `/api/reports`
3. Multer buffers photos → Cloudinary SDK uploads → secure URLs stored in MongoDB
4. PM's dashboard feed updates on next poll/refresh

---

## 🚦 Staging vs Production Environments

> [!IMPORTANT]
> **DEVELOPMENT RULE:** Always test changes on staging first, and only merge or deploy to production after verifying functionality on staging. Never push untested commits directly to production.

### Git Branching & Auto-Deployment Workflow

```
               ┌────────────────────────┐
               │    Local Development   │
               └───────────┬────────────┘
                           │
                           ▼
               ┌────────────────────────┐
               │     `staging` Branch   │
               └───────────┬────────────┘
                           │ (Auto-deploys via GitHub push)
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌─────────────────────────┐ ┌───────────────────────────┐
│ Staging Web Service     │ │ Staging Static Site       │
│ (sitetrack-staging-backend) │ (sitesphere-staging-app)  │
└────────────┬────────────┘ └────────────┬──────────────┘
             │ (Verified)                │
             └─────────────┬─────────────┘
                           │ Pull Request / Merge
                           ▼
               ┌────────────────────────┐
               │      `main` Branch     │
               └───────────┬────────────┘
                           │ (Auto-deploys to Production)
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌─────────────────────────┐ ┌───────────────────────────┐
│ Production Web Service  │ │ Production Static Site    │
│ (sitetrack-backend)     │ │ (sitesphere-app)          │
└─────────────────────────┘ └───────────────────────────┘
```

### Environment Isolation Matrix

| Configuration Variable | Staging Environment (`staging` branch) | Production Environment (`main` branch) |
|---|---|---|
| **Render Web Service (Backend)** | `sitetrack-backend-staging` | `sitetrack-backend` |
| **Render Static Site (Frontend)** | `sitesphere-staging` | `sitesphere-app` |
| **MongoDB Atlas Database** | `mongodb+srv://.../sitetrack_staging` | `mongodb+srv://.../sitetrack_production` |
| **Frontend API Endpoint (`VITE_API_URL`)** | `https://api-staging.sitesphere.com/api` | `https://api.sitesphere.com/api` |
| **Allowed CORS Origin (`FRONTEND_URL`)** | `https://app-staging.sitesphere.com` | `https://app.sitesphere.com` |
| **JWT Access Secret (`JWT_SECRET`)** | Isolated Staging Secret | Isolated Production Secret |
| **JWT Refresh Secret (`JWT_REFRESH_SECRET`)** | Isolated Staging Refresh Secret | Isolated Production Refresh Secret |
| **Cloudinary Folder** | `sitetrack_staging/` | `sitetrack_production/` |

### Setting Up Staging on Render

1. **Create Staging Database**:
   - In MongoDB Atlas, create a database named `sitetrack_staging` on your existing cluster (or a separate staging cluster).
2. **Create Staging Web Service (Backend)**:
   - In Render Dashboard, click **New +** → **Web Service** → Connect Repository.
   - Name: `sitetrack-backend-staging`
   - Branch: `staging`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Environment Variables: Set `MONGODB_URI` pointing to `sitetrack_staging`, `FRONTEND_URL=https://app-staging.sitesphere.com`, and unique `JWT_SECRET`.
3. **Create Staging Static Site (Frontend)**:
   - In Render Dashboard, click **New +** → **Static Site** → Connect Repository.
   - Name: `sitesphere-staging`
   - Branch: `staging`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Environment Variables: Set `VITE_API_URL=https://api-staging.sitesphere.com/api`.


---

## Screenshots

> Drop your images into a `screenshots/` folder at the repo root and update these paths.

| Screen | Preview |
|---|---|
| Login | `![Login Page](screenshots/login.png)` |
| Submit DPR | `![Submit DPR Form](screenshots/submit-dpr.png)` |
| PM Dashboard | `![PM Dashboard](screenshots/dashboard.png)` |
| Report Detail | `![Report Detail](screenshots/report-detail.png)` |
| Audit Log | `![Audit Log](screenshots/audit-log.png)` |

---

## Getting Started (Local Setup)

### Prerequisites
- Node.js ≥ 18
- A MongoDB Atlas cluster (free tier works)
- A Cloudinary account (free tier works)
- An SMTP provider (Gmail App Password, Mailtrap, etc.)

### 1. Clone the repo

```bash
git clone https://github.com/<your-username>/SiteSphere.git
cd SiteSphere
```

### 2. Set up the backend

```bash
cd sitetrack-backend
npm install
```

Create `.env` from the example:

```bash
cp .env.example .env
```

Fill in the values:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_atlas_connection_string
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your_jwt_secret_min_64_chars
JWT_EXPIRES_IN=7d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM=SiteTrack <no-reply@sitetrack.dev>
```

Seed the first admin user:

```bash
npm run seed
```

Start the dev server:

```bash
npm run dev        # runs on http://localhost:5000
```

### 3. Set up the frontend

```bash
cd ../sitetrack-frontend
npm install
```

Create `.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the dev server:

```bash
npm run dev        # runs on http://localhost:5173
```

---

## API Overview

All endpoints are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/auth/login` | Log in, receive JWT | ❌ |
| `POST` | `/auth/forgot-password` | Send password reset email | ❌ |
| `POST` | `/auth/reset-password` | Reset password with token | ❌ |
| `GET` | `/projects` | List projects (scoped by role) | ✅ |
| `POST` | `/projects` | Create a project | Admin |
| `PATCH` | `/projects/:id` | Update project details | Admin |
| `GET` | `/reports` | List DPRs (scoped by role + filters) | ✅ |
| `POST` | `/reports` | Submit a new DPR + photos | Engineer |
| `GET` | `/reports/:id` | Get one DPR with photos | ✅ |
| `PATCH` | `/reports/:id` | Edit own DPR (within 24 h) | Engineer |
| `PATCH` | `/reports/:id/admin-edit` | Override edit any DPR | Admin |
| `GET` | `/reports/:id/audit` | View edit history for a DPR | Admin |
| `GET` | `/dashboard/feed` | All DPRs across assigned projects | PM / Admin |
| `GET` | `/dashboard/kpis` | Aggregate KPI counts | PM / Admin |
| `POST` | `/users` | Create a user account | Admin |
| `GET` | `/users` | List all users in the org | Admin |

---

## Role-Based Access

| Capability | Site Engineer | Project Manager | Admin |
|---|:---:|:---:|:---:|
| Submit DPR | ✅ | ❌ | ❌ |
| Edit own DPR (within 24 h) | ✅ | ❌ | ❌ |
| View own report history | ✅ | ❌ | ❌ |
| Dashboard feed + KPIs | ❌ | ✅ | ✅ |
| Filter DPRs by project/date | ❌ | ✅ | ✅ |
| View any report detail | ❌ | ✅ | ✅ |
| Override-edit any DPR | ❌ | ❌ | ✅ |
| View audit log | ❌ | ❌ | ✅ |
| Create/manage projects | ❌ | ❌ | ✅ |
| Create/manage users | ❌ | ❌ | ✅ |

---

## Project Status

### ✅ Phase 1 — MVP (Complete)

| Day | What was built |
|---|---|
| Day 1 | Project scaffolding, MongoDB models (User, Organization, Project, DPR, AuditLog, ReportPhoto, ProjectAssignment) |
| Day 2 | JWT auth flow, role middleware, login page, protected routes |
| Day 3 | DPR submission form (React Hook Form + Zod), Multer → Cloudinary photo upload pipeline |
| Day 4 | PM Dashboard — live feed, KPI cards, project/date filters |
| Day 5 | Report detail page (photo gallery, structured fields), 24-hour edit window, admin override edit |
| Day 6 | Audit log (full change history per report), My Reports page for engineers |
| Day 7 | Projects management page, SMTP email notifications, offline draft persistence, Dockerfiles, Render deployment |

### 🗺️ Phase 2 — Planned

- **Multi-tenant SaaS** — organization onboarding, subscription billing
- **Native mobile app** — React Native with camera integration and true offline sync
- **Quality module** — checklist-based quality inspection reports
- **Safety module** — daily safety briefing logs, incident reporting
- **Machinery module** — equipment utilization and downtime tracking
- **Export** — PDF and Excel report generation for client submissions

---

*License to be added.*