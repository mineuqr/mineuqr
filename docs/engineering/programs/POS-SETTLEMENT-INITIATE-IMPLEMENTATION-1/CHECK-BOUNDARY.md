# CHECK BOUNDARY

The Check remains owned by Check Domain.

POS may:

- locate the Check associated with the canonical Order via `findBlockingMembershipForOrder`
- load it via `getCheckById`
- validate restaurant ownership and open eligibility
- request settlement through `settleCheckPaidByIdDetailed`

POS must not:

- calculate a new Check total
- copy monetary totals into a POS aggregate
- maintain settlement state as a POS write model
- create a second Check
- manipulate Check persistence outside the existing Check service boundary

Order remains owned by Order Domain. Channel remains `cashier_pos`. POS does not mutate Order financial totals or replace Order identity.
