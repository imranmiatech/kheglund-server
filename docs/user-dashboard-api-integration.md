# User dashboard API integration

This guide documents the existing member-facing API for the user dashboard. Use the base URL without a trailing slash:

```bash
export API_BASE_URL="http://localhost:3000/api/v1"
```

Protected endpoints require an access token. In a browser application, never put a Stripe secret key or webhook call in the client.

```bash
export ACCESS_TOKEN="paste-access-token-here"
export AUTH_HEADER="Authorization: Bearer $ACCESS_TOKEN"
```

## 1. Implementation plan

1. **Authenticate and bootstrap:** login, store the access and refresh tokens securely, then call `GET /dashboard/me`, `GET /users/me`, and `GET /billing/me` in parallel. Treat `GET /dashboard/me` as the home-screen data source.
2. **Token lifecycle:** send the access token on every protected request. On one `401`, call `POST /auth/refresh` with the refresh token, save both returned tokens, and retry the original request once. If refresh fails, clear auth state and redirect to login.
3. **Content experience:** fetch resources with filters/pagination, fetch public articles and announcements, and record save, download, and reading actions after the user actually performs them.
4. **Profile/settings:** optimistically update only after receiving a successful response. A password change revokes all sessions, so immediately clear local tokens and send the user to login.
5. **Membership/billing:** open the returned Stripe Checkout or Billing Portal URL in the browser. Do not mark a payment successful from the redirect alone—reload billing/subscription data after returning, because Stripe webhook processing is authoritative.
6. **Logout:** send the refresh token to revoke just the current device; omit it only for the explicit “log out all devices” action.

## 2. Auth and session scenarios

### Login

```bash
curl -X POST "$API_BASE_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "member@example.com",
    "password": "password123"
  }'
```

Response (`201`):

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "sessionId": "f1e2...",
  "user": {
    "id": "user_1",
    "name": "Jane Member",
    "email": "member@example.com",
    "role": "MEMBER"
  }
}
```

### Refresh expired access credentials

```bash
curl -X POST "$API_BASE_URL/auth/refresh" \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"paste-refresh-token"}'
```

Response (`201`) has the same token/user shape as login. Replace **both** tokens because a refresh rotates the refresh token.

### Session scenario matrix

| Scenario | Expected behavior | Client action |
| --- | --- | --- |
| Access token works | Protected call succeeds. | Continue. |
| Access token expired | Protected call returns `401`. | Refresh once, replace tokens, retry once. |
| Refresh token expired/revoked | Refresh returns `401`. | Clear all auth data and route to login. |
| Account is deactivated/deleted | Protected call returns `401`. | Clear auth data and explain that the account is unavailable. |
| Member opens an admin route | Returns `403`. | Do not show admin navigation to members. |

### Logout—current device

```bash
curl -X POST "$API_BASE_URL/auth/logout" \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{"refreshToken":"paste-current-refresh-token"}'
```

Response (`201`):

```json
{"message":"Logged out successfully."}
```

### Logout—all devices

```bash
curl -X POST "$API_BASE_URL/auth/logout" -H "$AUTH_HEADER"
```

Response (`201`):

```json
{"message":"Logged out successfully."}
```

After either response, clear tokens, cached profile/dashboard data, and any persisted query cache.

## 3. Dashboard home

Load this endpoint after login and after meaningful actions such as save/download/plan changes.

```bash
curl "$API_BASE_URL/dashboard/me" -H "$AUTH_HEADER"
```

Response (`200`):

```json
{
  "subscription": {
    "id": "sub_1",
    "status": "ACTIVE",
    "autoRenew": true,
    "plan": { "id": "plan_1", "name": "Pro", "priceCents": 2900 }
  },
  "stats": {
    "savedResourcesCount": 4,
    "articleReadsCount": 6,
    "downloadsCount": 3
  },
  "quickActions": [
    { "label": "Browse Saved", "path": "/resources?saved=true" }
  ],
  "featuredResources": [],
  "recentAnnouncements": [],
  "recentActivity": []
}
```

Implementation scenarios:

| Scenario | UI behavior |
| --- | --- |
| `subscription` is `null` | Show plan-selection/upgrade CTA. |
| `status` is `CANCELED` or `autoRenew` is `false` | Show end/renewal messaging and Resume action. |
| Empty activity/resources | Render a useful empty state, not an error. |
| A save/download/read succeeds | Refetch this endpoint or update affected counts locally. |

## 4. Profile and account management

### Read profile

```bash
curl "$API_BASE_URL/users/me" -H "$AUTH_HEADER"
```

Response (`200`):

```json
{
  "id": "user_1",
  "name": "Jane Member",
  "email": "member@example.com",
  "role": "MEMBER",
  "avatarPath": "/uploads/avatar.png",
  "avatarMimeType": "image/png",
  "avatarFileSizeBytes": 12003,
  "createdAt": "2026-08-29T05:00:00.000Z"
}
```

`GET /auth/me` is also available when only the basic identity (`id`, `name`, `email`, `role`, `avatarPath`, `createdAt`) is needed.

### Update name/email

```bash
curl -X PATCH "$API_BASE_URL/users/me" \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com"
  }'
