# PRODUCTION READINESS

LOCAL HARDENING ONLY.

Done:

- POS Sale mapping insert joins the existing Order save transaction
- Unique mapping collision rolls back the companion Order
- Fingerprint mismatch still fail-closed
- No schema change, no production data, no deploy

Not done:

- Commit / push / deploy
- Production migration
- Live TiDB race drill
- Check+Order single transaction
- POS UI / freeze / ZATCA
