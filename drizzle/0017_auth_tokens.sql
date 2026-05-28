ALTER TABLE `users`
  ADD `emailVerifiedAt` timestamp NULL,
  ADD `passwordChangedAt` timestamp NULL;

CREATE TABLE `auth_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `type` enum('password_reset','email_verify') NOT NULL,
  `tokenHash` varchar(64) NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `usedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE INDEX `auth_tokens_user_id` ON `auth_tokens` (`userId`);
CREATE INDEX `auth_tokens_token_hash` ON `auth_tokens` (`tokenHash`);
CREATE INDEX `auth_tokens_type` ON `auth_tokens` (`type`);

