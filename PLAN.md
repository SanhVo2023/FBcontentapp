# Content Hub Redesign: Supabase Backend + Unified Content Management

## Overview

Replace Google Sheets (GAS) backend with **Supabase** ("Apolo Funnel Sites" project) for all content/brand/post data. Keep the existing image generation backend (Gemini + R2) untouched. Rebuild the content hub as a unified, brand-grouped content management system with advanced filtering, inline editing, calendar view, and 3 content creation flows.

**Supabase Project:** `zxmdegfnjbvytjnwfhfq` (ap-southeast-1)
**URL:** `https://zxmdegfnjbvytjnwfhfq.supabase.co`

---

## Phase 1: Supabase Database Schema

Create these tables via migrations:

### `brands`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | auto-gen |
| brand_id | text UNIQUE | e.g. "apolo-legal" |
| brand_name | text | |
| tagline | text | |
| logo | text | URL |
| color_primary | text | hex |
| color_secondary | text | hex |
| color_accent | text | hex |
| font_style | text | |
| tone | text | |
| industry | text | |
| target_audience | text | |
| models | jsonb | array of {id, name, photo, description} |
| references | jsonb | array of {id, path, description} |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### `posts`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | auto-gen |
| brand_id | text FK→brands.brand_id | NOT NULL |
| title | text | |
| service_area | text | |
| content_type | text | educational/authority/promotional/engagement |
| topic | text | |
| legal_context | text | |
| caption_vi | text | |
| caption_en | text | |
| language | text | vi/en/both |
| post_type | text | feed-square/story/etc |
| prompt | text | image generation prompt |
| text_overlay | jsonb | {headline, subline, cta} |
| use_model | text | nullable |
| use_reference | text | nullable |
| style | text | default 'professional' |
| status | text | draft/review/approved/images_pending/images_done/scheduled/published/trashed |
| scheduled_date | date | nullable |
| trashed_at | timestamptz | nullable |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |
| created_from | text | 'scratch'/'template'/'json_import' |

### `post_images`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| post_id | uuid FK→posts.id ON DELETE CASCADE | |
| variant_type | text | feed-square/story/etc |
| prompt | text | |
| r2_url | text | CDN URL |
| drive_url | text | nullable (legacy) |
| status | text | pending/done/failed |
| created_at | timestamptz | |

### `tags`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| brand_id | text FK→brands.brand_id | |
| name | text | |
| color | text | hex |

### `post_tags`
| Column | Type | Notes |
|--------|------|-------|
| post_id | uuid FK→posts.id ON DELETE CASCADE | |
| tag_id | uuid FK→tags.id ON DELETE CASCADE | |
| PK: (post_id, tag_id) | | |

### `goal_templates`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| brand_id | text FK→brands.brand_id | nullable (global if null) |
| name | text | e.g. "Weekly Authority Series" |
| description | text | |
| post_defaults | jsonb | partial PostConfig defaults |
| schedule_pattern | text | e.g. "mon,wed,fri" |
| created_at | timestamptz | |

### RLS & Indexes
- Enable RLS on all tables
- Policy: allow all for anon key (single-user app, password-protected at app level)
- Index on `posts.brand_id`, `posts.status`, `posts.scheduled_date`
- Index on `post_images.post_id`
- Updated_at trigger on `brands` and `posts`

---

## Phase 2: Supabase Client Layer

Replace `gas-client.ts` with `supabase-client.ts`:

### New files:
- `src/lib/supabase.ts` — Supabase client init (using `@supabase/supabase-js`)
- `src/lib/db.ts` — All CRUD operations:
  - `getBrands()`, `saveBrand()`, `deleteBrand()`
  - `getPosts(brandId, filters?)`, `getPost(id)`, `createPost()`, `updatePost()`, `deletePost()`, `duplicatePost()`, `bulkCreatePosts()`, `trashPost()`, `restorePost()`
  - `getPostImages(postId)`, `savePostImage()`
  - `getTags(brandId)`, `createTag()`, `deleteTag()`
  - `addTagToPost()`, `removeTagFromPost()`
  - `getTemplates(brandId)`, `createTemplate()`

### Update API routes:
- `api/brands/route.ts` — swap GAS calls → Supabase
- `api/posts/route.ts` — swap GAS calls → Supabase, add filtering params
- `api/trash/route.ts` — swap to Supabase
- Remove `api/gas-status/route.ts` (no longer needed)
- Keep `api/generate/route.ts`, `api/upload/route.ts`, `api/ai-content/route.ts` unchanged (image gen stays same)

### New API routes:
- `api/tags/route.ts` — CRUD for tags
- `api/templates/route.ts` — CRUD for goal templates
- `api/posts/bulk/route.ts` — bulk JSON import

---

## Phase 3: Unified Content Hub UI Rebuild

