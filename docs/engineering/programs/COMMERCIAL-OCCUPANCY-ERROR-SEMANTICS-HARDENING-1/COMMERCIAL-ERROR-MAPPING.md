# COMMERCIAL ERROR MAPPING

Classes unchanged in `commercialLimitOccupancy.ts`.

New mapper: `server/subscription-runtime/commercialOccupancyTrpc.ts`

- `throwCommercialOccupancyTrpcError(error, atLimitMessage)`
- Limit: `FORBIDDEN` + caller quota message + `cause` = Commercial error  
- Unavailable: `INTERNAL_SERVER_ERROR` + `تعذر التحقق من سعة الخطة التجارية.` + `cause` = Commercial error  

No SQL, table names, lock text, or stacks in the client message.

POS no longer wraps these classes as `PosEntitlementDeniedError`. `restaurant_not_found` remains POS entitlement/auth.
