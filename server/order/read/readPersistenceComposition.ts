import { InMemoryOrderReadProjectionStore } from "./infrastructure/persistence/inmemory/InMemoryOrderReadProjectionStore";
import { DrizzleOrderReadProjectionStore } from "./infrastructure/persistence/drizzle/DrizzleOrderReadProjectionStore";
import { DrizzleOrderReadContextLoader } from "./infrastructure/persistence/DrizzleOrderReadContextLoader";
import { createPersistingProjectionRepositories } from "./infrastructure/persistence/PersistingOrderReadProjectionRepositories";
import { OrderReadProjectionMaterializer } from "./projections/materializers/OrderReadProjectionMaterializer";
import { OrderReadProjectionBackfillService } from "./infrastructure/backfill/OrderReadProjectionBackfillService";

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

export {
  inMemoryStore,
  drizzleStore,
  contextLoader,
  DrizzleOrderReadProjectionStore,
  InMemoryOrderReadProjectionStore,
  OrderReadProjectionMaterializer,
  OrderReadProjectionBackfillService,
};
