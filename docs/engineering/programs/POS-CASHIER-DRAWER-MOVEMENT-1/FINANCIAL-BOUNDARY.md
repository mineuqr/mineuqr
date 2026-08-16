# FINANCIAL BOUNDARY

This command records an operational cash fact on the CRMP Financial Shift drawer.

It is not Order, Check, Settlement, Payment, Revenue, Tax, or a KPI.

POS does not:

- modify Check or Order
- create a payment tender
- create a Settlement transaction
- calculate expected cash (CRMP returns it on the shift view)
- write Revenue

Expected cash remains Shift-owned inside CRMP.
