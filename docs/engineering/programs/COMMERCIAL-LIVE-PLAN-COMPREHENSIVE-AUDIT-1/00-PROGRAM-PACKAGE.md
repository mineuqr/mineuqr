# 00 — PROGRAM PACKAGE

**Program:** COMMERCIAL-LIVE-PLAN-COMPREHENSIVE-AUDIT-1  
**Role:** Architecture Authority / TDA  
**Date:** 2026-08-15  
**Mode:** READ-ONLY investigation  
**HEAD:** `5e769ae12c128c4c5ed10390f0800e85d1b65fe6`  
**Status:** **AUDIT COMPLETE** — no runtime, schema, or Production mutation

## Objective

Establish the complete current truth of `commercial_plans` and certify whether it is the single canonical commercial catalog and plan authority.

## Non-goals (honored)

No application/schema/Production mutation. No Checkout/MRR/Charged Terms/Payment Provider changes. OD-4, SAFE DELETE, POS, Tax/FX/Refund programs **not started**.

## Package

| File | Contents |
|------|----------|
| `01-LIVE-PLAN-SCHEMA-FORENSICS.md` | `commercial_plans` fields |
| `02-IDENTITY-AUDIT.md` | UUID / code / identity ≠ other domains |
| `03-PRICING-AUDIT.md` | Offer List Price vs other amounts |
| `04-CHECKOUT-DEPENDENCY.md` | Checkout path |
| `05-SUBSCRIPTION-DEPENDENCY.md` | `user_subscriptions.planId` |
| `06-CHARGED-TERMS-BOUNDARY.md` | Historical contract |
| `07-ENTITLEMENT-BOUNDARY.md` | Capabilities / limits |
| `08-ADMIN-CATALOG-AUDIT.md` | Plan Editor |
| `09-PUBLIC-CATALOG-AUDIT.md` | PublicCatalogOffering |
| `10-LEGACY-DEPENDENCY-MATRIX.md` | Leftover artifacts |
| `11-COUNTRY-TAX-BOUNDARY.md` | Tax / country |
| `12-FINANCIAL-BOUNDARY.md` | MRR / settlement / revenue |
| `13-PRODUCTION-PROOF.md` | SELECT evidence |
| `14-ARCHITECTURAL-GAPS.md` | P0–P3 |
| `15-AUTHORITY-MATRIX.md` | Domain → authority |
| `FINAL-REPORT.md` | Certification |
