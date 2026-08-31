# SAUDI-TAX-INVOICE-PHASE-1 — Official Requirements

## Sources (official)

1. https://zatca.gov.sa/en/E-Invoicing/PreparingYourBusiness/Phase1/Pages/How-to-prepare.aspx  
   - Phase 1: compliant e-invoicing solution; required fields  
   - Tax Invoice (B2B): buyer VAT if registered; title; QR optional  
   - Simplified (B2C): mandatory QR; title  

2. https://zatca.gov.sa/en/E-Invoicing/SystemsDevelopers/Documents/QRCodeCreation.pdf  
   - TLV Base64 QR; tags 1–5 due 4 Dec 2021; tags 6–9 due 1 Jan 2023 (Phase 2)

3. https://zatca.gov.sa/en/E-Invoicing/Introduction/Guidelines/Pages/default.aspx  
   - Simplified / Detailed guidelines library

4. https://zatca.gov.sa/en/E-Invoicing/SystemsDevelopers/Pages/E-Invoice-specifications.aspx  
   - Data dictionary / XML standards (Phase 2 XML not implemented here)

## Phase 1 implemented interpretation

| Requirement | Implementation |
|-------------|----------------|
| Electronic generation | Structured `phase1DocumentJson` + HTML render |
| Simplified mandatory QR | TLV tags 1–5 Base64 |
| Tax Invoice QR | Not enabled (optional left off) |
| Invoice title | Arabic + English |
| Seller fields | Seller snapshot |
| Buyer VAT on Tax Invoice | Buyer snapshot taxNumber when Standard |
| Storage | DB columns on `saudi_tax_invoices` |
| No Fatoora | Confirmed by guards |
