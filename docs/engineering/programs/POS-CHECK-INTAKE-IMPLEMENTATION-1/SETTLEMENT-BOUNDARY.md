# SETTLEMENT BOUNDARY

POS Check Intake does not call `settleCheckPaid`, `settlePaid`, `markPaid`, void, complimentary, or refund.

Existing settlement APIs are unchanged.

**Next program:** `POS-SETTLEMENT-INITIATE-IMPLEMENTATION-1`.

Existing Check settlement (`settleCheckPaidByIdDetailed`) does not require a POS Register or Shift. Register remains a later POS program, not a prerequisite for Check settlement.
