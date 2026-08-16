# TEST PLAN

A. Authentication — `verifiedProcedure` / unauthenticated UNAUTHORIZED (existing trpc)
B. Restaurant staff access — owner/admin scope vs `pos_grant`
C. Tenant isolation — A↔B deny
D. Terminal ownership — foreign terminal deny
E. Lifecycle — registered/deactivated/replaced/unknown deny
F. Entitlement — missing/zero fail-closed; entitled active allow
G. Permission — missing / unrelated / client-required-only
H. Access context — server-derived permissions
I. PLATFORM_OWNER — not a cashier shortcut
J. Admin — scope without cashier
K. Staff — grant + POS_ACCESS
L. Device separation — no device required
M. Repeatable resolve / idempotent grant
N. Error reason codes
O. Commercial fail-closed
