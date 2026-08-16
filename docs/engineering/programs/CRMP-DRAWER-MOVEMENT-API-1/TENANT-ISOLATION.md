# TENANT ISOLATION

Every mutation is keyed by `restaurantId` from the authenticated CRMP access assertion.

Register load: `registers.findById(restaurantId, registerId)` — foreign register IDs return not found.

Shift load: `shifts.findById(restaurantId, financialShiftId)` — foreign shift IDs return not found.

Active shift resolve: `findActiveByRegister(restaurantId, registerId)`.

Client `financialShiftId` is a hint. If it does not match the restaurant-scoped active shift, the command fails closed.

Restaurant A MUST NOT:

- record a movement on Restaurant B's Register
- attach a movement to Restaurant B's Shift
- mutate Restaurant B expected cash
