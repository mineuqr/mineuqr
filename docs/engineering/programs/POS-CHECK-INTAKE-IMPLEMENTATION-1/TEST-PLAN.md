# TEST PLAN

A. Authorization — `POS_ACCESS` + `CHECK_INTAKE`  
B. Owner / admin / PLATFORM_OWNER without grants  
C. Terminal ownership / inactive / replaced / foreign  
D. Tenant isolation (user, terminal, Order)  
E. Order eligibility (`cashier_pos`, missing, cancelled, QR)  
F. Terminal Check enrollment → deny  
G. Check remains open / sessionless  
H. Channel preservation  
I. Client cashier / totals ignored  
J. Idempotency replay / conflict / different key  
K. Concurrent same request  
L. Architecture guards (no POS Check table, no settle, no Register)

Regression: IdentityPlaceOrder, Check membership / sessionless, SettleOrderPaid, channel governance, existing POS suites.
