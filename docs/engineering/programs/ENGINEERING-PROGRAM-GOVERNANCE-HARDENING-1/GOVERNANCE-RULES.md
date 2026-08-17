# GOVERNANCE RULES

**Program:** ENGINEERING-PROGRAM-GOVERNANCE-HARDENING-1  
**Authority:** future engineering programs that report TypeScript or workspace state.

## 1. TypeScript reporting is forensic

Every program that mentions TypeScript errors MUST record:

| Field | Required |
|-------|----------|
| TS BASELINE BEFORE | measured `error TS*` count + fingerprint identity (SHA or file) |
| TS BASELINE AFTER | measured `error TS*` count + fingerprint identity |
| DELTA | after − before (count) |
| NEW DIAGNOSTICS | class D |
| REMOVED DIAGNOSTICS | class E |
| CHANGED DIAGNOSTICS | class C (and B if only line drift) |
| UNCLASSIFIED DIAGNOSTICS | class F |

Command of record: `pnpm check` (`tsc --noEmit`).

Editor problem counts (for example “6 Problems” on `App.tsx`) are **not** the baseline.

## 2. “Pre-existing” is not a convenience label

PRE-EXISTING may be used only when a diagnostic matches a **stored fingerprint** as class A (same file, code, normalized message; line/column may be class B if only drift).

If evidence is missing:

`UNCLASSIFIED — HISTORICAL EVIDENCE INSUFFICIENT`

Forbidden without evidence:

- “pre-existing”
- “known baseline”
- “same 188”
- “VS Code already showed this”

A total that remains 188 is **not** proof of no regression.

If the total remains 188 but the fingerprint population changed:

`BASELINE COUNT MATCH BUT DIAGNOSTIC POPULATION CHANGED`

That is a potential regression. Do not call it “no regression.”

## 3. Classification codes

| Code | Meaning |
|------|---------|
| A | Existing diagnostic unchanged |
| B | Existing diagnostic moved only because of line-number drift |
| C | Existing diagnostic materially changed (code or message) |
| D | New diagnostic |
| E | Removed diagnostic |
| F | Unable to classify |

A potential regression includes: a previously clean file or path now has a diagnostic; an error code changed; a message materially changed; a new error appeared while an unrelated error disappeared.

## 4. Program isolation ledger

Every engineering program MUST record:

PROGRAM START SHA  
PROGRAM END SHA  
FILES CHANGED  
FILES CREATED  
FILES DELETED  
FILES RESTORED  
DATABASE MUTATION  
PRODUCTION MUTATION  
DEPLOYMENT  
MIGRATION  
TEST DELTA  
TS DELTA  

No program may silently inherit an unexplained workspace change.

## 5. Git

Record branch, HEAD, origin/main, and `git status` at start and end.

Do not reset, restore, clean, checkout, commit, or push unless the program explicitly authorizes it.

Never use Git operations to hide a regression.

## 6. How to measure

1. Run `pnpm check` and keep the complete output.
2. Count every `error TSxxxx` primary line (`file(line,col): error TSxxxx:`).
3. Build identities: `file`, `line`, `column`, `code`, normalized message.
4. Compare to the latest stored fingerprint (this package’s `DIAGNOSTIC-FINGERPRINT.json` until a later program replaces it).
5. Classify every difference A–F.

Reference implementation: `_fingerprint-check.mjs`.

## 7. Do not opportunistically “fix the 188”

Reducing the count is not this governance program’s job and is not required to close a feature program. Fixes belong to an authorized program that names the files and the reason.
