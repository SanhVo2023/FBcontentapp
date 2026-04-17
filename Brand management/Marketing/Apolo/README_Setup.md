# Apolo Marketing Management — Setup Guide (v2)

## Files in this folder
- **Apolo_GAS_v2.gs** — ⭐ the latest all-in-one Apps Script (sheet generator + automation + web app endpoints for app integration)
- **Apolo_GAS.gs** — legacy v1 (still works but missing sheet generator + web app)
- **Apolo_Marketing_Mgmt.xlsx** — reference workbook (v2 GAS can generate this from scratch)
- **README_Setup.md** — this file

---

## Option A (Recommended): Build from scratch using v2 GAS

1. Go to [drive.google.com](https://drive.google.com) → **New ▸ Google Sheets** → create a blank sheet. Rename to `Apolo Marketing Mgmt`.
2. **Extensions ▸ Apps Script** → delete default `Code.gs` content.
3. Open `Apolo_GAS_v2.gs` → copy all → paste into the editor.
4. Edit the top 3 email constants:
   ```js
   const HIEN_EMAIL  = 'hien@apolo.vn';
   const PM_EMAIL    = 'cskh@matviet.com.vn';
   const NHUY_EMAIL  = 'nhuy@apolo.vn';
   ```
5. Click **💾 Save** (Ctrl+S). Name the project `Apolo GAS v2`.
6. Close the Apps Script tab and **reload** the Google Sheet (Ctrl+R).
7. Menu **🟦 Apolo** appears. Click **🆕 Build sheet from scratch** → authorize if prompted → confirm YES. 5 tabs + Lists tab are created with all headers, dropdowns, conditional formatting.
8. **Apolo ▸ Install weekly trigger** → enables onEdit automation + Monday 8AM digest.

---

## Option B (Legacy): Upload the xlsx file

1. Upload `Apolo_Marketing_Mgmt.xlsx` to Drive. Open with Google Sheets. File ▸ Save as Google Sheets.
2. Paste `Apolo_GAS.gs` (v1) into Apps Script. Done.

---

## App Integration (v2 only) — Sheet sync for the Next.js app

### Step 1: Generate a shared secret
On any Mac/Linux terminal:
```bash
openssl rand -hex 32
```
Or use any password generator to produce a long random string (64+ chars).

### Step 2: Store secret in GAS Script Properties
1. In the Apps Script editor → **⚙️ Project Settings** (left gear icon)
2. Scroll to **Script Properties** → **Add script property**
3. Key: `SHARED_SECRET`  Value: `<your generated secret>`
4. Save.

### Step 3: Deploy as Web App
1. In Apps Script editor → **Deploy ▸ New deployment**
2. Select type: **Web app**
3. Description: `Apolo App Sync v1`
4. **Execute as**: Me (your account)
5. **Who has access**: Anyone
6. Click **Deploy** → authorize
7. **Copy the Web app URL** (looks like `https://script.google.com/macros/s/AKfyc.../exec`)

### Step 4: Configure the Next.js app
Add to `.env.local` (dev) and Netlify environment variables (production):
```
GAS_WEBAPP_URL=https://script.google.com/macros/s/AKfycb.../exec
GAS_SHARED_SECRET=<the same secret you stored in Script Properties>
```

### Step 5: Add columns to Supabase `posts` table
Run this SQL in the Supabase SQL editor:
```sql
ALTER TABLE posts ADD COLUMN sheet_post_id TEXT NULL;
ALTER TABLE posts ADD COLUMN sheet_row_url TEXT NULL;
ALTER TABLE posts ADD COLUMN sheet_status TEXT NULL;
ALTER TABLE posts ADD COLUMN sheet_synced_at TIMESTAMPTZ NULL;
```

### Step 6: Test it
1. In the app, open any post with status `Approved` or `Images Done`.
2. Click **"Đẩy lên Sheet"** in the header → a row appears in Posts_VN/Posts_EN.
3. Change approval cells in the sheet → click **"Kéo trạng thái"** in the app → status updates.
4. Smoke test the GAS endpoint directly:
   ```bash
   curl "https://script.google.com/macros/s/.../exec?token=<SECRET>&action=ping"
   ```
   Expect: `{"ok":true,"firm":"Apolo Law Firm","time":"..."}`

### Step 7: Re-deploy when updating GAS code
**Important**: Every time you edit `Apolo_GAS_v2.gs`, you MUST **Deploy ▸ Manage deployments ▸ Edit (pencil icon) ▸ New version ▸ Deploy**. Without this, the web app URL still runs the OLD code.

---

## Daily flow

### For Như Ý (content creator)
1. Create content in the Next.js app (campaign → generate variants → generate images).
2. When a post is approved internally (status = Approved), click **"Đẩy lên Sheet"** in the post detail page.
3. Or from the campaign detail page, click **"Đẩy tất cả lên Sheet"** to push all approved posts at once.

### For Mr Hiển (client / approver)
- Open the Google Sheet.
- Go to Dashboard tab → see everything waiting.
- On Posts_VN or Posts_EN → set **Legal Approved** and **Content Approved** cells to Approved / Revise / Rejected.
- Email him with pending items: **Apolo ▸ Email pending → Hiển**.

### For PM (you)
- In the app: click **"Kéo trạng thái"** on any pushed post to refresh Hiển's decision.
- In the sheet: **Apolo ▸ Refresh Dashboard** to rebuild pending list + weekly schedule.
- Lock old published rows: **Apolo ▸ Lock approved rows**.

---

## Sheet structure (auto-built by v2 GAS)

### Dashboard
- KPI cards (pending / next 7 days / running ads / total spend) — auto-calc via formulas
- Pending approvals table — populated by `refreshDashboard`
- Weekly schedule — populated by `refreshDashboard`

### Posts_VN / Posts_EN (21 columns, identical schema)
| Col | Field | Notes |
|-----|-------|-------|
| A | Post ID | Auto (VN-001, EN-001) |
| B | Fanpage | |
| C | Planned Date | yyyy-MM-dd |
| D | Channel | Dropdown: Facebook, Instagram, TikTok, YouTube, Zalo |
| E | Format | Dropdown of FB post types |
| F | Topic | |
| G | Caption | |
| H | Hashtags | |
| I | Image/Video Link | R2 URL from the app |
| J | Assignee | |
| K | Status | Auto from approval flow |
| L | Needs Legal Review | Yes/No — highlights row yellow |
| M | Legal Reviewer | |
| N | Legal Approved (Hiển) | Pending / Approved / Revise / Rejected |
| O | Content Approved (Hiển) | Pending / Approved / Revise / Rejected |
| P | Approval Notes | |
| Q | Will Run Ads? | Yes/No |
| R | Linked Campaign ID | Links to Ads_Campaigns |
| S | Performance Notes | |
| T | app_id (hidden) | Correlation ID — used for pull-status |
| U | Last Updated | Auto timestamp |

### Ads_Campaigns (24 columns)
Campaign ID, Linked Post ID, Objective, Audience, Placement, CTA, Budget/day, Start Date, Duration, Total Budget (auto), Ads Approval, Status, Spend, Reach, Impressions, Clicks, Leads, CPL/CTR.

### Videos (21 columns)
Video ID, Subject → Legal Info → Script → Audio → 1st Scene → Footage → Final (each with approval), Current Stage auto-advances.

### Lists (hidden)
Dropdown source values. Edit here to add new statuses/channels/etc.

---

## Automations included

| Trigger | What it does |
|---|---|
| `onEdit` | Auto-timestamps Last Updated; syncs Status when both approvals match; advances video stage |
| `refreshDashboard` | Rebuilds pending + weekly schedule |
| `newPostVN/EN/Ads/Video` | Creates row with auto-ID and defaults |
| `emailPendingToHien` | HTML email with all pending items |
| `emailWeeklyDigest` | Monday 8AM digest with KPIs |
| `lockApprovedRows` | Protects published rows |
| `doPost(e)` | ⭐ NEW: Next.js app pushes posts here |
| `doGet(e)` | ⭐ NEW: Next.js app pulls approval status |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Apolo" menu missing | Reload sheet (Ctrl+R). If still missing, check Apps Script → Save. |
| Permission error | First run any menu item and accept the OAuth prompt. |
| `Forbidden` from web app | Check `SHARED_SECRET` in Script Properties matches `GAS_SHARED_SECRET` in `.env`. |
| Web app URL returns HTML login page | Re-deploy with "Who has access: Anyone". |
| Changes to GAS not taking effect | Must click **Deploy ▸ Manage deployments ▸ New version** after code edits. |
| "Script function not found: doPost" | Make sure you pasted the v2 file, not v1. |
| `Post not found` on pull | The `app_id` column (T) wasn't set during push. Re-push the post. |

---

## Extending

Future ideas (easy adds):
- Auto-create Google Calendar events when Status → Scheduled
- Gemini AI button: generate ad variations from post row
- Slack/Zalo webhook on Hiển approval
- Auto-import sheet edits back to Supabase (two-way sync — not recommended for v1)
- Bilingual auto-translation of captions
