# REBUILD-5EC — Security Composition Layer

**Program:** ADMIN-DASHBOARD-REBUILD-5E  
**Phase:** 5EC — Security Composition Layer

---

## Created: `client/src/components/admin/domains/security/`

| Component | Extracted from | Role |
|-----------|----------------|------|
| `SecurityGovernanceSection` | Auth gate + governance helpers | Platform/self-guard policy, `useSecurityAccountGovernance` |
| `SecurityRolesSection` | `CustomerSuccessAccountsSection` | Role select, badge, edit/save actions, delete button |
| `SecurityClassificationSection` | `CustomerSuccessAccountsSection` | Classification cell editor |
| `SecurityAccountControlsSection` | `CustomerSuccessAccountsSection` | Internal user dialog, delete user confirm |
| `SecurityPlatformAccountBadge` | `CustomerSuccessAccountsSection` | Protected platform account badge |
| `SecurityDiagnosticsSection` | Registry metadata | Server audit module ownership (no UI) |
| `SecurityReadinessSection` | Auth infrastructure | Query gate readiness re-exports (no UI) |
| `useSecurityAccountGovernance` | Security mutations/state | Hook for accounts workspace consumer |
| `securityGovernance.ts` | Inline guards | `canEditAccountGovernance`, `canDeleteAccountUser`, `canMutateAccountLifecycle` |

---

## Accounts Workspace Adoption

`CustomerSuccessAccountsSection` is now a **consumer** of Security domain composition:

```text
CustomerSuccessAccountsSection (CS host)
├── CS: search, classification filter, subscription lifecycle, invoice
└── Security (imported):
    ├── SecurityInternalUserToolbarButton
    ├── SecurityRoleCell / SecurityRoleBadge
    ├── SecurityClassificationCell
    ├── SecurityPlatformAccountBadge
    ├── SecurityRoleGovernanceActions
    ├── SecurityDeleteUserAction
    └── SecurityAccountControlsSection (dialogs)
```

Display location unchanged (`/admin/operations` accounts tab). Ownership explicit.

---

## Out of Scope (preserved)

- No Security Center page
- No new routes or navigation entries
- No auth, permission, or policy changes
- No visual redesign

Markup and mutation behavior preserved verbatim from extraction source.
