# Admin dashboard API integration

This guide covers the admin endpoints that are available in the current API. Every endpoint below requires an access token belonging to a user whose `role` is `ADMIN`.

## 1. Setup and authentication

```bash
export API_BASE_URL="http://localhost:3000/api/v1"
export ADMIN_EMAIL="admin@example.com"
export ADMIN_PASSWORD="your-password"
```

Log in first and keep the returned tokens in secure client storage. The access token goes in the `Authorization` header; the refresh token is only used to renew a session or log out.

```bash
curl -X POST "$API_BASE_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "admin@example.com",
    "password": "your-password"
  }'
```

Representative response (`201`):

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "sessionId": "b0d60fb2-...",
  "user": {
    "id": "0f2f...",
    "name": "Admin",
    "email": "admin@example.com",
    "role": "ADMIN"
  }
}
```

```bash
export ADMIN_ACCESS_TOKEN="paste-access-token-here"
export AUTH_HEADER="Authorization: Bearer $ADMIN_ACCESS_TOKEN"
```

### Authentication scenarios

| Scenario | Result | Dashboard action |
| --- | --- | --- |
| Valid admin token | Request succeeds. | Load the requested data. |
| Valid member token | `403 Forbidden`. | Hide admin navigation and show an access-denied page. |
| Missing, expired, or revoked token | `401 Unauthorized`. | Attempt one refresh; if it fails, clear local auth state and redirect to login. |
| Duplicate slug | `409`/database constraint error. | Keep form values and tell the user to choose a unique slug. |
| DTO validation error | `400 Bad Request`. | Map `message` values to the relevant form fields. |

All protected calls use:

```bash
curl "$API_BASE_URL/admin/resources" -H "$AUTH_HEADER"
```

## 2. Dashboard implementation plan

1. **Session bootstrap:** call `GET /auth/me` after restoring a token. Only render the admin app when `role === "ADMIN"`.
2. **Initial data load:** fetch resources, articles, announcements, plans, content pages, FAQs, contact channels, categories, and both tag lists concurrently. Load contact submissions on its own screen because it may grow large.
3. **Create workflows:** use the POST endpoints below. Refresh the corresponding list after a successful create. Current API endpoints do not offer edit or delete for most admin entities; see [Known API gaps](#7-known-api-gaps).
4. **Resource workflow:** create category/tags → upload file → create resource with the returned `fileUploadId`, `categoryId`, and `tagIds`.
5. **Auth handling:** on `401`, use `POST /auth/refresh` once, replace both stored tokens, and retry the original call once. On `403`, do not retry.
6. **Logout:** send the refresh token for the current-device logout; omit it only for an explicit “log out all devices” action.

## 3. Read/list APIs

Each of these returns `200` and an array. There is currently no pagination, filtering, or search query parameter on the admin list endpoints.

| Screen/data | Curl | Representative response |
| --- | --- | --- |
| Resources | `curl "$API_BASE_URL/admin/resources" -H "$AUTH_HEADER"` | `[{"id":"res_1","title":"Starter Guide","slug":"starter-guide","kind":"PDF","visibility":"MEMBERS_ONLY","isPublished":true,"category":null,"tags":[],"files":[]}]` |
| Articles | `curl "$API_BASE_URL/admin/articles" -H "$AUTH_HEADER"` | `[{"id":"art_1","title":"Welcome","slug":"welcome","visibility":"PUBLIC","isPublished":true,"tags":[]}]` |
| Announcements | `curl "$API_BASE_URL/admin/announcements" -H "$AUTH_HEADER"` | `[{"id":"ann_1","title":"New release","type":"PRODUCT","visibility":"PUBLIC","isPublished":true}]` |
| Plans | `curl "$API_BASE_URL/admin/plans" -H "$AUTH_HEADER"` | `[{"id":"plan_1","name":"Pro","slug":"pro","priceCents":2900,"billingPeriod":"MONTHLY","benefits":["Resources"],"isActive":true}]` |
| Content pages | `curl "$API_BASE_URL/admin/content-pages" -H "$AUTH_HEADER"` | `[{"id":"page_1","slug":"about","title":"About","visibility":"PUBLIC","isPublished":true}]` |
| FAQs | `curl "$API_BASE_URL/admin/faqs" -H "$AUTH_HEADER"` | `[{"id":"faq_1","page":"GENERAL","question":"How does it work?","answer":"...","sortOrder":0,"isPublished":true}]` |
| Contact channels | `curl "$API_BASE_URL/admin/contact-channels" -H "$AUTH_HEADER"` | `[{"id":"channel_1","type":"EMAIL","label":"Support","value":"support@example.com","sortOrder":0,"isPublished":true}]` |
| Contact submissions | `curl "$API_BASE_URL/admin/contact-submissions" -H "$AUTH_HEADER"` | `[{"id":"contact_1","name":"Jane","email":"jane@example.com","subject":"Help","message":"...","status":"NEW"}]` |
| Resource categories | `curl "$API_BASE_URL/admin/resource-categories" -H "$AUTH_HEADER"` | `[{"id":"cat_1","name":"Guides","slug":"guides","description":"Getting started"}]` |
| Resource tags | `curl "$API_BASE_URL/admin/resource-tags" -H "$AUTH_HEADER"` | `[{"id":"tag_1","name":"Beginner","slug":"beginner"}]` |
| Article tags | `curl "$API_BASE_URL/admin/article-tags" -H "$AUTH_HEADER"` | `[{"id":"tag_2","name":"News","slug":"news"}]` |

## 4. Create and upsert APIs

All JSON create calls return the newly created record with `201`.

### 4.1 Resource categories and tags

These endpoints **upsert by `slug`**: a new slug creates a record; an existing slug updates its name (and description for a category). Use this behavior for the category/tag management screens.

```bash
curl -X POST "$API_BASE_URL/admin/resource-categories" \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{"name":"Guides","slug":"guides","description":"Getting started resources"}'

