# SUBSCRIPTION-VALIDATION-1 — Android Chrome enrollment procedure

Build: **SUBSCRIPTION-VALIDATION-1**

## Goal

Prove `customer_push_subscribe_ok` on Android Chrome after **Enable Notifications**.

Foreground alerts and push delivery are out of scope.

---

## Preconditions

- Production deploy includes SUBSCRIPTION-VALIDATION-1
- Android device with Chrome
- Active order in `pending` or `preparing` status
- VAPID configured on server (`GET /api/push/vapid-public-key` → 200)

---

## Step 1 — Open order page with trace

```text
https://www.mineuqr.com/menu/{slug}/order/{trackingToken}?pushTrace=1
```

Confirm on-page **Push enrollment trace** panel appears below the notification banner.

---

## Step 2 — Enable Notifications

1. Tap **Enable Notifications**
2. Accept the browser permission prompt

---

## Step 3 — pushTrace panel (SV-2)

Expected final values:

| Field | Success value |
|-------|----------------|
| `pushSubscribed` | `true` |
| `pushSubscribeReason` | `success` |
| `pushSubscriptionState` | `SUBSCRIBED` |
| `failureStage` | `—` |
| `lastStage` | `enrollment_complete` |
| `subscriptionId` | numeric ID |
| `subscribeHttpStatus` | `200` |
| `stages` | includes full chain (see below) |

Expected stage chain:

```text
activation_started
→ permission_before
→ permission_after
→ support_check
→ vapid_fetch_started
→ vapid_fetch_success
→ sw_registration_started
→ sw_registration_success
→ push_subscribe_started (or push_subscribe_success if reused)
→ push_subscribe_success
→ subscribe_api_started
→ subscribe_api_success
→ enrollment_complete
```

On failure, `failureStage` shows exact stop point (SV-4):

- `unsupported`
- `permission_denied`
- `service_worker_failed`
- `subscription_failed`
- `subscribe_api_failed`

---

## Step 4 — Browser network tab

Confirm requests in order:

1. `GET /api/push/vapid-public-key` → 200
2. `POST /api/push/subscribe` → 200

`POST` body includes `trackingToken`, `slug`, `subscription.endpoint`, `subscription.keys`.

---

## Step 5 — Vercel logs

```powershell
npx vercel logs www.mineuqr.com --json
```

Filter for order session window. Expected sequence:

```text
customer_push_subscribe_received
customer_push_subscribe_ok
```

Must **not** appear on success path:

```text
customer_push_subscribe_failed
```

---

## Step 6 — UI (SV-3)

Green banner **only** after `POST /api/push/subscribe` succeeds:

```text
Notifications enabled
We'll notify you when your order is ready.
```

Before API success: benefit prompt, loading, or failure message — never green success.

---

## Step 7 — Database proof

Confirm row in `customer_push_subscriptions` for the order's `orderId` with:

- `endpoint` matching browser push subscription
- `isActive = true`
- recent `createdAt` / `updatedAt`

---

## Success evidence path

```text
Enable Notifications (Android Chrome)
  → [mineuqr:push] activation_started
  → … staged trace …
  → [mineuqr:push] subscribe_api_success
  → [mineuqr:push] enrollment_complete
  → POST /api/push/subscribe 200
  → Vercel: customer_push_subscribe_ok
  → UI: Notifications enabled
  → DB: customer_push_subscriptions row
```

---

## Failure quick reference

| Symptom | Check |
|---------|--------|
| Stops at `support_check` + `unsupported` | Chrome version / WebView, not tab restrictions |
| Stops at `permission_denied` | Re-enable notifications in site settings |
| Stops at `vapid_fetch_failed` | VAPID env vars on Vercel |
| Stops at `sw_registration_failed` | `/sw.js` reachable, HTTPS |
| Stops at `push_subscribe_failed` | GCM/FCM keys, applicationServerKey |
| Stops at `subscribe_api_failed` | Server logs `customer_push_subscribe_failed` reason |
