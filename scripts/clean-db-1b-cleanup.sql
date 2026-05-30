-- =============================================================================
-- CLEAN-DB-1B — Historical orphan cleanup (PREPARED ONLY — DO NOT RUN WITHOUT APPROVAL)
-- Generated: 2026-05-30
-- Database: production TiDB (read-only audit confirmed orphan counts)
--
-- PROTECTED (must remain after cleanup):
--   users.id              = 1   (k.sh61@yahoo.com)
--   restaurants.id        = 1   (مطعم خالد)
--   user_subscriptions.id = 30001
--
-- Estimated deletions (SAFE scope): 168 rows
--   order_items: 32 | orders: 22 | restaurant_tables: 25
--   renewal_notifications: 49 | invoices: 36 | user_subscriptions: 3
--   restaurants: 1
--
-- EXCLUDED from this script (REVIEW REQUIRED — see report):
--   15 order_items on restaurantId=1 with missing menuItemId (admin order history)
-- =============================================================================

-- ─── Pre-flight (run manually; all must look correct) ───────────────────────
-- SELECT id, email, role FROM users WHERE id = 1;
-- SELECT id, userId, slug FROM restaurants WHERE id = 1;
-- SELECT id, userId, restaurantId, status FROM user_subscriptions WHERE id = 30001;

-- Orphan counts (expect matches audit):
-- SELECT COUNT(*) FROM invoices i
--   LEFT JOIN users u ON u.id = i.userId
--   LEFT JOIN user_subscriptions s ON s.id = i.subscriptionId
--   WHERE (u.id IS NULL OR s.id IS NULL) AND i.userId != 1
--     AND (i.subscriptionId IS NULL OR i.subscriptionId != 30001);

START TRANSACTION;

-- 1. order_items — orphan orders OR missing menu on non-protected restaurants
DELETE oi FROM order_items oi
LEFT JOIN orders o ON o.id = oi.orderId
LEFT JOIN menu_items m ON m.id = oi.menuItemId
LEFT JOIN restaurants r ON r.id = o.restaurantId
WHERE
  o.id IS NULL
  OR r.id IS NULL
  OR (
    m.id IS NULL
    AND (o.restaurantId IS NULL OR o.restaurantId != 1)
  );

-- 2. orders — missing restaurant (exclude protected restaurant id)
DELETE o FROM orders o
LEFT JOIN restaurants r ON r.id = o.restaurantId
WHERE r.id IS NULL AND o.restaurantId != 1;

-- 3. renewal_notifications — missing user or subscription (exclude protected)
DELETE n FROM renewal_notifications n
LEFT JOIN users u ON u.id = n.userId
LEFT JOIN user_subscriptions s ON s.id = n.subscriptionId
WHERE
  (u.id IS NULL OR (n.subscriptionId IS NOT NULL AND s.id IS NULL))
  AND n.userId != 1
  AND (n.subscriptionId IS NULL OR n.subscriptionId != 30001);

-- 4. invoices — missing user or subscription (exclude protected)
DELETE i FROM invoices i
LEFT JOIN users u ON u.id = i.userId
LEFT JOIN user_subscriptions s ON s.id = i.subscriptionId
WHERE
  (u.id IS NULL OR s.id IS NULL)
  AND i.userId != 1
  AND (i.subscriptionId IS NULL OR i.subscriptionId != 30001);

-- 5. user_subscriptions — missing user or restaurant (exclude protected)
DELETE s FROM user_subscriptions s
LEFT JOIN users u ON u.id = s.userId
LEFT JOIN restaurants r ON r.id = s.restaurantId AND s.restaurantId != 0
WHERE
  (u.id IS NULL OR (s.restaurantId != 0 AND r.id IS NULL))
  AND s.id != 30001
  AND s.userId != 1;

-- 6. restaurant_tables — missing restaurant
DELETE t FROM restaurant_tables t
LEFT JOIN restaurants r ON r.id = t.restaurantId
WHERE r.id IS NULL AND t.restaurantId != 1;

-- 7. restaurant_holidays — missing restaurant (if any)
DELETE h FROM restaurant_holidays h
LEFT JOIN restaurants r ON r.id = h.restaurantId
WHERE r.id IS NULL AND h.restaurantId != 1;

-- 8. offers — missing restaurant (if any)
DELETE f FROM offers f
LEFT JOIN restaurants r ON r.id = f.restaurantId
WHERE r.id IS NULL AND f.restaurantId != 1;

-- 9. menu_items — missing restaurant (if any)
DELETE mi FROM menu_items mi
LEFT JOIN restaurants r ON r.id = mi.restaurantId
WHERE r.id IS NULL AND mi.restaurantId != 1;

-- 10. categories — missing restaurant (if any)
DELETE c FROM categories c
LEFT JOIN restaurants r ON r.id = c.restaurantId
WHERE r.id IS NULL AND c.restaurantId != 1;

-- 11. restaurants — missing owner (exclude protected)
DELETE r FROM restaurants r
LEFT JOIN users u ON u.id = r.userId
WHERE u.id IS NULL AND r.id != 1;

-- ─── Post-check (expect 0 orphan rows in SAFE categories) ───────────────────
-- Re-run audit: node scripts/clean-db-orphan-audit-readonly.mjs

-- EXECUTED 2026-05-30 via scripts/clean-db-1b-execute.mjs (171 rows, COMMIT)
-- COMMIT;
-- ROLLBACK;
