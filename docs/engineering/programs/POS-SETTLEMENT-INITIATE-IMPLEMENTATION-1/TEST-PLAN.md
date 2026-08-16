# TEST PLAN

A. Authorized cashier can initiate settlement (`POS_ACCESS` + `SETTLEMENT_INITIATE`)  
B. Cashier without `SETTLEMENT_INITIATE` rejected; `POS_ACCESS` alone insufficient  
C. Owner / admin / PLATFORM_OWNER without explicit POS grants rejected  
D. Correct restaurant succeeds; cross-restaurant Order / Check rejected  
E. Wrong / inactive / replaced / foreign terminal rejected  
F. Missing Check rejected  
G. Already terminal Check rejected (`paid` / `complimentary` / `voided`)  
H. Invalid Check lifecycle rejected  
I. Client total / cashier / channel / restaurant extras ignored  
J. Idempotent retry returns canonical prior result  
K. Same key + different Order → conflict  
L. Concurrent same key → one settle  
M. Lost Check CAS race → safe paid result, no second mutation  
N. Order channel remains `cashier_pos`; Register/Shift not required  
O. Architecture guards (no POS financial table, no public `settlePaid`, no Reporting/ZATCA/offline)

Regression: existing POS suites, Check M4 session optionality, SettleOrderPaid, Register domain, channel governance.
