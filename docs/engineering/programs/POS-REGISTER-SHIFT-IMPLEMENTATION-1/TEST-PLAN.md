# TEST PLAN

A. Existing Register domain regression (`RegisterDomainService`)  
B. Existing Shift domain regression (`FinancialShiftDomainService`)  
C. POS access / terminal / sale / intake still pass  
D. POS settlement with resolved CRMP context succeeds  
E. POS settlement without Register/Shift context rejected  
F. Closed Register → `register_closed`  
G. Missing Financial Shift → `shift_required`  
H. Cross-restaurant Register rejected  
I. Client registerId/shiftId ignored  
J. Terminal/cashier derived from PosAccessContext  
K. Architecture guards: no POS Register tables, no CRMP lifecycle duplication  
L. Channel remains `cashier_pos`  
M. Check/Settlement still canonical  
N. CRMP architecture guards unchanged
