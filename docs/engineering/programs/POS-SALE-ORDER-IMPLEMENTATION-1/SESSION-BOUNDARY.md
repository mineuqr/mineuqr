# SESSION BOUNDARY

Direct POS Sale is sessionless.

IdentityPlaceOrder already resolves an ephemeral operational session for station / counter fulfilment. POS does not create a dining Session or a POS Session.

If `sessionId` is supplied:

- lookup via existing `findSessionById`
- deny when missing or `session.restaurantId !==` authorized restaurant
- do **not** attach the new Order to that Session

Session association for Check intake is a later program.

Cross-restaurant session: DENY.