```

Response (`200`):

```json
{
  "id":"user_1",
  "name":"Jane Doe",
  "email":"jane@example.com",
  "role":"MEMBER",
  "avatarPath":"/uploads/avatar.png"
}
```

Scenario: if the email belongs to another active account, the response is `400` with `"Email is already in use."`; retain form state and show the field error.

### Upload avatar

```bash
curl -X POST "$API_BASE_URL/users/me/avatar" \
  -H "$AUTH_HEADER" \
  -F 'file=@./avatar.png;type=image/png'
```

Response (`201`):

```json
{
  "id":"user_1",
  "name":"Jane Doe",
  "email":"jane@example.com",
  "avatarPath":"/uploads/2a4b....png",
  "avatarMimeType":"image/png",
  "avatarFileSizeBytes":12003
}
```

Use `avatarPath` as the URL path served by the API host. Reject unsuitable file type/size on the client too, but still handle server-side failures.

### Change password

Either `POST /users/me/password` or `POST /settings/security` uses the same body. Prefer the settings route for the settings screen.

```bash
curl -X POST "$API_BASE_URL/settings/security" \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{
    "currentPassword":"password123",
    "newPassword":"new-password123"
  }'
```

Response (`201`):

```json
{"message":"Password updated successfully."}
```

Scenario: this revokes **all** sessions, including the current one. Immediately clear local credentials and redirect to login after a successful response. An incorrect current password returns `400`.

### Delete account

```bash
curl -X DELETE "$API_BASE_URL/users/me" \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{"reason":"No longer need the service"}'
```

Response (`200`):

```json
{"message":"Account deleted successfully."}
```

Scenario: show a destructive confirmation dialog first. The account is deactivated/soft-deleted and all sessions are revoked; clear local state after success.

## 5. Resources and library

All resource endpoints below require authentication. `GET /resources` supports `search`, `category` (slug), `tag` (slug), `kind`, `page`, `limit`, and `savedOnly`. With no `kind` (or `kind=All Resources`), it returns a single newest-first feed of resources and published articles. Use `kind=ARTICLE` (or `kind=Article`) to return only articles in the same paginated envelope; article results support `search`, `tag`, `page`, and `limit`.

### Browse and filter resources

```bash
curl "$API_BASE_URL/resources?search=starter&category=guides&kind=PDF&page=1&limit=12" \
  -H "$AUTH_HEADER"
