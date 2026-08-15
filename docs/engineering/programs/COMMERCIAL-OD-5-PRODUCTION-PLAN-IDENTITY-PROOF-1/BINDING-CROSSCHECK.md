# BINDING-CROSSCHECK

Production `commercial_subscription_bindings`: **2 rows**.

| legacyPlanId | Binding UUID | Expected UUID (bridge→code→catalog) | Charged amount present | Agrees |
|-------------:|--------------|-------------------------------------|------------------------|--------|
| 30001 | `79cf7bf7-c3b6-45de-8f20-42897cd493ac` | `79cf7bf7-c3b6-45de-8f20-42897cd493ac` | yes | **YES** |
| 30003 | `d836bd10-9d9f-4408-a076-f921354d785a` | `d836bd10-9d9f-4408-a076-f921354d785a` | yes | **YES** |

**100% agreement.** No mismatch. No repair.

Both bound rows already store Charged Terms fields (amount, currency, cycle). Identity proof does not reconstruct them.
