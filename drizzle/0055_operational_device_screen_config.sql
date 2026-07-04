-- DEVICE-MANAGEMENT-1 Screen Management — presentation configuration (management-only)
ALTER TABLE `operational_devices`
  ADD COLUMN `screenConfig` json NULL AFTER `displayName`;
