import { InMemoryOrderReadProjectionStore } from "./infrastructure/persistence/inmemory/InMemoryOrderReadProjectionStore";
import { DrizzleOrderReadProjectionStore } from "./infrastructure/persistence/drizzle/DrizzleOrderReadProjectionStore";
import { DrizzleOrderReadContextLoader } from "./infrastructure/persistence/DrizzleOrderReadContextLoader";
import { createPersistingProjectionRepositories } from "./infrastructure/persistence/PersistingOrderReadProjectionRepositories";
import { OrderReadProjectionMaterializer } from "./projections/materializers/OrderReadProjectionMaterializer";
import { OrderReadProjectionBackfillService } from "./infrastructure/backfill/OrderReadProjectionBackfillService";
import { OrderCategoryProjectionBuilder } from "./projections/builders/OrderCategoryProjectionBuilder";
import { drizzleCategoryResolutionPort } from "./infrastructure/persistence/DrizzleCategoryResolutionPort";
import { OrderReadCategoryBackfillService } from "./infrastructure/backfill/OrderReadCategoryBackfillService";
import { OrderReadCategoryBackfillVerifier } from "./infrastructure/backfill/OrderReadCategoryBackfillVerifier";
import { drizzleCategoryBackfillLineItemStore } from "./infrastructure/backfill/DrizzleCategoryBackfillLineItemStore";

const inMemoryStore = new InMemoryOrderReadProjectionStore();
const drizzleStore = new DrizzleOrderReadProjectionStore();
const contextLoader = new DrizzleOrderReadContextLoader();

const innerRepos =
  process.env.NODE_ENV === "test"
    ? inMemoryStore.asRepositories()
    : createPersistingProjectionRepositories(
        inMemoryStore.asRepositories(),
        drizzleStore,
        contextLoader
      );

export const orderReadProjectionRepositories = innerRepos;

export const orderReadProjectionMaterializer = new OrderReadProjectionMaterializer(
  orderReadProjectionRepositories,
  contextLoader,
  inMemoryStore
);

export const orderReadProjectionBackfillService = new OrderReadProjectionBackfillService(
  contextLoader,
  drizzleStore,
  orderReadProjectionMaterializer
);

const categoryProjectionBuilder = new OrderCategoryProjectionBuilder(
  drizzleCategoryResolutionPort
);

export const orderReadCategoryBackfillService = new OrderReadCategoryBackfillService(
  drizzleCategoryBackfillLineItemStore,
  categoryProjectionBuilder
);

export const orderReadCategoryBackfillVerifier = new OrderReadCategoryBackfillVerifier(
  drizzleCategoryBackfillLineItemStore
);

export {
  inMemoryStore,
  drizzleStore,
  contextLoader,
  DrizzleOrderReadProjectionStore,
  InMemoryOrderReadProjectionStore,
  OrderReadProjectionMaterializer,
  OrderReadProjectionBackfillService,
};
