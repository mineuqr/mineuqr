-- AUTH-POLICY-1B.5: enforce one account per email (NULL emails allowed).
-- Pre-requisite: resolve duplicate non-null emails before applying on existing DBs.
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