curl -X POST "$API_BASE_URL/admin/resource-tags" \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{"name":"Beginner","slug":"beginner"}'

curl -X POST "$API_BASE_URL/admin/article-tags" \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{"name":"News","slug":"news"}'
```

Category response:

```json
{
  "id": "cat_1",
  "name": "Guides",
  "slug": "guides",
  "description": "Getting started resources",
  "createdAt": "2026-08-29T05:00:00.000Z",
  "updatedAt": "2026-08-29T05:00:00.000Z"
}
```

### 4.2 Upload a resource file

Upload first, then use the response `id` as `fileUploadId` when creating a resource. The API stores the file locally in `UPLOAD_DIR`; a multi-instance/cloud deployment needs shared object storage before relying on this workflow.

```bash
curl -X POST "$API_BASE_URL/admin/uploads" \
  -H "$AUTH_HEADER" \
  -F 'file=@./starter-guide.pdf;type=application/pdf'
```

Representative response:

```json
{
  "id": "upload_1",
  "originalName": "starter-guide.pdf",
  "storageName": "9d2a....pdf",
  "storagePath": "/uploads/9d2a....pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 42103,
  "purpose": "RESOURCE",
  "uploadedById": "0f2f..."
}
```

### 4.3 Create a resource

Valid `kind`: `PDF`, `AUDIO`, `VIDEO`, `TEMPLATE`, `GUIDE`, `ARCHIVE`. Valid `visibility`: `PUBLIC`, `MEMBERS_ONLY`.

```bash
curl -X POST "$API_BASE_URL/admin/resources" \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{
    "title": "Starter Guide",
    "slug": "starter-guide",
    "description": "A guide for new members.",
    "summary": "Start here.",
    "kind": "PDF",
    "visibility": "MEMBERS_ONLY",
    "categoryId": "cat_1",
    "tagIds": ["tag_1"],
    "fileUploadId": "upload_1",
    "isPublished": true
  }'
