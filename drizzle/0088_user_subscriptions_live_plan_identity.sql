-- COMMERCIAL-OD-2-SUBSCRIPTION-LIVE-PLAN-IDENTITY-1
-- COMMERCIAL-OD-2-0088-MIGRATION-SAFETY-FIX-1
-- Persist canonical Live Plan UUID on user_subscriptions.planId.
-- Maps leftover integers via commercial_plans.code (not hardcoded UUIDs).
-- Sequence: populate → validate → destructive cutover.
-- TiDB DDL is NOT transactional. Validation MUST abort before DROP COLUMN.
-- Does NOT touch Charged Terms, bindings, invoices, payments, or subscription_plans.

ALTER TABLE `user_subscriptions` ADD COLUMN `planIdUuid` varchar(36) NULL;
--> statement-breakpoint
UPDATE `user_subscriptions` `us`
INNER JOIN `commercial_plans` `cp`
  ON `cp`.`code` = CASE `us`.`planId`
    WHEN 30001 THEN 'basic'
    WHEN 30002 THEN 'professional'
    WHEN 30003 THEN 'enterprise'
    ELSE NULL
  END
SET `us`.`planIdUuid` = `cp`.`id`;
--> statement-breakpoint
CREATE TEMPORARY TABLE `_0088_live_plan_identity_gate` (
  `ok` tinyint NOT NULL PRIMARY KEY
);
--> statement-breakpoint
INSERT INTO `_0088_live_plan_identity_gate` (`ok`) VALUES (1);
--> statement-breakpoint
-- Fail closed BEFORE DROP: duplicate PK if any conversion predicate is true.
INSERT INTO `_0088_live_plan_identity_gate` (`ok`)
SELECT 1
WHERE
  EXISTS (
    SELECT 1 FROM `user_subscriptions`
    WHERE `planId` NOT IN (30001, 30002, 30003)
  )
  OR EXISTS (
    SELECT 1 FROM `user_subscriptions`
    WHERE `planIdUuid` IS NULL
  )
  OR EXISTS (
    SELECT 1 FROM `user_subscriptions` `us`
    LEFT JOIN `commercial_plans` `cp` ON `cp`.`id` = `us`.`planIdUuid`
    WHERE `us`.`planIdUuid` IS NOT NULL AND `cp`.`id` IS NULL
  )
  OR (
    (SELECT COUNT(*) FROM `user_subscriptions`)
    <>
    (SELECT COUNT(*) FROM `user_subscriptions` WHERE `planIdUuid` IS NOT NULL)
  )
  OR EXISTS (
    SELECT 1
    FROM (
      SELECT 'basic' AS `code`
      UNION ALL SELECT 'professional'
      UNION ALL SELECT 'enterprise'
    ) `required`
    LEFT JOIN `commercial_plans` `cp` ON `cp`.`code` = `required`.`code`
    GROUP BY `required`.`code`
    HAVING COUNT(`cp`.`id`) <> 1
  )
  OR EXISTS (
    SELECT 1
    FROM `user_subscriptions`
    GROUP BY `planId`
    HAVING COUNT(DISTINCT `planIdUuid`) > 1
  );
--> statement-breakpoint
DROP TEMPORARY TABLE `_0088_live_plan_identity_gate`;
--> statement-breakpoint
ALTER TABLE `user_subscriptions` DROP COLUMN `planId`;
--> statement-breakpoint
ALTER TABLE `user_subscriptions` CHANGE `planIdUuid` `planId` varchar(36) NOT NULL;
