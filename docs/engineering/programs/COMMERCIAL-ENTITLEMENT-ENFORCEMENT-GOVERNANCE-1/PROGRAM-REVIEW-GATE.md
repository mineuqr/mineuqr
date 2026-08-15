# PROGRAM-REVIEW-GATE.md

Architecture Authority **MUST reject** (CE-29) if:

- capability identity is unclear
- entitlement source is unclear
- server enforcement is missing
- only UI enforcement exists
- plan-name conditionals are introduced
- a duplicate capability matrix is introduced
- negative tests are missing
- expired / trial / Frozen / owner behavior is undefined where relevant

Every commercial-capability program MUST include the CE-28 impact declaration.

Silent changes to access, expiry, trial, freeze, owner simulation, or public QR are prohibited (CE-30).
