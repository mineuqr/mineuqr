# SESSION BOUNDARY

Direct POS Check Intake is sessionless.

`ensureCheckForOrder` creates or returns a Check with `sessionId: null`.

Intake rejects a Check that is attached to a dining Session. No fake table Session is created.

Optional `sessionId` on POS Sale remains unused for attachment (certified in POS-SALE-ORDER-IMPLEMENTATION-1).
