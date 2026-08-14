# SIMULATED-PLAN.md

Simulation resolves the **current** Live Plan by catalog code (`basic`, `professional`, `enterprise`, or any future non-hidden Live Plan).

No snapshot, version, publication, retirement record, binding, or subscription is created.

Failed simulation (missing, hidden, unreadable, invalid identity, catalog failure) returns **DENIED**. The persisted mode stays `SIMULATED_PLAN` until the owner explicitly chooses **Return to Full Platform**.

## Catalog deletion assumption

The Commercial Catalog does not currently expose a separate archive/delete workflow for Live Plans. Hidden plans (`isHidden`) are treated as unavailable for simulation. If a code is absent from `planService.getByCode`, simulation fails closed.
