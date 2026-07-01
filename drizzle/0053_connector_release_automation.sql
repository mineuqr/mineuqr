-- PRINT-RELEASE-AUTOMATION-1 — release promotion state machine + audit trail
ALTER TABLE `connector_published_releases`
  MODIFY `status` enum(
    'candidate',
    'published',
    'verified',
    'smoke_test_passed',
    'promoted',
    'active',
    'superseded'
  ) NOT NULL DEFAULT 'candidate';
--> statement-breakpoint
ALTER TABLE `connector_published_releases`
  MODIFY `publishedAt` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `connector_published_releases`
  ADD `verifiedAt` timestamp NULL AFTER `publishedAt`,
  ADD `smokeTestPassedAt` timestamp NULL AFTER `verifiedAt`,
  ADD `promotedAt` timestamp NULL AFTER `smokeTestPassedAt`,
  ADD `gitTag` varchar(128) NULL AFTER `activatedAt`,
  ADD `commitSha` varchar(64) NULL AFTER `gitTag`,
  ADD `workflowRunId` varchar(64) NULL AFTER `commitSha`,
  ADD `publisher` varchar(128) NULL AFTER `workflowRunId`;
