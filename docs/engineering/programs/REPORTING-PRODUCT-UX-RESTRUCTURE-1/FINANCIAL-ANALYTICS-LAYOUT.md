# Financial Analytics Layout

## Purpose

Business **analysis** — not shift monitoring.

## Section order

1. **Period control** — month / year  
2. **Sales flow strip** — Total Sales → Refund Amount → Net Sales (existing DTO values)  
3. **Sales Trend** — interactive charts (`SettlementTrendsSection`; daily / weekly / monthly via existing controls)  
4. **Payment Analysis** — Cash · Mada · Visa · MasterCard · Apple Pay · STC Pay · Other (`PaymentMethodAnalysisSection`)  
5. **Sales Source Analysis** — Table Sessions · Waiter · QR · Kiosk (shell until channel facts publish)  
6. **Refund Analysis** — amount, count, by method, trend (`RefundAnalyticsSection`)  
7. **Tax Analysis** — Tax Collected (live); Sales Before / After Tax show **—** until tax-base facts exist  
8. **Exports** — Excel month / year (PDF remains suspended)

## Rules

- No six-card Today clone as the hero of this tab  
- Charts allowed only here (and nested trend/payment/refund sections)  
- Placeholders never invent numbers  