```

Representative response:

```json
{
  "id": "res_1",
  "title": "Starter Guide",
  "slug": "starter-guide",
  "kind": "PDF",
  "visibility": "MEMBERS_ONLY",
  "isPublished": true,
  "categoryId": "cat_1",
  "createdById": "0f2f...",
  "publishedAt": "2026-08-29T05:00:00.000Z"
}
```

### 4.4 Create an article

```bash
curl -X POST "$API_BASE_URL/admin/articles" \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{
    "title": "Welcome to ARIA",
    "slug": "welcome-to-aria",
    "summary": "A short welcome.",
    "content": "# Welcome\n\nFull article content.",
    "visibility": "PUBLIC",
    "tagIds": ["tag_2"],
    "isPublished": true
  }'
```

Representative response:

```json
{"id":"art_1","title":"Welcome to ARIA","slug":"welcome-to-aria","isPublished":true,"publishedAt":"2026-08-29T05:00:00.000Z"}
```

### 4.5 Create an announcement

Valid `type`: `GENERAL`, `PRODUCT`, `EVENT`, `ALERT`.

```bash
curl -X POST "$API_BASE_URL/admin/announcements" \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{
    "title": "New release",
    "slug": "new-release",
    "summary": "Version 2 is available.",
    "content": "Full announcement text.",
    "type": "PRODUCT",
    "visibility": "PUBLIC",
    "isPublished": true
  }'
```

Representative response:

```json
{"id":"ann_1","title":"New release","slug":"new-release","type":"PRODUCT","isPublished":true}
```

### 4.6 Create a membership plan

`priceCents` is an integer amount in the smallest currency unit (for example, `2900` means 29.00). Valid `billingPeriod`: `MONTHLY`, `YEARLY`, `ONE_TIME`.

```bash
curl -X POST "$API_BASE_URL/admin/plans" \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{
    "name": "Pro",
    "slug": "pro",
    "description": "Full access for individuals.",
    "priceCents": 2900,
    "billingPeriod": "MONTHLY",
    "benefits": ["Full resource library", "Priority support"],
    "isActive": true
  }'
```

Representative response:

```json
{"id":"plan_1","name":"Pro","slug":"pro","priceCents":2900,"billingPeriod":"MONTHLY","benefits":["Full resource library","Priority support"],"isActive":true}
```

### 4.7 Create or update a content page

This endpoint **upserts by `slug`**, so use the same request for both “create page” and “save page” scenarios.

```bash
curl -X POST "$API_BASE_URL/admin/content-pages" \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{
    "slug": "about",
    "title": "About us",
    "summary": "Who we are.",
    "content": "Full page content.",
    "visibility": "PUBLIC",
    "isPublished": true
  }'
```

Representative response:

```json
{"id":"page_1","slug":"about","title":"About us","visibility":"PUBLIC","isPublished":true}
```

### 4.8 Create an FAQ or contact channel

Valid FAQ `page`: `GENERAL`, `MEMBERSHIP`, `ABOUT`, `CONTACT`. Valid channel `type`: `EMAIL`, `PHONE`, `SOCIAL`, `LOCATION`.

```bash
curl -X POST "$API_BASE_URL/admin/faqs" \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{
    "page": "GENERAL",
    "question": "How do I join?",
    "answer": "Choose a plan and complete checkout.",
    "sortOrder": 0,
    "isPublished": true
  }'

curl -X POST "$API_BASE_URL/admin/contact-channels" \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{
    "type": "EMAIL",
    "label": "Support",
    "value": "support@example.com",
    "helperText": "Replies within one business day.",
    "sortOrder": 0,
    "isPublished": true
  }'
