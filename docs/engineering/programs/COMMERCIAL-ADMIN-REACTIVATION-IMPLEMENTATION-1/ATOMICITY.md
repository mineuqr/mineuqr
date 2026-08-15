# ATOMICITY

Paid: Classification **A** â€” snapshot + identity + Binding in one SQL transaction.

Free: Classification **A** â€” concession + identity + Binding `planId` in one SQL transaction.

Offer is resolved before the paid transaction. Failure to persist does not return success.
