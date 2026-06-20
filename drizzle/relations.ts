import { relations } from "drizzle-orm/relations";
import {
	orders,
	printJobAttempts,
	printJobs,
	printers,
	restaurantPrintSettings,
	restaurants,
} from "./schema";

export const printersRelations = relations(printers, ({ one, many }) => ({
	restaurant: one(restaurants, {
		fields: [printers.restaurantId],
		references: [restaurants.id],
	}),
	printJobs: many(printJobs),
}));

export const restaurantPrintSettingsRelations = relations(
	restaurantPrintSettings,
	({ one }) => ({
		restaurant: one(restaurants, {
			fields: [restaurantPrintSettings.restaurantId],
			references: [restaurants.id],
		}),
		defaultPrinter: one(printers, {
			fields: [restaurantPrintSettings.defaultPrinterId],
			references: [printers.id],
		}),
	})
);

export const printJobsRelations = relations(printJobs, ({ one, many }) => ({
	restaurant: one(restaurants, {
		fields: [printJobs.restaurantId],
		references: [restaurants.id],
	}),
	order: one(orders, {
		fields: [printJobs.orderId],
		references: [orders.id],
	}),
	printer: one(printers, {
		fields: [printJobs.printerId],
		references: [printers.id],
	}),
	attempts: many(printJobAttempts),
}));

export const printJobAttemptsRelations = relations(printJobAttempts, ({ one }) => ({
	printJob: one(printJobs, {
		fields: [printJobAttempts.printJobId],
		references: [printJobs.id],
	}),
}));
