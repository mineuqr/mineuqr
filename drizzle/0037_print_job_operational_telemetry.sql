-- THERMAL-PRINTING-13I.3C.3 — print job correlation + operational telemetry events
ALTER TABLE `print_jobs`
  ADD COLUMN `correlationId` varchar(64) NULL AFTER `idempotencyKey`;

CREATE UNIQUE INDEX `print_jobs_correlation_id_unique` ON `print_jobs` (`correlationId`);

CREATE TABLE `print_job_telemetry_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `printJobId` int NOT NULL,
  `correlationId` varchar(64) NOT NULL,
  `eventType` varchar(64) NOT NULL,
  `restaurantId` int NOT NULL,
  `agentId` varchar(128) NULL,
  `printerId` int NULL,
  `severity` enum('info','warn','error') NOT NULL DEFAULT 'info',
  `payloadJson` json NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `print_job_telemetry_events_print_job_id` (`printJobId`),
  KEY `print_job_telemetry_events_correlation_id` (`correlationId`),
  KEY `print_job_telemetry_events_job_event` (`printJobId`, `eventType`)
);
