# SiteSphere Disaster Recovery & Backup Guide

> **CRITICAL OPERATIONAL NOTICE**: This document outlines the backup tier reality for MongoDB Atlas, the automated backup utility, and step-by-step procedures for disaster recovery.

---

## 1. MongoDB Atlas Backup Tier Analysis

### ⚠️ The Truth About Your Current Atlas Tier

| Atlas Cluster Tier | Automated Backups Included? | Point-in-Time Recovery? | Estimated Cost | Recommendation |
|---|:---:|:---:|---|---|
| **Free Tier (M0 / M2 / M5)** | ❌ **NO** | ❌ **NO** | **\$0 / month** | **Vulnerable to data loss**. Atlas free tier does NOT provide automated snapshots or point-in-time recovery. |
| **Dedicated Tier (M10+)** | ✅ **YES** | ✅ **YES** | **~\$57 / month** (`~\$0.08/hr`) | **Recommended for production SaaS**. Includes continuous automated snapshots, point-in-time recovery, and 1-click database restores. |

> **Conclusion**: If SiteSphere is running on an **M0 Free Cluster**, automated provider backups are **disabled by MongoDB**. You must either upgrade to **M10 Dedicated** or rely on the automated scheduled export system provided below.

---

## 2. Automated Scheduled Backup System

To protect against data loss on free/shared tiers without incurring paid Atlas costs, SiteSphere includes a native, cross-platform backup engine that exports compressed, checksummed database snapshots.

### Manual On-Demand Backup
Run this command from `sitetrack-backend`:

```bash
npm run db:backup
```

**Output Details**:
- **Directory**: `sitetrack-backend/backups/`
- **File Format**: `sitetrack_backup_YYYY-MM-DDTHH-mm-ss.json.gz` (Gzip compressed JSON manifest)
- **Integrity**: Generates SHA-256 checksum for verification.

### Automated Daily Backup Schedule (Render / Cron)

To automate daily backups on Render or a worker instance:

1. **Option A: Render Cron Job**:
   - Create a Render Cron Job attached to the backend repo.
   - Command: `cd sitetrack-backend && npm run db:backup`
   - Schedule: `0 2 * * *` (Every night at 2:00 AM UTC).

2. **Option B: Offsite Bucket Upload**:
   - Configure AWS S3 or Cloudinary to automatically mirror the `backups/` directory offsite.

---

## 3. Disaster Recovery Protocol (Step-by-Step Restore)

If the database is corrupted, wiped, or accidentally modified, follow this exact recovery procedure:

### Recovery Metrics
- **Recovery Point Objective (RPO)**: Last scheduled backup (max 24 hours).
- **Recovery Time Objective (RTO)**: `< 5 minutes`.

---

### Step-by-Step Restoration Process

#### Step 1: Identify the Latest Valid Backup File
Navigate to the `backups/` folder and identify the most recent `.json.gz` file:

```bash
ls -lt sitetrack-backend/backups/
```

#### Step 2: Verify Archive Integrity (SHA-256)
Ensure the backup archive has not been corrupted:

```bash
# On Linux/macOS
shasum -a 256 sitetrack-backend/backups/sitetrack_backup_2026-08-14T05-40-40.json.gz

# On Windows PowerShell
Get-FileHash sitetrack-backend/backups/sitetrack_backup_2026-08-14T05-40-40.json.gz -Algorithm SHA256
```

#### Step 3: Execute Disaster Recovery Restore Command
Run the restore script, passing the target backup file:

```bash
cd sitetrack-backend
npm run db:restore -- backups/sitetrack_backup_2026-08-14T05-40-40.json.gz
```

#### Step 4: Verify Application Health
1. Verify API response:
   ```bash
   curl https://api.sitesphere.com/health
   ```
2. Run test suite to confirm data integrity:
   ```bash
   npm test
   ```
