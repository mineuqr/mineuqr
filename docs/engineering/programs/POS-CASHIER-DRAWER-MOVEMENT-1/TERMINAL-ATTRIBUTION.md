# TERMINAL ATTRIBUTION

The existing POS cashier command contract requires a POS Terminal.

POS resolves the Terminal from `PosAccessContext` (`resolvePosTerminalAccess`). Foreign, inactive, and unknown terminals are denied. Operational Device is not used as POS Terminal.

CRMP Drawer Movement does **not** require or persist Terminal attribution. POS does not pass `terminalId` into CRMP. The movement row remains a CRMP Shift-owned cash fact.

Boundary: POS uses Terminal for access; CRMP does not store Terminal on the movement.
