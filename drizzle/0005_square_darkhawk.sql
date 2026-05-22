CREATE TABLE `countries_currencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`countryNameAr` varchar(255) NOT NULL,
	`countryNameEn` varchar(255) NOT NULL,
	`countryCode` varchar(2) NOT NULL,
	`currencyCode` varchar(3) NOT NULL,
	`currencySymbol` varchar(10) NOT NULL,
	`currencyNameAr` varchar(255) NOT NULL,
	`currencyNameEn` varchar(255) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `countries_currencies_code_unique` ON `countries_currencies` (`countryCode`);