### New page structure:
```
/content                    → Unified content list (replaces old /content)
/content/[id]              → Post detail/edit view
/content/create            → Create wizard (3 modes)
/content/create/scratch    → From scratch
/content/create/template   → From goal template
/content/create/import     → JSON bulk import
```

### `/content` — Unified Content List
**Core features:**
- **Brand group tabs** at top — switch between brands, or "All Brands" view
- **View toggle**: List view | Calendar view (same page, same data)
- **Advanced filter bar:**
  - Status multi-select (draft, scheduled, published, etc.)
  - Content type filter (educational, authority, etc.)
  - Service area filter
  - Tag filter (multi-select)
  - Date range picker
  - Search (title, caption text)
  - Sort by: created_at, scheduled_date, updated_at, title
- **Bulk actions**: select multiple → bulk status change, bulk delete, bulk tag
- **Quick actions per post row:**
  - Edit (inline or navigate to detail)
  - Duplicate
  - Delete/Trash
  - Generate image
  - Preview as FB post
  - Change status
  - Assign to date (drag or date picker)

### List View
- Compact table/card rows with: thumbnail, title, status badge, content type, tags, scheduled date, actions dropdown
- Inline editing for title, status, scheduled_date (click to edit)
- Drag-to-reorder for scheduling

### Calendar View
- Monthly calendar grid (reuse existing calendar logic)
- Posts shown on their scheduled_date
- **Drag & drop** posts to reschedule
- Unscheduled posts shown in a sidebar "backlog"
- Click post → slide-out detail panel
- "Generate week" AI feature kept

### `/content/[id]` — Post Detail
- Full editable form: all fields
- FB post mockup preview (live updating)
- Image generation panel (select variants, generate, preview)
- Tag management
- Status workflow buttons
- History/audit (created_at, updated_at, created_from)

### `/content/create` — 3 Creation Modes
**Mode selector page with 3 cards:**

1. **From Scratch** — blank form, fill everything manually
2. **From Goal Template** — pick a template, AI fills in the rest based on brand + template defaults + topic
3. **JSON Import** — paste or upload JSON array (matches current image-generator batch flow), bulk creates posts

---

## Phase 4: Cleanup & Integration

1. **Remove GAS dependency entirely:**
   - Delete `gas-client.ts`
   - Remove `GAS_WEB_APP_URL` from env
   - Remove `api/gas-status` route
   - Remove GAS health check from dashboard

2. **Update dashboard:**
   - Remove GAS status indicator
   - Update navigation links to new content structure
   - Add Supabase connection indicator

3. **Install dependency:**
   - `npm install @supabase/supabase-js`

4. **Environment variables:**
   - Add `NEXT_PUBLIC_SUPABASE_URL=https://zxmdegfnjbvytjnwfhfq.supabase.co`
   - Add `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (the anon key)

5. **Keep untouched:**
   - All Gemini AI text/image generation (`gemini.ts`, `gemini-text.ts`, `prompt-builder.ts`)
   - R2 upload pipeline (`r2-client.ts`, `api/upload`, `api/generate`)
   - Auth system (`api/auth`, middleware)
   - Image generator UI (separate app, unchanged)
   - CLI image generator (separate tool, unchanged)

---

## Implementation Order

| Step | What | Files touched |
|------|------|---------------|
| 1 | Create Supabase migration (all tables) | Supabase MCP |
| 2 | Install `@supabase/supabase-js`, add env vars | package.json, .env.local |
| 3 | Create `supabase.ts` + `db.ts` | New: src/lib/supabase.ts, src/lib/db.ts |
| 4 | Rewrite API routes (brands, posts, trash) | src/app/api/brands,posts,trash |
| 5 | Add new API routes (tags, templates, bulk) | New: src/app/api/tags,templates,posts/bulk |
| 6 | Build unified content list page | Rewrite: src/app/content/page.tsx |
| 7 | Build post detail page | New: src/app/content/[id]/page.tsx |
| 8 | Build create wizard (3 modes) | Rewrite: src/app/content/create/* |
| 9 | Integrate calendar as view mode | Merge calendar into content page |
| 10 | Update dashboard | src/app/dashboard/page.tsx |
| 11 | Delete GAS files & cleanup | Delete gas-client.ts, gas-status route |
| 12 | Test end-to-end | Manual verification |

---

## What stays the same
- **Image generation**: Gemini 3.1 Flash Image via existing api/generate
- **Image upload**: R2 pipeline via existing api/upload
- **AI content generation**: Gemini 2.5-pro via existing api/ai-content
- **Auth**: Password-based login via existing middleware
- **Brand assets**: R2 storage for logos/models/references
- **All other tools**: image-generator-ui, image-generator CLI, seo-content-writer — completely untouched
