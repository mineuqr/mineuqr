# AUDIT — GLOBAL-SAAS-CORPORATE-IDENTITY-1

**Date:** 2026-07-28  
**Baseline:** Post GLOBAL-SAAS-COMPLIANCE-AND-PAYMENT-READINESS-1

## Summary

The public site already had a professional trust surface (Security, Billing, Terms, Privacy, shared footer, canonical contact). Corporate identity for a mature international SaaS company was incomplete: About still narrated a menu-only product, there was no Trust Center hub, and enterprise/post-Atlas architecture was missing.

## Findings

### Company presentation
- Home + Terms positioned MineuQR as a **restaurant operating system**.
- About still sold **digital menus / templates** and listed ordering/payments as a 2026 aspiration — factually outdated.
- No explicit “why we exist” or product-philosophy section.

### Trust architecture
- Security and Billing existed as isolated pages.
- No Trust Center hub aggregating security, privacy, billing, compliance.
- No Subprocessors page (despite Privacy naming S3 / Tap / PayPal).
- No DPA entry, Responsible Disclosure policy, Docs/Roadmap/Status entry points.

### Footer / corporate readiness
- Flat link list; no Product / Company / Trust / Legal structure.
- No gated legal-entity registry for post-Atlas disclosure.
- Support email present; legal name / address / tax ID correctly absent (must stay gated).

### Consistency debt
- About used CloudFront logo URL and hardcoded WhatsApp instead of branding/contact constants.
- Unverifiable “24/7” support language on About stats and enterprise pricing copy.

### What was already solid
- `publicContact.ts`, `branding.ts`, marketing meta helper, robots/sitemap for core legal pages.
- No fabricated SOC/ISO claims (correct).

## Constraints reaffirmed

Do not redesign UI, change branding/colors/typography, rewrite marketing strategy, or invent legal entity, team, offices, customers, certifications, or statistics.
