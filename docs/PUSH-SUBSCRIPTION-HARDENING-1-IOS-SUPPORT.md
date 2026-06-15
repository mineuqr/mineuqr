# PUSH-SUBSCRIPTION-HARDENING-1 — iOS push support matrix

Program: **BACKGROUND-NOTIFICATIONS-1A**  
Build: **PUSH-SUBSCRIPTION-HARDENING-1**

## Supported combinations

| Environment | PushManager | Expected background push | User action |
|-------------|-------------|--------------------------|-------------|
| **Safari Tab** (iOS) | No | Not supported | Add to Home Screen, open PWA, enable alerts |
| **Safari PWA** (Home Screen) | Yes (iOS 16.4+) | Supported when permission granted | Enable alerts on order page |
| **Chrome iOS Tab** | No | Not supported (WebKit) | Add to Home Screen, open PWA |
| **Chrome iOS PWA** | Yes (iOS 16.4+) | Supported when permission granted | Enable alerts on order page |

## Detection (client)

- `isIosWebKitTabWithoutPush()` — iPhone/iPad, not standalone, no `PushManager`
- UI shows numbered Home Screen install steps when `NOT_SUPPORTED` on iOS tab

## Subscription states

| State | UI headline | Background push |
|-------|-------------|-----------------|
| `NOT_SUPPORTED` | Background push not ready | No |
| `PERMISSION_REQUIRED` | Background push not ready | No |
| `PERMISSION_DENIED` | Background push not ready | No |
| `SUBSCRIBING` | Enabling background push… | Pending |
| `SUBSCRIBED` | **Background push ready** | Yes |
| `SUBSCRIBE_FAILED` | Background push not ready + reason | No |

Green success UI appears **only** when state is `SUBSCRIBED` (`pushSubscribed === true`).

## Diagnostics

Append `?pushTrace=1` to the order tracking URL to show an on-page panel:

- `permission` (before / after activation)
- `pushManager`, `serviceWorker`, `notification`
- `pushSubscribed`, `pushSubscribeReason`, `pushSubscriptionState`
- `isIosSafariTab`

Console / ops correlation codes:

- `unsupported`
- `permission_denied`
- `skipped_permission`
- `service_worker_failed`
- `subscription_failed`
- `subscribe_api_failed`
- `success` → server log `customer_push_subscribe_ok`

## Exit criteria (not closed until device proof)

**Android Chrome:** Enable alerts → `customer_push_subscribe_ok` → READY → `customer_push_send_ok` → notification received.

**iPhone PWA:** Same flow → lock screen notification received.
