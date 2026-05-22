ALTER TABLE `restaurants` ADD `countryCode` varchar(2);--> statement-breakpoint
ALTER TABLE `restaurants` ADD `currencyCode` varchar(3) DEFAULT 'SAR';--> statement-breakpoint
ALTER TABLE `restaurants` ADD `currencySymbol` varchar(10) DEFAULT 'ر.س';