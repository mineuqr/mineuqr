# TENANT ISOLATION

Restaurant scope is server-side:

1. `assertRestaurantPosScope` on the authenticated user
2. `PosAccessContext.restaurantId`
3. CRMP Register get in that restaurant
4. CRMP active Shift for that Register

A Restaurant A cashier cannot:

- create a movement for Restaurant B
- reference Restaurant B Register or Shift
- use Restaurant B Terminal

Client `restaurantId` is a routing input, not authority. Forged ids fail restaurant scope or terminal/register isolation.
