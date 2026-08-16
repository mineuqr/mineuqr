# TEST PLAN

A. Authorized cashier opens/closes Register  
B. POS_ACCESS without SHIFT_OPEN denied; owner/admin/PLATFORM_OWNER without grants denied  
C. Shift open uses server cashier identity; retry is idempotent  
D. Shift close uses active CRMP shift; forged shift id rejected  
E. Closed register cannot host a shift; missing shift cannot close  
F. Cross-restaurant register rejected; terminal/register device mismatch rejected  
G. Client cashier/operator ids ignored  
H. Architecture guards: no POS cashier/cash tables, no drawer movement API, CRMP auth unchanged  

Regression: POS folder, CRMP Register/Shift, settlement, Check.
