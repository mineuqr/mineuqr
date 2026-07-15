-- OPERATIONAL-SCREEN-CATALOG-POLICY-1 — add waiter_display operational device role.
-- Additive enum extension only; hidden roles remain.

ALTER TABLE `operational_devices` MODIFY COLUMN `role` enum(
  'kitchen_display',
  'expo_display',
  'pickup_display',
  'customer_display',
  'print_monitor',
  'self_ordering_kiosk',
  'waiter_display'
) NOT NULL;
