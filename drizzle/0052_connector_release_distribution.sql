-- PRINT-RELEASE-DISTRIBUTION-1 — published connector release registry
CREATE TABLE `connector_published_releases` (
  `version` varchar(32) NOT NULL,
  `productName` varchar(128) NOT NULL,
  `installerFileName` varchar(255) NOT NULL,
  `installerSha256` varchar(64) NOT NULL,
  `storageKey` varchar(512) NOT NULL,
  `releaseManifestJson` json NOT NULL,
  `status` enum('published','active','superseded') NOT NULL DEFAULT 'published',
  `publishedAt` timestamp NOT NULL,
  `activatedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `connector_published_releases_version` PRIMARY KEY(`version`)
);
--> statement-breakpoint
CREATE INDEX `connector_published_releases_status` ON `connector_published_releases` (`status`);