```

Response (`200`):

```json
{
  "items": [
    {
      "id":"res_1",
      "title":"Starter Guide",
      "slug":"starter-guide",
      "description":"A guide for new members.",
      "kind":"PDF",
      "visibility":"MEMBERS_ONLY",
      "isPublished":true,
      "isSaved":false,
      "category":{"id":"cat_1","name":"Guides","slug":"guides"},
      "tags":[{"tag":{"id":"tag_1","name":"Beginner","slug":"beginner"}}],
      "files":[]
    }
  ],
  "page":1,
  "limit":12,
  "total":1
}
```

Scenarios:

| Scenario | Request | UI behavior |
| --- | --- | --- |
| All Resources | `GET /resources?kind=All%20Resources&page=1&limit=12` | Returns a mixed newest-first feed; inspect each item’s `contentType`. |
| Search/filter | Add `search`, `category`, `tag`, or `kind`. | Reset page to 1 whenever filters change. |
| Articles tab | `GET /resources?kind=ARTICLE&tag=news&page=1&limit=12` | Each item has `contentType: "ARTICLE"`; do not send `category` or `savedOnly` for articles. |
| Saved tab | `GET /resources/saved` or `GET /resources?savedOnly=true`. | Use `/saved` for the complete saved list (max 50). |
| Empty results | `items: []`, `total: 0`. | Show a no-results state and clear-filters action. |

### Resource detail and save state

```bash
curl "$API_BASE_URL/resources/res_1" -H "$AUTH_HEADER"
```

Response (`200`) is the resource record with `category`, `tags`, `files`, and `isSaved`.

Save is idempotent—the same resource can be saved repeatedly without an error:

```bash
curl -X POST "$API_BASE_URL/resources/res_1/save" -H "$AUTH_HEADER"
```

Response (`201`):

```json
{"message":"Resource saved successfully."}
```

Remove from saved:

```bash
curl -X DELETE "$API_BASE_URL/resources/res_1/save" -H "$AUTH_HEADER"
```

Response (`200`):

```json
{"message":"Resource removed from saved items."}
```

After save/unsave, update `isSaved` and dashboard saved count. If an already removed item is removed again, the current API can return an error; disable the button while the request is in flight.

### Download and view tracking

Call download only after the user chooses a download. The response supplies the URL; navigate the browser to that URL after recording succeeds.

```bash
curl -X POST "$API_BASE_URL/resources/res_1/download" -H "$AUTH_HEADER"
```

Response (`201`):

```json
{
  "message":"Download tracked successfully.",
  "downloadUrl":"/uploads/starter-guide.pdf",
  "file":{
    "id":"upload_1",
    "originalName":"starter-guide.pdf",
    "mimeType":"application/pdf",
    "sizeBytes":42103
  }
}
```

For non-downloadable/view-only resources, record a view:

```bash
curl -X POST "$API_BASE_URL/resources/res_1/read" -H "$AUTH_HEADER"
```

Response (`201`):

```json
{"message":"Resource activity tracked successfully."}
```

Download history:

```bash
curl "$API_BASE_URL/resources/downloads" -H "$AUTH_HEADER"
```

Response (`200`):

```json
[{"id":"download_1","downloadedAt":"2026-08-29T05:00:00.000Z","resource":{"id":"res_1","title":"Starter Guide"}}]
```

### Combined library

```bash
curl "$API_BASE_URL/resources/library?search=starter&page=1&limit=12" \
  -H "$AUTH_HEADER"
