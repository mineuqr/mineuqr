# Regional Commercial Policies — CC-15

**Program:** COMMERCIAL-CATALOG-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29  
**Law:** CC-15 Regional Commercial Policies

---

## 1. Purpose

Commercial Catalog must support **regional commercialization**. Offerings are not assumed globally uniform.

---

## 2. Policy dimensions (Catalog-owned)

| Dimension | Role |
|-----------|------|
| Country | Offer eligibility / storefront |
| Region | Grouping / price books |
| Currency | Contract currency |
| Tax Policy | *Which* tax regime applies (metadata for Billing) |
| Distribution Partner | Channel / reseller availability |
| Regulatory Constraints | Block/allow offers |

---

## 3. Examples

| Plan family | Region | Commercial price |
|-------------|--------|------------------|
| Business | Saudi Arabia | 349 SAR |
| Business | United Arab Emirates | 349 AED |
| Business | Philippines | PHP pricing |

Same Plan Identity / Version may expose multiple regional price rows; Snapshot captures the chosen regional commercial facts (**CC-13**).

---

## 4. Ownership boundary

| Owner | Owns |
|-------|------|
| **Commercial Catalog** | Regional availability, currency price rows, tax-policy *references*, partner eligibility |
| **Billing** | Tax calculation, remittance, invoice tax lines — **consumes** Catalog tax-policy ref |
| **Subscription** | Binds Tenant to Version + regional context in Snapshot — **does not own** regional catalog |

---

## 5. Laws

| Rule ID | Statement |
|---------|-----------|
| **REG-01** | Regional policies are Catalog SSOT (**CC-15**). |
| **REG-02** | Billing must not invent regional SKUs outside Catalog. |
| **REG-03** | Subscription must not redefine country price lists. |
| **REG-04** | Publication may require at least one valid regional price for intended markets (**CC-16**). |