```

FAQ response:

```json
{"id":"faq_1","page":"GENERAL","question":"How do I join?","answer":"Choose a plan and complete checkout.","sortOrder":0,"isPublished":true}
```

## 5. Logout integration

Use the current-device scenario for a normal dashboard logout button. The body is optional: omitting it logs the user out of every device.

### Current device/session

```bash
curl -X POST "$API_BASE_URL/auth/logout" \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{"refreshToken":"paste-current-refresh-token"}'
```

Response (`201`):

```json
{"message":"Logged out successfully."}
```

### All devices

```bash
curl -X POST "$API_BASE_URL/auth/logout" -H "$AUTH_HEADER"
```

Response (`201`):

```json
{"message":"Logged out successfully."}
```

After either response, remove the access token, refresh token, and user object from browser storage, reset client caches, then redirect to the login screen. A revoked session is rejected by protected endpoints.

## 6. Error responses

```json
// 400: validation error
{
  "message": ["slug must be a string"],
  "error": "Bad Request",
  "statusCode": 400
}
```

```json
// 401: no valid Bearer token
{
  "message": "Authentication is required.",
  "error": "Unauthorized",
  "statusCode": 401
}
```

```json
// 403: authenticated but not ADMIN
{
  "message": "Forbidden resource",
  "error": "Forbidden",
  "statusCode": 403
}
```

## 7. Admin Dashboard Consolidated & Update APIs

### 7.1 Consolidated Dashboard Overview (`GET /api/v1/admin/dashboard/overview`)

Fetches all main metrics, MRR financial analytics, attention overview counters, latest announcements, and activity stream in a single query payload.

```bash
curl "$API_BASE_URL/admin/dashboard/overview" -H "$AUTH_HEADER"
```

Representative response (`200 OK`):

```json
{
  "user": {
    "id": "0f2f...",
    "name": "Istiak",
    "email": "admin@example.com",
    "role": "ADMIN",
    "greeting": "Good morning, Istiak",
    "subtitle": "Here's what's happening across your community."
  },
  "kpi": {
    "totalMembers": 1256,
    "freeMembers": 550,
    "premiumMembers": 706,
    "contentPublished": 60
  },
  "revenue": {
    "mrrCents": 115500,
    "mrrFormatted": "$1,155",
    "avgRevenuePerMember": 4.76,
    "growthRate30d": "+2.1%",
    "last6Months": [
      { "month": "Mar", "revenue": 800 },
      { "month": "Apr", "revenue": 950 },
      { "month": "May", "revenue": 1000 },
      { "month": "Jun", "revenue": 980 },
      { "month": "Jul", "revenue": 1100 },
      { "month": "Aug", "revenue": 1155 }
    ]
  },
  "attentionOverview": {
    "supportRequests": 7,
    "failedPayments": 7,
    "draftContent": 7,
    "newDownloads": 10
  },
  "quickActions": [
    { "label": "Add Member", "action": "ADD_MEMBER", "path": "/admin/members/new" },
    { "label": "Create Content", "action": "CREATE_CONTENT", "path": "/admin/articles/new" },
    { "label": "Upload Resources", "action": "UPLOAD_RESOURCES", "path": "/admin/resources/new" },
    { "label": "Add New Announcement", "action": "ADD_ANNOUNCEMENT", "path": "/admin/announcements/new" },
    { "label": "View Payment", "action": "VIEW_PAYMENT", "path": "/admin/billing" }
  ],
  "latestAnnouncements": [
    {
      "id": "ann_1",
      "title": "New Album Companion Package Available",
      "slug": "new-album-companion-package-available",
      "summary": "Exclusive liner notes, stems, and session files...",
      "type": "PRODUCT",
      "visibility": "PUBLIC",
      "isPublished": true,
      "publishedAt": "2026-07-05T00:00:00.000Z"
    }
  ],
  "recentActivities": [
    {
      "id": "act_1",
      "title": "Upload content: \"Introduction to Music Basic Instruction\"",
      "description": "Istiak performed resource saved",
      "type": "RESOURCE_SAVED",
      "createdAt": "2026-08-30T06:38:00.000Z"
    }
  ]
}
```

### 7.2 Update and Delete Announcements (`PATCH` / `DELETE` `/api/v1/admin/announcements/:id`)

```bash
# Update announcement (Edit button)
curl -X PATCH "$API_BASE_URL/admin/announcements/ann_1" \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{
    "title": "Updated Album Package Title",
    "isPublished": true
  }'

# Delete announcement
curl -X DELETE "$API_BASE_URL/admin/announcements/ann_1" -H "$AUTH_HEADER"
```

### 7.3 Create Admin Member (`POST /api/v1/admin/users`)

```bash
curl -X POST "$API_BASE_URL/admin/users" \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePassword123!",
    "role": "MEMBER"
  }'
```