```

Response (`200`):

```json
{
  "resources":{"items":[],"page":1,"limit":12,"total":0},
  "articles":{"items":[],"page":1,"limit":12,"total":0}
}
```

Use this only when one screen needs resources and articles together; otherwise use their focused endpoints to avoid fetching unneeded content.

## 6. Articles and announcements

Published articles and announcements are public; no header is needed to read them. Add the access token only when tracking article progress.

### Articles

```bash
curl "$API_BASE_URL/articles?search=welcome&tag=news"
curl "$API_BASE_URL/articles/art_1"
```

List response (`200`):

```json
[{"id":"art_1","title":"Welcome","slug":"welcome","summary":"...","content":"...","tags":[]}]
```

Track reading progress from the reader screen. Omit `progressPercent` to record completion (`100`).

```bash
curl -X POST "$API_BASE_URL/articles/art_1/read" \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{"progressPercent":65}'
```

Response (`201`):

```json
{"message":"Article progress saved successfully."}
```

Scenario: debounce progress updates (for example every 10–20 seconds or when navigating away); do not post on every scroll event.

### Announcements

```bash
curl "$API_BASE_URL/announcements"
curl "$API_BASE_URL/announcements/ann_1"
```

List response (`200`):

```json
[{"id":"ann_1","title":"New release","slug":"new-release","summary":"...","content":"...","type":"PRODUCT","isPublished":true}]
```

## 7. Plans, subscriptions, and billing

### Public plans and current subscription

```bash
curl "$API_BASE_URL/plans"
curl "$API_BASE_URL/subscriptions/me" -H "$AUTH_HEADER"
```

Plan list response (`200`):

```json
[{"id":"plan_1","name":"Pro","slug":"pro","priceCents":2900,"billingPeriod":"MONTHLY","benefits":["Full library"],"isActive":true}]
```

Subscription response (`200`):

```json
{
  "subscription":{"id":"sub_1","status":"ACTIVE","autoRenew":true,"plan":{"id":"plan_1","name":"Pro"}},
  "features":["Full library"]
}
```

### Checkout scenario

Only use a paid, active `planId` returned by `GET /plans`. Do not use this endpoint for a free plan.

```bash
curl -X POST "$API_BASE_URL/billing/checkout-session" \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{"planId":"11111111-1111-4111-8111-111111111111"}'
```

Response (`201`):

```json
{
  "checkoutSessionId":"cs_test_...",
  "url":"https://checkout.stripe.com/c/pay/cs_test_..."
}
```

Redirect the browser to `url`. On the success URL, poll/reload `GET /billing/me` or `GET /subscriptions/me`; the Stripe webhook updates the backend.

### Billing summary and invoice detail

```bash
curl "$API_BASE_URL/billing/me" -H "$AUTH_HEADER"
curl "$API_BASE_URL/billing/invoices/cs_test_123" -H "$AUTH_HEADER"
```

Billing summary response (`200`):

```json
{
  "currentPlan":{"id":"plan_1","name":"Pro"},
  "subscriptionStatus":"ACTIVE",
  "transactions":[{"transactionId":"cs_test_123","amountCents":2900,"status":"PAID","plan":{"name":"Pro"}}],
  "totalSpentCents":2900
}
```

### Manage, cancel, and resume subscription

For a Stripe-managed customer, portal is usually the best UI because Stripe handles payment methods and invoices:

```bash
curl -X POST "$API_BASE_URL/billing/portal-session" -H "$AUTH_HEADER"
```

Response (`201`):

```json
{"url":"https://billing.stripe.com/session/..."}
```

Cancel at period end:

```bash
curl -X POST "$API_BASE_URL/billing/cancel" \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{"reason":"Too expensive"}'
```

Response (`201`):

```json
{"message":"Subscription cancellation scheduled successfully."}
```

Resume auto-renewal:

```bash
curl -X POST "$API_BASE_URL/billing/resume" -H "$AUTH_HEADER"
```

Response (`201`):

```json
{"message":"Subscription resumed successfully."}
```

| Scenario | Client action |
| --- | --- |
| No Stripe customer for portal | API returns `400`. Hide/disable “Manage billing” until a paid checkout exists. |
| No local subscription for cancel/resume | API returns `404`. Reload subscription and show plan CTA. |
| Stripe is not configured | Billing action returns `400`. Do not show payments in that deployment. |
| User returns from Checkout | Reload billing/subscription; never trust query parameters as proof of payment. |

## 8. Notification and privacy settings

### Read/update notification preferences

`GET` creates default preferences the first time it is called.

```bash
curl "$API_BASE_URL/settings/notifications" -H "$AUTH_HEADER"

curl -X PATCH "$API_BASE_URL/settings/notifications" \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{
    "announcementsEnabled": true,
    "productUpdatesEnabled": true,
    "marketingEnabled": false,
    "newsletterEnabled": true
  }'
```

Response (`200`):

```json
{
  "id":"pref_1",
  "userId":"user_1",
  "announcementsEnabled":true,
  "productUpdatesEnabled":true,
  "marketingEnabled":false,
  "newsletterEnabled":true
}
```

The PATCH body requires all four boolean values. Initialize the form from GET and submit the complete object, not a partial patch.

### Privacy policy

```bash
curl "$API_BASE_URL/settings/privacy-policy"
```

Response (`200`):

```json
{"id":"page_1","slug":"privacy-policy","title":"Privacy policy","content":"...","visibility":"PUBLIC","isPublished":true}
```

## 9. Common error contract and current API gaps

```json
{
  "message": ["newPassword must be longer than or equal to 8 characters"],
  "error": "Bad Request",
  "statusCode": 400
}
```

| Need | Current status | Dashboard approach |
| --- | --- | --- |
| Saved-resource pagination beyond 50 | Not available | Use resource list with `savedOnly=true` for paginated results. |
| API-side resource entitlement enforcement | Not explicit in resource reads | Treat `visibility` as display data; add entitlement checks before exposing member-only URLs if needed. |
| Avatar/resource file validation limits | No explicit DTO-level limits | Validate client-side and add server upload limits before production. |
| Account recovery after deletion | Not available | Present deletion as final. |
| Article progress query endpoint | Not available | Dashboard only exposes aggregate read count/activity; add a progress-history endpoint if needed. |
