# MIGRATION INTEGRITY

File: `drizzle/0089_commercial_charged_terms_snapshots.sql`  
Hash: `45dd198fe62f78746ef245e5091fc146ee383235f6d5a01b5d2b590b06c37e6d`

CREATE TABLE + UNIQUE (subscriptionId, version) + INDEX (subscriptionId, effectiveFrom).  
No INSERT/UPDATE/DELETE/DROP/ALTER. No Binding copy. Matches `chargedTerms.ts`.
