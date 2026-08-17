# ERROR CLASSIFICATION

**Program:** TYPESCRIPT-ERROR-FORENSICS-AND-REMEDIATION-1
**Scope:** all 188 diagnostics from the forensic `pnpm check` baseline
**Comparison baseline:** ENGINEERING-PROGRAM-GOVERNANCE-HARDENING-1 / DIAGNOSTIC-FINGERPRINT.json
**Baseline state of this population:** UNCHANGED = 188; NEW = 0; REMOVED = 0; CHANGED = 0; MOVED_ONLY = 0; UNCLASSIFIED = 0

This file classifies the **188-error forensic population**. FIX_NOW items listed here were still present at classification time.

Post-remediation overlay (after the four FIX_NOW edits): TSF-029, TSF-037, TSF-168, TSF-169 are **FIXED** (absent from `pnpm check`). All other 184 remain OPEN. See TEST-RESULTS.md and FINAL-REPORT.md.

## Decision totals (forensic, before FIX_NOW)

| Decision | Count |
|----------|------:|
| FIX_LATER | 28 |
| CONFIGURATION | 118 |
| ARCHITECTURE_PROGRAM_REQUIRED | 30 |
| FIX_NOW | 4 |
| LEGACY_ACCEPTED | 6 |
| TEST_HARNESS | 2 |

## Category totals

| Category | Count |
|----------|------:|
| C | 46 |
| B | 16 |
| H | 118 |
| D | 6 |
| F | 2 |

## Priority totals

| Priority | Count |
|----------|------:|
| P2 | 57 |
| P3 | 129 |
| P1 | 2 |

## All 188 diagnostics

### TSF-001

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-001 |
| file | `client/src/App.tsx` |
| line | 105 |
| column | 46 |
| TS code | TS2322 |
| normalized message | Type '({ activation }?: Readonly<{ activation?: Readonly<{ slug: string; stationId: string; restaurantId?: number \| undefined; kioskId?: string \| undefined; }> \| undefined; }>) => Element \| null' is not assignable to type 'ComponentType<RouteComponentProps<StringRouteParams<"/kiosk/:slug/confirmed">>> \| undefined'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | KioskShell props are { activation? } for Screen Runtime hosting; wouter Route expects RouteComponentProps. Runtime uses useRoute internally; extra route props are unused. |
| evidence | KioskShell.tsx KioskShellProps; App.tsx component={KioskShell}; useRoute('/kiosk/:slug...') |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-002

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-002 |
| file | `client/src/App.tsx` |
| line | 106 |
| column | 45 |
| TS code | TS2322 |
| normalized message | Type '({ activation }?: Readonly<{ activation?: Readonly<{ slug: string; stationId: string; restaurantId?: number \| undefined; kioskId?: string \| undefined; }> \| undefined; }>) => Element \| null' is not assignable to type 'ComponentType<RouteComponentProps<StringRouteParams<"/kiosk/:slug/checkout">>> \| undefined'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | KioskShell props are { activation? } for Screen Runtime hosting; wouter Route expects RouteComponentProps. Runtime uses useRoute internally; extra route props are unused. |
| evidence | KioskShell.tsx KioskShellProps; App.tsx component={KioskShell}; useRoute('/kiosk/:slug...') |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-003

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-003 |
| file | `client/src/App.tsx` |
| line | 107 |
| column | 41 |
| TS code | TS2322 |
| normalized message | Type '({ activation }?: Readonly<{ activation?: Readonly<{ slug: string; stationId: string; restaurantId?: number \| undefined; kioskId?: string \| undefined; }> \| undefined; }>) => Element \| null' is not assignable to type 'ComponentType<RouteComponentProps<StringRouteParams<"/kiosk/:slug/cart">>> \| undefined'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | KioskShell props are { activation? } for Screen Runtime hosting; wouter Route expects RouteComponentProps. Runtime uses useRoute internally; extra route props are unused. |
| evidence | KioskShell.tsx KioskShellProps; App.tsx component={KioskShell}; useRoute('/kiosk/:slug...') |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-004

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-004 |
| file | `client/src/App.tsx` |
| line | 108 |
| column | 41 |
| TS code | TS2322 |
| normalized message | Type '({ activation }?: Readonly<{ activation?: Readonly<{ slug: string; stationId: string; restaurantId?: number \| undefined; kioskId?: string \| undefined; }> \| undefined; }>) => Element \| null' is not assignable to type 'ComponentType<RouteComponentProps<StringRouteParams<"/kiosk/:slug/menu">>> \| undefined'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | KioskShell props are { activation? } for Screen Runtime hosting; wouter Route expects RouteComponentProps. Runtime uses useRoute internally; extra route props are unused. |
| evidence | KioskShell.tsx KioskShellProps; App.tsx component={KioskShell}; useRoute('/kiosk/:slug...') |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-005

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-005 |
| file | `client/src/App.tsx` |
| line | 109 |
| column | 45 |
| TS code | TS2322 |
| normalized message | Type '({ activation }?: Readonly<{ activation?: Readonly<{ slug: string; stationId: string; restaurantId?: number \| undefined; kioskId?: string \| undefined; }> \| undefined; }>) => Element \| null' is not assignable to type 'ComponentType<RouteComponentProps<StringRouteParams<"/kiosk/:slug/language">>> \| undefined'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | KioskShell props are { activation? } for Screen Runtime hosting; wouter Route expects RouteComponentProps. Runtime uses useRoute internally; extra route props are unused. |
| evidence | KioskShell.tsx KioskShellProps; App.tsx component={KioskShell}; useRoute('/kiosk/:slug...') |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-006

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-006 |
| file | `client/src/App.tsx` |
| line | 110 |
| column | 36 |
| TS code | TS2322 |
| normalized message | Type '({ activation }?: Readonly<{ activation?: Readonly<{ slug: string; stationId: string; restaurantId?: number \| undefined; kioskId?: string \| undefined; }> \| undefined; }>) => Element \| null' is not assignable to type 'ComponentType<RouteComponentProps<StringRouteParams<"/kiosk/:slug">>> \| undefined'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | KioskShell props are { activation? } for Screen Runtime hosting; wouter Route expects RouteComponentProps. Runtime uses useRoute internally; extra route props are unused. |
| evidence | KioskShell.tsx KioskShellProps; App.tsx component={KioskShell}; useRoute('/kiosk/:slug...') |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-007

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-007 |
| file | `client/src/components/admin/platform-ops/commercial-catalog/CatalogManagementPanels.tsx` |
| line | 426 |
| column | 44 |
| TS code | TS2345 |
| normalized message | Argument of type 'string' is not assignable to parameter of type 'SetStateAction<"USD">'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | B — REAL TYPE SAFETY DEFECT |
| priority | P2 |
| likely cause | Admin catalog UI state/callback typing |
| evidence | admin platform-ops commercial-catalog UI |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-008

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-008 |
| file | `client/src/components/admin/platform-ops/commercial-catalog/CatalogManagementPanels.tsx` |
| line | 633 |
| column | 51 |
| TS code | TS7006 |
| normalized message | Parameter 'f' implicitly has an 'any' type. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | B — REAL TYPE SAFETY DEFECT |
| priority | P2 |
| likely cause | Admin catalog UI state/callback typing |
| evidence | admin platform-ops commercial-catalog UI |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-009

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-009 |
| file | `client/src/components/admin/platform-ops/commercial-catalog/CatalogManagementPanels.tsx` |
| line | 748 |
| column | 20 |
| TS code | TS7006 |
| normalized message | Parameter 'v' implicitly has an 'any' type. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | B — REAL TYPE SAFETY DEFECT |
| priority | P2 |
| likely cause | Admin catalog UI state/callback typing |
| evidence | admin platform-ops commercial-catalog UI |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-010

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-010 |
| file | `client/src/components/admin/platform-ops/commercial-catalog/CatalogManagementPanels.tsx` |
| line | 1102 |
| column | 27 |
| TS code | TS2345 |
| normalized message | Argument of type 'string' is not assignable to parameter of type 'SetStateAction<"USD">'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | B — REAL TYPE SAFETY DEFECT |
| priority | P2 |
| likely cause | Admin catalog UI state/callback typing |
| evidence | admin platform-ops commercial-catalog UI |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-011

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-011 |
| file | `client/src/components/admin/platform-ops/commercial-catalog/experience/CapabilityFilterPicker.tsx` |
| line | 132 |
| column | 11 |
| TS code | TS2322 |
| normalized message | Type '"healthy"' is not assignable to type '"default" \| "primary" \| SemanticTone \| "emerald" \| "amber" \| undefined'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | B — REAL TYPE SAFETY DEFECT |
| priority | P2 |
| likely cause | Admin catalog UI state/callback typing |
| evidence | admin platform-ops commercial-catalog UI |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-012

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-012 |
| file | `client/src/components/admin/platform-ops/commercial-catalog/experience/versionCompare.ts` |
| line | 39 |
| column | 19 |
| TS code | TS2802 |
| normalized message | Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-013

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-013 |
| file | `client/src/components/admin/platform-ops/commercial-catalog/experience/versionCompare.ts` |
| line | 54 |
| column | 20 |
| TS code | TS2802 |
| normalized message | Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-014

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-014 |
| file | `client/src/components/admin/platform-ops/PlatformOpsReservedSection.tsx` |
| line | 19 |
| column | 7 |
| TS code | TS2739 |
| normalized message | Type '{ audit: string[]; }' is missing the following properties from type 'Record<"subscription" \| "commercialCatalog" \| "audit", string[]>': subscription, commercialCatalog |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | B — REAL TYPE SAFETY DEFECT |
| priority | P2 |
| likely cause | Admin catalog UI state/callback typing |
| evidence | admin platform-ops commercial-catalog UI |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-015

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-015 |
| file | `client/src/components/admin/platform-ops/PlatformOpsSubscriptionComposition.tsx` |
| line | 63 |
| column | 9 |
| TS code | TS2322 |
| normalized message | Type '3' is not assignable to type 'PlatformOpsHeroColumns \| undefined'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | B — REAL TYPE SAFETY DEFECT |
| priority | P2 |
| likely cause | Admin catalog UI state/callback typing |
| evidence | admin platform-ops commercial-catalog UI |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-016

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-016 |
| file | `client/src/components/dashboard/DiningSessionOrdersList.tsx` |
| line | 67 |
| column | 54 |
| TS code | TS2345 |
| normalized message | Argument of type 'WorkspaceOrderRow' is not assignable to parameter of type 'OperationalOrderIdentitySource'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Workspace order row vs Order/Check identity source contract |
| evidence | Argument of type 'WorkspaceOrderRow' is not assignable to parameter of type 'OperationalOrderIdentitySource'. |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-017

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-017 |
| file | `client/src/components/dashboard/MarkPaidSettlementDialog.tsx` |
| line | 75 |
| column | 39 |
| TS code | TS2345 |
| normalized message | Argument of type '"card" \| "cash" \| "other"' is not assignable to parameter of type '"card" \| "cash"'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P1 |
| likely cause | UI selected tender includes 'other'; settlement helper accepts only card\|cash. |
| evidence | singleTenderSettlements(selected) TS2345 |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-018

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-018 |
| file | `client/src/components/dashboard/restaurantDashStyles.ts` |
| line | 189 |
| column | 3 |
| TS code | TS2322 |
| normalized message | Type 'SemanticTone' is not assignable to type 'RestaurantKpiTone'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | B — REAL TYPE SAFETY DEFECT |
| priority | P2 |
| likely cause | UI token/style/locale union mismatch |
| evidence | Type 'SemanticTone' is not assignable to type 'RestaurantKpiTone'. |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-019

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-019 |
| file | `client/src/components/orders-workspace/OrdersWorkspacePanel.tsx` |
| line | 106 |
| column | 5 |
| TS code | TS2769 |
| normalized message | No overload matches this call. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Workspace order row vs Order/Check identity source contract |
| evidence | No overload matches this call. |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-020

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-020 |
| file | `client/src/design-system/semantic-badge/components/SemanticBadge.tsx` |
| line | 57 |
| column | 6 |
| TS code | TS2322 |
| normalized message | Type '{ children: (Element \| ReactNode)[]; ref?: Ref<HTMLSpanElement> \| undefined; key?: Key \| null \| undefined; defaultChecked?: boolean \| undefined; ... 280 more ...; className: string; }' is not assignable to type 'ClassAttributes<HTMLButtonElement>'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P3 |
| likely cause | Design-system token/union exhaustiveness |
| evidence | design-system path |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-021

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-021 |
| file | `client/src/design-system/semantic-card/tokens/domain.ts` |
| line | 85 |
| column | 5 |
| TS code | TS2322 |
| normalized message | Type 'string' is not assignable to type '"border-emerald-500/45 bg-gradient-to-b from-emerald-950/50 to-slate-900/85" \| "border-sky-500/45 bg-gradient-to-b from-sky-950/45 to-slate-900/85" \| "border-rose-500/45 bg-gradient-to-b from-rose-950/45 to-slate-900/85" \| "border-violet-500/45 bg-gradient-to-b from-violet-950/45 to-slate-900/85" \| "border-orange-50...'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P3 |
| likely cause | Design-system token/union exhaustiveness |
| evidence | design-system path |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-022

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-022 |
| file | `client/src/design-system/semantic-table/tokens/tableSurface.ts` |
| line | 18 |
| column | 31 |
| TS code | TS1355 |
| normalized message | A 'const' assertions can only be applied to references to enum members, or string, number, boolean, array, or object literals. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P3 |
| likely cause | Design-system token/union exhaustiveness |
| evidence | design-system path |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-023

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-023 |
| file | `client/src/lib/currencyLocale.ts` |
| line | 109 |
| column | 11 |
| TS code | TS2769 |
| normalized message | No overload matches this call. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | B — REAL TYPE SAFETY DEFECT |
| priority | P2 |
| likely cause | UI token/style/locale union mismatch |
| evidence | No overload matches this call. |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-024

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-024 |
| file | `client/src/lib/operational-screen/interaction/useOperationalDeviceOrderActions.ts` |
| line | 30 |
| column | 33 |
| TS code | TS2339 |
| normalized message | Property 'restaurantId' does not exist on type 'RuntimeInstanceIdentity'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Screen Runtime identity/context contract incomplete (e.g. restaurantId). |
| evidence | client/src/lib/operational-screen/interaction/useOperationalDeviceOrderActions.ts |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-025

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-025 |
| file | `client/src/lib/operational-screen/kitchen/kitchenQueueInvalidationCoordinator.ts` |
| line | 34 |
| column | 23 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<Entry>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-026

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-026 |
| file | `client/src/lib/operational-screen/kitchen/useKitchenRuntimeStream.ts` |
| line | 78 |
| column | 7 |
| TS code | TS2769 |
| normalized message | No overload matches this call. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Screen Runtime identity/context contract incomplete (e.g. restaurantId). |
| evidence | client/src/lib/operational-screen/kitchen/useKitchenRuntimeStream.ts |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-027

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-027 |
| file | `client/src/lib/operational-screen/runtimeContextStore.ts` |
| line | 66 |
| column | 28 |
| TS code | TS2802 |
| normalized message | Type 'Set<RuntimeContextSubscriber>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-028

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-028 |
| file | `client/src/lib/operational-screen/runtimeInstanceContext.ts` |
| line | 126 |
| column | 3 |
| TS code | TS2322 |
| normalized message | Type 'Readonly<{ identity: Readonly<{ instanceId: string; businessId: string; displayIdentity: string; deviceId: string; }>; screen: Readonly<{ screenId: string; screenType: "kitchen_display" \| "expo_display" \| ... 4 more ... \| "waiter_display"; displayName: string; location: string \| null; zone: string \| null; status: "a...' is not assignable to type 'Readonly<RuntimeInstanceContext>'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Screen Runtime identity/context contract incomplete (e.g. restaurantId). |
| evidence | client/src/lib/operational-screen/runtimeInstanceContext.ts |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-029

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-029 |
| file | `client/src/lib/ordering-client/checkout/checkoutSubmission.ts` |
| line | 72 |
| column | 11 |
| TS code | TS2339 |
| normalized message | Property 'push' does not exist on type 'readonly { menuItemId: number; nameAr: string; nameEn?: string \| undefined; price: string; quantity: number; notes: string \| null; modifiers?: readonly string[] \| undefined; }[]'. |
| baseline state | UNCHANGED |
| current state | REMOVED |
| category | B — REAL TYPE SAFETY DEFECT |
| priority | P2 |
| likely cause | Local builder annotated as ReadonlyArray so .push is illegal; runtime array is mutable. |
| evidence | validateCheckoutNotes items: CheckoutDraftSnapshot['items'] = [] |
| remediation decision | FIX_NOW |
| status | FIXED |

### TSF-030

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-030 |
| file | `client/src/lib/orders-workspace/ordersListActiveInvalidationCoordinator.ts` |
| line | 49 |
| column | 23 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<Entry>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-031

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-031 |
| file | `client/src/lib/reporting-exports/paymentMethodAnalysisPresentation.ts` |
| line | 75 |
| column | 32 |
| TS code | TS2802 |
| normalized message | Type 'ReadonlyMap<string, Readonly<{ paymentMethod: string; category: string; tenderAmount: string; transactionCount: number; checkCount: number; averageCheck: string; mixPercent: string; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-032

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-032 |
| file | `client/src/lib/reporting-exports/pdf/arabicPdfText.ts` |
| line | 6 |
| column | 25 |
| TS code | TS7016 |
| normalized message | Could not find a declaration file for module 'bidi-js'. 'C:/mineuqr/node_modules/.pnpm/bidi-js@1.0.3/node_modules/bidi-js/dist/bidi.js' implicitly has an 'any' type. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | D — LEGACY CODE |
| priority | P3 |
| likely cause | Reporting presentation/legacy surface typing |
| evidence | reporting-platform / reporting-exports path |
| remediation decision | LEGACY_ACCEPTED |
| status | OPEN |

### TSF-033

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-033 |
| file | `client/src/lib/reporting-exports/pdf/buildReportingExportPdf.ts` |
| line | 32 |
| column | 50 |
| TS code | TS2694 |
| normalized message | Namespace 'doc' has no exported member 'default'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | D — LEGACY CODE |
| priority | P3 |
| likely cause | Reporting presentation/legacy surface typing |
| evidence | reporting-platform / reporting-exports path |
| remediation decision | LEGACY_ACCEPTED |
| status | OPEN |

### TSF-034

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-034 |
| file | `client/src/lib/reporting-exports/pdf/buildReportingExportPdf.ts` |
| line | 495 |
| column | 20 |
| TS code | TS2322 |
| normalized message | Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'BlobPart'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | D — LEGACY CODE |
| priority | P3 |
| likely cause | Reporting presentation/legacy surface typing |
| evidence | reporting-platform / reporting-exports path |
| remediation decision | LEGACY_ACCEPTED |
| status | OPEN |

### TSF-035

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-035 |
| file | `client/src/lib/reporting-exports/salesSourceAnalysisPresentation.ts` |
| line | 90 |
| column | 25 |
| TS code | TS2802 |
| normalized message | Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-036

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-036 |
| file | `client/src/lib/reporting-exports/salesSourceAnalysisPresentation.ts` |
| line | 156 |
| column | 25 |
| TS code | TS2802 |
| normalized message | Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-037

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-037 |
| file | `client/src/pages/admin/StatisticsPanel.tsx` |
| line | 330 |
| column | 62 |
| TS code | TS2345 |
| normalized message | Argument of type 'string \| null' is not assignable to parameter of type 'string'. |
| baseline state | UNCHANGED |
| current state | REMOVED |
| category | B — REAL TYPE SAFETY DEFECT |
| priority | P2 |
| likely cause | subscriptionStatus is string \| null; mapper requires string. |
| evidence | mapCommercialStatusToBadgeTone; ownerCommercialDisplay uses ?? inactive |
| remediation decision | FIX_NOW |
| status | FIXED |

### TSF-038

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-038 |
| file | `client/src/pages/Dashboard.tsx` |
| line | 2325 |
| column | 33 |
| TS code | TS2339 |
| normalized message | Property 'emptyPanel' does not exist on type '{ shell: "min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"; card: string; cardHover: string; hero: string; kpiCard: string; pageTitle: string; pageSub: string; ... 5 more ...; contentPanel: string; }'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | B — REAL TYPE SAFETY DEFECT |
| priority | P2 |
| likely cause | UI token/style/locale union mismatch |
| evidence | Property 'emptyPanel' does not exist on type '{ shell: "min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"; card: string; cardHover: stri |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-039

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-039 |
| file | `client/src/pages/Dashboard.tsx` |
| line | 3234 |
| column | 17 |
| TS code | TS2322 |
| normalized message | Type 'Readonly<{ version: number; components: readonly Readonly<{ id: string; name: string; ratePercent: string; }>[]; }>' is not assignable to type '{ components: { id: string; name: string; ratePercent: string; }[]; version?: number \| undefined; }'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | B — REAL TYPE SAFETY DEFECT |
| priority | P2 |
| likely cause | UI token/style/locale union mismatch |
| evidence | Type 'Readonly<{ version: number; components: readonly Readonly<{ id: string; name: string; ratePercent: string; }>[]; }>' is not assignable to type '{ componen |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-040

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-040 |
| file | `client/src/pages/kiosk/KioskShell.tsx` |
| line | 235 |
| column | 9 |
| TS code | TS2322 |
| normalized message | Type '"cart" \| "checkout" \| "browse" \| "confirmation" \| "tracking"' is not assignable to type '"cart" \| "checkout" \| "browse" \| "confirmation"'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | After idle/language returns, hosted hostStage can still be tracking; surface only accepts ordering stages. |
| evidence | KioskShellStage includes tracking; KioskOrderingSurface stage union narrower |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-041

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-041 |
| file | `client/src/pages/MenuView.tsx` |
| line | 253 |
| column | 11 |
| TS code | TS2322 |
| normalized message | Type 'string' is not assignable to type '"tables" \| "rooms" \| undefined'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | B — REAL TYPE SAFETY DEFECT |
| priority | P2 |
| likely cause | UI token/style/locale union mismatch |
| evidence | Type 'string' is not assignable to type '"tables" \| "rooms" \| undefined'. |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-042

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-042 |
| file | `server/commercial/metrics/CanonicalMetricsService.ts` |
| line | 279 |
| column | 10 |
| TS code | TS2802 |
| normalized message | Type 'Set<number>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-043

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-043 |
| file | `server/crmp/DrizzleCrmpRepository.ts` |
| line | 472 |
| column | 25 |
| TS code | TS2352 |
| normalized message | Conversion of type 'ResultSetHeader' to type '{ n: number; }[]' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | CRMP in-memory/drizzle store vs domain types |
| evidence | CRMP path |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-044

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-044 |
| file | `server/crmp/InMemoryCrmpStore.ts` |
| line | 57 |
| column | 18 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<Readonly<{ registerId: string; restaurantId: number; code: string; displayName: string; registerType: "settlement_station" \| "counter" \| "mobile_pos"; status: "active" \| "provisioned" \| "inactive"; ... 7 more ...; updatedAt: string; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-045

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-045 |
| file | `server/crmp/InMemoryCrmpStore.ts` |
| line | 85 |
| column | 23 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<Readonly<{ financialShiftId: string; shiftNumber: number; restaurantId: number; registerId: string; operatorUserId: number; status: "open" \| "closed" \| "archived" \| "suspended" \| "closing" \| "handover_pending"; ... 10 more ...; updatedAt: string; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-046

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-046 |
| file | `server/crmp/InMemoryCrmpStore.ts` |
| line | 97 |
| column | 18 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<Readonly<{ financialShiftId: string; shiftNumber: number; restaurantId: number; registerId: string; operatorUserId: number; status: "open" \| "closed" \| "archived" \| "suspended" \| "closing" \| "handover_pending"; ... 10 more ...; updatedAt: string; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-047

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-047 |
| file | `server/crmp/InMemoryCrmpStore.ts` |
| line | 107 |
| column | 18 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<Readonly<{ financialShiftId: string; shiftNumber: number; restaurantId: number; registerId: string; operatorUserId: number; status: "open" \| "closed" \| "archived" \| "suspended" \| "closing" \| "handover_pending"; ... 10 more ...; updatedAt: string; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-048

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-048 |
| file | `server/crmp/InMemoryCrmpStore.ts` |
| line | 124 |
| column | 22 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<Readonly<{ financialShiftId: string; shiftNumber: number; restaurantId: number; registerId: string; operatorUserId: number; status: "open" \| "closed" \| "archived" \| "suspended" \| "closing" \| "handover_pending"; ... 10 more ...; updatedAt: string; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-049

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-049 |
| file | `server/crmp/InMemoryCrmpStore.ts` |
| line | 161 |
| column | 23 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<Readonly<{ financialShiftId: string; shiftNumber: number; restaurantId: number; registerId: string; operatorUserId: number; status: "open" \| "closed" \| "archived" \| "suspended" \| "closing" \| "handover_pending"; ... 10 more ...; updatedAt: string; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-050

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-050 |
| file | `server/crmp/InMemoryCrmpStore.ts` |
| line | 164 |
| column | 12 |
| TS code | TS7006 |
| normalized message | Parameter 'a' implicitly has an 'any' type. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | CRMP in-memory/drizzle store vs domain types |
| evidence | CRMP path |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-051

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-051 |
| file | `server/db.ts` |
| line | 804 |
| column | 30 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<[string, number]>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-052

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-052 |
| file | `server/operational-device/recovery/ScreenCredentialRecoveryService.ts` |
| line | 45 |
| column | 41 |
| TS code | TS2345 |
| normalized message | Argument of type '{ tokenId: string; secret: string; deviceId: string; issuedAt: string; expiresAt: string \| null; }' is not assignable to parameter of type 'IssuedOperationalDeviceToken'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P1 |
| likely cause | Recovery presentation token literal missing IssuedOperationalDeviceToken fields. |
| evidence | presentRecovery(device, { tokenId, secret, deviceId, issuedAt, expiresAt }) |
| remediation decision | FIX_LATER |
| status | OPEN |

### TSF-053

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-053 |
| file | `server/operational-session/check/CheckMembershipBackfillService.ts` |
| line | 82 |
| column | 9 |
| TS code | TS2345 |
| normalized message | Argument of type 'number \| null' is not assignable to parameter of type 'number'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Check/Settlement projection or command types incomplete. Correct fix may need an architecture program. |
| evidence | Check/Settlement path; Constitution ownership |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-054

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-054 |
| file | `server/operational-session/check/CheckMembershipBackfillService.ts` |
| line | 153 |
| column | 7 |
| TS code | TS2345 |
| normalized message | Argument of type 'number \| null' is not assignable to parameter of type 'number'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Check/Settlement projection or command types incomplete. Correct fix may need an architecture program. |
| evidence | Check/Settlement path; Constitution ownership |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-055

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-055 |
| file | `server/operational-session/check/CheckService.ts` |
| line | 1329 |
| column | 7 |
| TS code | TS2353 |
| normalized message | Object literal may only specify known properties, and 'hints' does not exist in type 'Readonly<{ registerId?: string \| null \| undefined; deviceId?: string \| null \| undefined; operatorUserId?: number \| null \| undefined; operationalScreenId?: string \| null \| undefined; }> & { ...; }'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Check/Settlement projection or command types incomplete. Correct fix may need an architecture program. |
| evidence | Check/Settlement path; Constitution ownership |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-056

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-056 |
| file | `server/operational-session/check/checkSplitPaymentIntegration.ts` |
| line | 209 |
| column | 33 |
| TS code | TS2322 |
| normalized message | Type 'string[]' is not assignable to type 'readonly OrderSettlementCommandOutcome[]'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Check/Settlement projection or command types incomplete. Correct fix may need an architecture program. |
| evidence | Check/Settlement path; Constitution ownership |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-057

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-057 |
| file | `server/operational-session/check/multiCheckAllocationRepository.ts` |
| line | 376 |
| column | 8 |
| TS code | TS2802 |
| normalized message | Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-058

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-058 |
| file | `server/operational-session/check/read/multiCheckAllocationProjectionStore.ts` |
| line | 120 |
| column | 16 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<Readonly<{ restaurantId: number; allocationId: string; allocationReference: string; financialReference: string \| null; sourceCheckId: number; sourcePaymentId: string \| null; allocationStatus: "pending" \| ... 5 more ... \| "completed"; ... 34 more ...; metadata: Readonly<...>; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-059

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-059 |
| file | `server/operational-session/check/read/multiCheckAllocationProjectionStore.ts` |
| line | 139 |
| column | 16 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<Readonly<{ restaurantId: number; allocationId: string; allocationReference: string; financialReference: string \| null; sourceCheckId: number; sourcePaymentId: string \| null; allocationStatus: "pending" \| ... 5 more ... \| "completed"; ... 34 more ...; metadata: Readonly<...>; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-060

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-060 |
| file | `server/operational-session/check/read/multiCheckAllocationProjectionStore.ts` |
| line | 157 |
| column | 16 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<Readonly<{ restaurantId: number; allocationId: string; allocationReference: string; financialReference: string \| null; sourceCheckId: number; sourcePaymentId: string \| null; allocationStatus: "pending" \| ... 5 more ... \| "completed"; ... 34 more ...; metadata: Readonly<...>; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-061

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-061 |
| file | `server/operational-session/check/read/multiCheckAllocationProjectionStore.ts` |
| line | 174 |
| column | 16 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<Readonly<{ restaurantId: number; allocationId: string; allocationReference: string; financialReference: string \| null; sourceCheckId: number; sourcePaymentId: string \| null; allocationStatus: "pending" \| ... 5 more ... \| "completed"; ... 16 more ...; projectionTimestamp: string; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-062

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-062 |
| file | `server/operational-session/check/read/orderSettlementProjectionStore.ts` |
| line | 67 |
| column | 16 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<Readonly<{ restaurantId: number; checkId: number; orderId: number; settlementStatus: "pending" \| "refunded" \| "complimentary" \| "voided" \| "partially_settled" \| "settled" \| "cancelled"; ... 14 more ...; projectionRevision: string; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-063

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-063 |
| file | `server/operational-session/check/read/orderSettlementProjectionStore.ts` |
| line | 78 |
| column | 16 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<Readonly<{ restaurantId: number; checkId: number; orderId: number; settlementStatus: "pending" \| "refunded" \| "complimentary" \| "voided" \| "partially_settled" \| "settled" \| "cancelled"; ... 14 more ...; projectionRevision: string; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-064

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-064 |
| file | `server/operational-session/check/read/splitPaymentProjectionStore.ts` |
| line | 10 |
| column | 3 |
| TS code | TS2724 |
| normalized message | '"@shared/operational-session"' has no exported member named 'SplitPaymentAttemptProjectionIdentity'. Did you mean 'SplitPaymentProjectionIdentity'? |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Check/Settlement projection or command types incomplete. Correct fix may need an architecture program. |
| evidence | Check/Settlement path; Constitution ownership |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-065

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-065 |
| file | `server/operational-session/check/read/splitPaymentProjectionStore.ts` |
| line | 12 |
| column | 3 |
| TS code | TS2724 |
| normalized message | '"@shared/operational-session"' has no exported member named 'SplitPaymentOutstandingProjectionIdentity'. Did you mean 'SplitPaymentOutstandingProjection'? |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Check/Settlement projection or command types incomplete. Correct fix may need an architecture program. |
| evidence | Check/Settlement path; Constitution ownership |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-066

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-066 |
| file | `server/operational-session/check/read/splitPaymentProjectionStore.ts` |
| line | 107 |
| column | 16 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<Readonly<{ restaurantId: number; checkId: number; paymentId: string; paymentReference: string; financialReference: string \| null; paymentStatus: "pending" \| "failed" \| "refunded" \| "voided" \| ... 4 more ... \| "applied"; ... 30 more ...; projectionTimestamp: string; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-067

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-067 |
| file | `server/operational-session/check/read/splitPaymentProjectionStore.ts` |
| line | 120 |
| column | 16 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<Readonly<{ restaurantId: number; checkId: number; paymentId: string; paymentReference: string; financialReference: string \| null; paymentStatus: "pending" \| "failed" \| "refunded" \| "voided" \| ... 4 more ... \| "applied"; ... 30 more ...; projectionTimestamp: string; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-068

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-068 |
| file | `server/operational-session/check/read/splitPaymentProjectionStore.ts` |
| line | 154 |
| column | 16 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<Readonly<{ restaurantId: number; checkId: number; attemptId: string; paymentId: string \| null; attemptStatus: PaymentAttemptStatus; amount: string; method: TenderMethod; ... 8 more ...; projectionTimestamp: string; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-069

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-069 |
| file | `server/operational-session/check/refundDocumentNumberRepository.ts` |
| line | 51 |
| column | 34 |
| TS code | TS2352 |
| normalized message | Conversion of type 'ResultSetHeader' to type '{ n: number; }[]' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Check/Settlement projection or command types incomplete. Correct fix may need an architecture program. |
| evidence | Check/Settlement path; Constitution ownership |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-070

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-070 |
| file | `server/operational-session/check/refundDocumentNumberRepository.ts` |
| line | 128 |
| column | 19 |
| TS code | TS2802 |
| normalized message | Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-071

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-071 |
| file | `server/operational-session/check/settlementRecordRepository.ts` |
| line | 141 |
| column | 19 |
| TS code | TS2802 |
| normalized message | Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-072

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-072 |
| file | `server/operational-session/check/splitPaymentMapper.ts` |
| line | 16 |
| column | 8 |
| TS code | TS2305 |
| normalized message | Module '"@shared/operational-session"' has no exported member 'PaymentAllocation'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Check/Settlement projection or command types incomplete. Correct fix may need an architecture program. |
| evidence | Check/Settlement path; Constitution ownership |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-073

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-073 |
| file | `server/operational-session/check/splitPaymentMapper.ts` |
| line | 18 |
| column | 8 |
| TS code | TS2724 |
| normalized message | '"@shared/operational-session"' has no exported member named 'PaymentAttemptStatus'. Did you mean 'PaymentAttempt'? |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Check/Settlement projection or command types incomplete. Correct fix may need an architecture program. |
| evidence | Check/Settlement path; Constitution ownership |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-074

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-074 |
| file | `server/operational-session/check/splitPaymentMapper.ts` |
| line | 21 |
| column | 8 |
| TS code | TS2305 |
| normalized message | Module '"@shared/operational-session"' has no exported member 'Tender'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Check/Settlement projection or command types incomplete. Correct fix may need an architecture program. |
| evidence | Check/Settlement path; Constitution ownership |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-075

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-075 |
| file | `server/operational-session/check/splitPaymentMapper.ts` |
| line | 22 |
| column | 8 |
| TS code | TS2724 |
| normalized message | '"@shared/operational-session"' has no exported member named 'TenderAllocation'. Did you mean 'RefundAllocation'? |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Check/Settlement projection or command types incomplete. Correct fix may need an architecture program. |
| evidence | Check/Settlement path; Constitution ownership |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-076

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-076 |
| file | `server/operational-session/check/splitPaymentRepository.ts` |
| line | 34 |
| column | 3 |
| TS code | TS2724 |
| normalized message | '"@shared/operational-session"' has no exported member named 'PaymentAttemptStatus'. Did you mean 'PaymentAttempt'? |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Check/Settlement projection or command types incomplete. Correct fix may need an architecture program. |
| evidence | Check/Settlement path; Constitution ownership |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-077

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-077 |
| file | `server/order/application/IdentityPlaceOrderService.ts` |
| line | 128 |
| column | 11 |
| TS code | TS2322 |
| normalized message | Type 'number \| undefined' is not assignable to type 'number'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Order persistence/read-model typing vs aggregate contracts |
| evidence | Order core-domain path |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-078

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-078 |
| file | `server/order/business-identity/infrastructure/DrizzleBusinessIdentityAllocator.ts` |
| line | 72 |
| column | 40 |
| TS code | TS2352 |
| normalized message | Conversion of type 'ResultSetHeader' to type '{ n: number; }[]' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Order persistence/read-model typing vs aggregate contracts |
| evidence | Order core-domain path |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-079

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-079 |
| file | `server/order/business-identity/infrastructure/RestaurantOpeningTimeResolver.ts` |
| line | 6 |
| column | 8 |
| TS code | TS2459 |
| normalized message | Module '"../../../../shared/utils/businessDay"' declares 'NormalizedWorkingHours' locally, but it is not exported. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Order persistence/read-model typing vs aggregate contracts |
| evidence | Order core-domain path |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-080

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-080 |
| file | `server/order/infrastructure/persistence/DrizzleOrderRepository.ts` |
| line | 95 |
| column | 17 |
| TS code | TS2322 |
| normalized message | Type 'string \| null \| undefined' is not assignable to type 'string \| undefined'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Order persistence/read-model typing vs aggregate contracts |
| evidence | Order core-domain path |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-081

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-081 |
| file | `server/order/infrastructure/persistence/DrizzleOrderRepository.ts` |
| line | 105 |
| column | 17 |
| TS code | TS2322 |
| normalized message | Type 'string \| null \| undefined' is not assignable to type 'string \| undefined'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Order persistence/read-model typing vs aggregate contracts |
| evidence | Order core-domain path |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-082

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-082 |
| file | `server/order/infrastructure/persistence/DrizzleOrderRepository.ts` |
| line | 114 |
| column | 15 |
| TS code | TS2322 |
| normalized message | Type 'string \| null \| undefined' is not assignable to type 'string \| undefined'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Order persistence/read-model typing vs aggregate contracts |
| evidence | Order core-domain path |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-083

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-083 |
| file | `server/order/read/infrastructure/backfill/OrderReadProjectionBackfillService.ts` |
| line | 12 |
| column | 15 |
| TS code | TS2459 |
| normalized message | Module '"@shared/utils/businessDay"' declares 'NormalizedWorkingHours' locally, but it is not exported. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Order persistence/read-model typing vs aggregate contracts |
| evidence | Order core-domain path |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-084

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-084 |
| file | `server/order/read/projections/materializers/orderAnalyticsDayKey.ts` |
| line | 18 |
| column | 8 |
| TS code | TS2459 |
| normalized message | Module '"@shared/utils/businessDay"' declares 'NormalizedWorkingHours' locally, but it is not exported. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Order persistence/read-model typing vs aggregate contracts |
| evidence | Order core-domain path |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-085

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-085 |
| file | `server/order/read/projections/materializers/OrderReadProjectionMaterializer.ts` |
| line | 42 |
| column | 15 |
| TS code | TS2459 |
| normalized message | Module '"@shared/utils/businessDay"' declares 'NormalizedWorkingHours' locally, but it is not exported. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Order persistence/read-model typing vs aggregate contracts |
| evidence | Order core-domain path |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-086

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-086 |
| file | `server/order/read/projections/materializers/projectionStatus.ts` |
| line | 4 |
| column | 8 |
| TS code | TS2459 |
| normalized message | Module '"@shared/utils/businessDay"' declares 'NormalizedWorkingHours' locally, but it is not exported. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Order persistence/read-model typing vs aggregate contracts |
| evidence | Order core-domain path |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-087

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-087 |
| file | `server/realtime-platform/gateway/RealtimeSseGateway.ts` |
| line | 267 |
| column | 26 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-088

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-088 |
| file | `server/realtime-platform/observability/realtimeObservabilityStore.ts` |
| line | 297 |
| column | 11 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<[number, number]>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-089

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-089 |
| file | `server/realtime-platform/pubsub/RealtimePubSub.ts` |
| line | 43 |
| column | 27 |
| TS code | TS2802 |
| normalized message | Type 'Set<RealtimeBusSubscriber>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-090

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-090 |
| file | `server/realtime-platform/tickets/RealtimeOpaqueTicketRegistry.ts` |
| line | 278 |
| column | 30 |
| TS code | TS2802 |
| normalized message | Type 'Map<string, RealtimeOpaqueTicketRecord>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-091

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-091 |
| file | `server/realtime-platform/tickets/RealtimeOpaqueTicketRegistry.ts` |
| line | 329 |
| column | 24 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<RealtimeOpaqueTicketRecord>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-092

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-092 |
| file | `server/reporting-platform/__scripts__/reportingUxRationalization.liveUat.ts` |
| line | 118 |
| column | 9 |
| TS code | TS2367 |
| normalized message | This comparison appears to be unintentional because the types 'ExecutiveSummaryCardId' and '"refundRate"' have no overlap. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | F — TOOLING / HARNESS |
| priority | P3 |
| likely cause | UAT/live script included by tsconfig include server/**/* |
| evidence | path under __scripts__ |
| remediation decision | TEST_HARNESS |
| status | OPEN |

### TSF-093

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-093 |
| file | `server/reporting-platform/__scripts__/reportingUxRationalization.liveUatData.ts` |
| line | 136 |
| column | 9 |
| TS code | TS2367 |
| normalized message | This comparison appears to be unintentional because the types 'ExecutiveSummaryCardId' and '"refundRate"' have no overlap. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | F — TOOLING / HARNESS |
| priority | P3 |
| likely cause | UAT/live script included by tsconfig include server/**/* |
| evidence | path under __scripts__ |
| remediation decision | TEST_HARNESS |
| status | OPEN |

### TSF-094

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-094 |
| file | `server/reporting-platform/businessMetricsAggregator.ts` |
| line | 203 |
| column | 54 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<[string, TrendAcc]>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-095

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-095 |
| file | `server/reporting-platform/financialReportingParity.ts` |
| line | 93 |
| column | 31 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-096

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-096 |
| file | `server/reporting-platform/financialReportingParity.ts` |
| line | 93 |
| column | 57 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-097

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-097 |
| file | `server/reporting-platform/financialReportingParity.ts` |
| line | 94 |
| column | 24 |
| TS code | TS2802 |
| normalized message | Type 'Set<any>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-098

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-098 |
| file | `server/reporting-platform/OrderSalesMetricsService.ts` |
| line | 146 |
| column | 18 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<[string, { orderCount: number; completedOrders: number; sales: number; }]>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-099

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-099 |
| file | `server/reporting-platform/PaymentMethodAnalyticsService.ts` |
| line | 83 |
| column | 14 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<["card" \| "cash" \| "other" \| "mada" \| "visa" \| "mastercard" \| "apple_pay" \| "stc_pay" \| "bank_transfer" \| "complimentary", Acc]>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-100

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-100 |
| file | `server/reporting-platform/PaymentMethodAnalyticsService.ts` |
| line | 130 |
| column | 21 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<Acc>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-101

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-101 |
| file | `server/reporting-platform/SalesChannelAnalyticsService.ts` |
| line | 65 |
| column | 29 |
| TS code | TS2802 |
| normalized message | Type 'Map<string, Acc>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-102

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-102 |
| file | `server/reporting-platform/SalesChannelAnalyticsService.ts` |
| line | 71 |
| column | 21 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<Acc>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-103

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-103 |
| file | `server/reporting-platform/SalesChannelAnalyticsService.ts` |
| line | 77 |
| column | 57 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<[string, Acc]>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-104

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-104 |
| file | `server/reporting-platform/settlementTransactionReportingAdapter.ts` |
| line | 56 |
| column | 14 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<["card" \| "cash" \| "other" \| "mada" \| "visa" \| "mastercard" \| "apple_pay" \| "stc_pay" \| "bank_transfer" \| "complimentary", { count: number; amount: number; }]>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-105

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-105 |
| file | `server/services/commercial-catalog/adoptionService.ts` |
| line | 101 |
| column | 11 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialBundleFeature>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-106

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-106 |
| file | `server/services/commercial-catalog/adoptionService.ts` |
| line | 106 |
| column | 11 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialLimitValue>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-107

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-107 |
| file | `server/services/commercial-catalog/adoptionService.ts` |
| line | 563 |
| column | 11 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialBundleFeature>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-108

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-108 |
| file | `server/services/commercial-catalog/adoptionService.ts` |
| line | 568 |
| column | 11 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialLimitValue>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-109

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-109 |
| file | `server/services/commercial-catalog/adoptionService.ts` |
| line | 636 |
| column | 11 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialBundleFeature>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-110

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-110 |
| file | `server/services/commercial-catalog/adoptionService.ts` |
| line | 641 |
| column | 11 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialLimitValue>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-111

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-111 |
| file | `server/services/commercial-catalog/index.ts` |
| line | 51 |
| column | 16 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialLivePlan>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-112

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-112 |
| file | `server/services/commercial-catalog/index.ts` |
| line | 60 |
| column | 11 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialLivePlan>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-113

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-113 |
| file | `server/services/commercial-catalog/index.ts` |
| line | 79 |
| column | 13 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialLivePlan>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-114

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-114 |
| file | `server/services/commercial-catalog/index.ts` |
| line | 145 |
| column | 42 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<[string, CommercialPrice]>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-115

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-115 |
| file | `server/services/commercial-catalog/index.ts` |
| line | 323 |
| column | 21 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialPrice>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-116

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-116 |
| file | `server/services/commercial-catalog/index.ts` |
| line | 374 |
| column | 31 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<[string, CommercialPrice]>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-117

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-117 |
| file | `server/services/commercial-catalog/index.ts` |
| line | 387 |
| column | 23 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialBillingCycle>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-118

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-118 |
| file | `server/services/commercial-catalog/index.ts` |
| line | 400 |
| column | 16 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialBillingCycle>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-119

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-119 |
| file | `server/services/commercial-catalog/index.ts` |
| line | 412 |
| column | 13 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialBillingCycle>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-120

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-120 |
| file | `server/services/commercial-catalog/index.ts` |
| line | 435 |
| column | 16 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialFeatureBundle>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-121

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-121 |
| file | `server/services/commercial-catalog/index.ts` |
| line | 443 |
| column | 16 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialBundleFeature>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-122

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-122 |
| file | `server/services/commercial-catalog/index.ts` |
| line | 455 |
| column | 13 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialFeatureBundle>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-123

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-123 |
| file | `server/services/commercial-catalog/index.ts` |
| line | 532 |
| column | 16 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialLimitProfile>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-124

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-124 |
| file | `server/services/commercial-catalog/index.ts` |
| line | 540 |
| column | 16 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialLimitValue>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-125

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-125 |
| file | `server/services/commercial-catalog/index.ts` |
| line | 552 |
| column | 13 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialLimitProfile>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-126

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-126 |
| file | `server/services/commercial-catalog/index.ts` |
| line | 620 |
| column | 16 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialPromotion>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-127

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-127 |
| file | `server/services/commercial-catalog/index.ts` |
| line | 635 |
| column | 13 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialPromotion>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-128

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-128 |
| file | `server/services/commercial-catalog/index.ts` |
| line | 661 |
| column | 16 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialMigrationPolicy>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-129

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-129 |
| file | `server/services/commercial-catalog/index.ts` |
| line | 677 |
| column | 13 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialMigrationPolicy>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-130

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-130 |
| file | `server/services/commercial-catalog/index.ts` |
| line | 714 |
| column | 16 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialRegion>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-131

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-131 |
| file | `server/services/commercial-catalog/index.ts` |
| line | 733 |
| column | 13 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialRegion>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-132

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-132 |
| file | `server/services/commercial-catalog/index.ts` |
| line | 783 |
| column | 16 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialTrialPolicy>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-133

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-133 |
| file | `server/services/commercial-catalog/index.ts` |
| line | 799 |
| column | 13 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialTrialPolicy>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-134

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-134 |
| file | `server/services/commercial-catalog/index.ts` |
| line | 832 |
| column | 24 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialPrice>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-135

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-135 |
| file | `server/services/commercial-catalog/index.ts` |
| line | 836 |
| column | 26 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialBillingCycle>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-136

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-136 |
| file | `server/services/commercial-catalog/index.ts` |
| line | 857 |
| column | 21 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialLivePlan>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-137

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-137 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 96 |
| column | 22 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialPrice>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-138

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-138 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 99 |
| column | 20 |
| TS code | TS2802 |
| normalized message | Type 'Set<any>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-139

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-139 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 106 |
| column | 20 |
| TS code | TS2802 |
| normalized message | Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-140

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-140 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 113 |
| column | 21 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialBundleFeature>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-141

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-141 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 120 |
| column | 21 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialLimitValue>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-142

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-142 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 164 |
| column | 18 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<T>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-143

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-143 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 198 |
| column | 18 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialLivePlan>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-144

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-144 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 199 |
| column | 19 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialPrice>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-145

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-145 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 200 |
| column | 26 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialBillingCycle>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-146

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-146 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 201 |
| column | 27 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialFeatureBundle>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-147

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-147 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 202 |
| column | 27 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialBundleFeature>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-148

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-148 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 203 |
| column | 26 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialLimitProfile>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-149

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-149 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 204 |
| column | 24 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialLimitValue>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-150

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-150 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 205 |
| column | 26 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialTrialPolicy>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-151

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-151 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 206 |
| column | 20 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialRegion>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-152

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-152 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 207 |
| column | 30 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialMigrationPolicy>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-153

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-153 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 208 |
| column | 23 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialPromotion>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-154

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-154 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 235 |
| column | 21 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialLivePlan>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-155

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-155 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 264 |
| column | 21 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialBillingCycle>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-156

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-156 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 285 |
| column | 21 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialFeatureBundle>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-157

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-157 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 300 |
| column | 21 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialBundleFeature>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-158

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-158 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 311 |
| column | 21 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialLimitProfile>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-159

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-159 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 326 |
| column | 21 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialLimitValue>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-160

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-160 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 338 |
| column | 21 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialTrialPolicy>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-161

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-161 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 358 |
| column | 21 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialMigrationPolicy>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-162

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-162 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 379 |
| column | 21 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialRegion>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-163

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-163 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 406 |
| column | 21 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialPromotion>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-164

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-164 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 433 |
| column | 21 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialPrice>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-165

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-165 |
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 469 |
| column | 24 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialPrice>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-166

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-166 |
| file | `server/services/commercial-catalog/persistentCatalogBootstrap.ts` |
| line | 83 |
| column | 33 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<CommercialBundleFeature>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-167

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-167 |
| file | `server/services/commercial-catalog/runtimeAuthorityObservability.ts` |
| line | 72 |
| column | 34 |
| TS code | TS2802 |
| normalized message | Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-168

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-168 |
| file | `shared/commercial-catalog/localization/fx.ts` |
| line | 137 |
| column | 22 |
| TS code | TS7053 |
| normalized message | Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ USD: number; }'. |
| baseline state | UNCHANGED |
| current state | REMOVED |
| category | B — REAL TYPE SAFETY DEFECT |
| priority | P2 |
| likely cause | Spread { USD: 1, ...rates } inferred as { USD: number } instead of FxRateTable. |
| evidence | FxRateTable = Record<string, number>; convertSync table[from]/table[to] |
| remediation decision | FIX_NOW |
| status | FIXED |

### TSF-169

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-169 |
| file | `shared/commercial-catalog/localization/fx.ts` |
| line | 138 |
| column | 20 |
| TS code | TS7053 |
| normalized message | Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ USD: number; }'. |
| baseline state | UNCHANGED |
| current state | REMOVED |
| category | B — REAL TYPE SAFETY DEFECT |
| priority | P2 |
| likely cause | Spread { USD: 1, ...rates } inferred as { USD: number } instead of FxRateTable. |
| evidence | FxRateTable = Record<string, number>; convertSync table[from]/table[to] |
| remediation decision | FIX_NOW |
| status | FIXED |

### TSF-170

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-170 |
| file | `shared/crmp/settlementContext/resolveSettlementContext.ts` |
| line | 76 |
| column | 56 |
| TS code | TS18049 |
| normalized message | 'hints.registerId' is possibly 'null' or 'undefined'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Check/Settlement projection or command types incomplete. Correct fix may need an architecture program. |
| evidence | Check/Settlement path; Constitution ownership |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-171

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-171 |
| file | `shared/data-retention/adapters/retentionAdapter.ts` |
| line | 59 |
| column | 21 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<Readonly<{ entityType: "check" \| "session" \| "notification" \| "order" \| "register" \| "settlement_record" \| "financial_shift" \| "audit_event" \| "print_job" \| "device_log" \| "operational_log" \| "kitchen_history" \| "reporting_snapshot" \| "generic"; resolveEntity: (subject: Readonly<...>) => boolean \| Promis...' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-172

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-172 |
| file | `shared/data-retention/holds/retentionHolds.ts` |
| line | 54 |
| column | 18 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<Readonly<{ holdId: string; kind: "legal_hold" \| "financial_hold" \| "manual_hold"; restaurantId: number; entityType: "check" \| "session" \| "notification" \| "order" \| "register" \| "settlement_record" \| ... 7 more ... \| "generic"; ... 4 more ...; placedBy?: string \| undefined; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-173

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-173 |
| file | `shared/data-retention/holds/retentionHolds.ts` |
| line | 59 |
| column | 18 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<Readonly<{ holdId: string; kind: "legal_hold" \| "financial_hold" \| "manual_hold"; restaurantId: number; entityType: "check" \| "session" \| "notification" \| "order" \| "register" \| "settlement_record" \| ... 7 more ... \| "generic"; ... 4 more ...; placedBy?: string \| undefined; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-174

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-174 |
| file | `shared/data-retention/registry/policyRegistry.ts` |
| line | 95 |
| column | 21 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<Readonly<{ policyId: string; entityType: "check" \| "session" \| "notification" \| "order" \| "register" \| "settlement_record" \| "financial_shift" \| "audit_event" \| "print_job" \| "device_log" \| "operational_log" \| "kitchen_history" \| "reporting_snapshot" \| "generic"; ... 13 more ...; restaurantId?: number \| ...' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-175

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-175 |
| file | `shared/data-retention/registry/policyRegistry.ts` |
| line | 107 |
| column | 28 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<Readonly<{ policyId: string; entityType: "check" \| "session" \| "notification" \| "order" \| "register" \| "settlement_record" \| "financial_shift" \| "audit_event" \| "print_job" \| "device_log" \| "operational_log" \| "kitchen_history" \| "reporting_snapshot" \| "generic"; ... 13 more ...; restaurantId?: number \| ...' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-176

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-176 |
| file | `shared/data-retention/registry/policyRegistry.ts` |
| line | 118 |
| column | 24 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<Readonly<{ policyId: string; entityType: "check" \| "session" \| "notification" \| "order" \| "register" \| "settlement_record" \| "financial_shift" \| "audit_event" \| "print_job" \| "device_log" \| "operational_log" \| "kitchen_history" \| "reporting_snapshot" \| "generic"; ... 13 more ...; restaurantId?: number \| ...' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-177

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-177 |
| file | `shared/operational-session/check/multiCheckAllocation/multiCheckAllocationCommands.ts` |
| line | 159 |
| column | 27 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<number>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-178

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-178 |
| file | `shared/operational-session/check/multiCheckAllocation/multiCheckAllocationCommands.ts` |
| line | 174 |
| column | 32 |
| TS code | TS2802 |
| normalized message | Type 'Map<number, number>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-179

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-179 |
| file | `shared/operational-session/check/multiCheckAllocation/projection/multiCheckAllocationProjectionBuilder.ts` |
| line | 458 |
| column | 8 |
| TS code | TS2802 |
| normalized message | Type 'Set<number>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-180

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-180 |
| file | `shared/operational-session/check/splitPayment/projection/splitPaymentProjectionBuilder.ts` |
| line | 152 |
| column | 8 |
| TS code | TS2802 |
| normalized message | Type 'Set<TenderMethod>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-181

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-181 |
| file | `shared/operational-session/check/splitPayment/projection/splitPaymentProjectionBuilder.ts` |
| line | 311 |
| column | 11 |
| TS code | TS2339 |
| normalized message | Property 'eventType' does not exist on type 'never'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Check/Settlement projection or command types incomplete. Correct fix may need an architecture program. |
| evidence | Check/Settlement path; Constitution ownership |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-182

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-182 |
| file | `shared/operational-session/check/splitPayment/projection/splitPaymentProjectionBuilder.ts` |
| line | 312 |
| column | 11 |
| TS code | TS2339 |
| normalized message | Property 'restaurantId' does not exist on type 'never'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Check/Settlement projection or command types incomplete. Correct fix may need an architecture program. |
| evidence | Check/Settlement path; Constitution ownership |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-183

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-183 |
| file | `shared/operational-session/check/splitPayment/projection/splitPaymentProjectionBuilder.ts` |
| line | 313 |
| column | 11 |
| TS code | TS2339 |
| normalized message | Property 'checkId' does not exist on type 'never'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Check/Settlement projection or command types incomplete. Correct fix may need an architecture program. |
| evidence | Check/Settlement path; Constitution ownership |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-184

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-184 |
| file | `shared/operational-session/check/splitPayment/projection/splitPaymentProjectionBuilder.ts` |
| line | 314 |
| column | 11 |
| TS code | TS2339 |
| normalized message | Property 'occurredAt' does not exist on type 'never'. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | C — ARCHITECTURAL TYPE CONTRACT DEFECT |
| priority | P2 |
| likely cause | Check/Settlement projection or command types incomplete. Correct fix may need an architecture program. |
| evidence | Check/Settlement path; Constitution ownership |
| remediation decision | ARCHITECTURE_PROGRAM_REQUIRED |
| status | OPEN |

### TSF-185

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-185 |
| file | `shared/read-freshness/mergeOrderCaches.ts` |
| line | 125 |
| column | 24 |
| TS code | TS2802 |
| normalized message | Type 'MapIterator<KitchenTicketLike>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | H — CONFIGURATION / COMPILER POLICY |
| priority | P3 |
| likely cause | tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS. |
| evidence | compilerOptions.module=ESNext, no target, no downlevelIteration |
| remediation decision | CONFIGURATION |
| status | OPEN |

### TSF-186

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-186 |
| file | `shared/reporting-platform/legacyReportingSurfaces.ts` |
| line | 150 |
| column | 15 |
| TS code | TS2677 |
| normalized message | A type predicate's type must be assignable to its parameter's type. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | D — LEGACY CODE |
| priority | P3 |
| likely cause | Reporting presentation/legacy surface typing |
| evidence | reporting-platform / reporting-exports path |
| remediation decision | LEGACY_ACCEPTED |
| status | OPEN |

### TSF-187

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-187 |
| file | `shared/reporting-platform/timeSeries/businessDayReporting.ts` |
| line | 12 |
| column | 8 |
| TS code | TS2459 |
| normalized message | Module '"../../utils/businessDay"' declares 'NormalizedWorkingHours' locally, but it is not exported. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | D — LEGACY CODE |
| priority | P3 |
| likely cause | Reporting presentation/legacy surface typing |
| evidence | reporting-platform / reporting-exports path |
| remediation decision | LEGACY_ACCEPTED |
| status | OPEN |

### TSF-188

| Field | Value |
|-------|-------|
| diagnostic ID | TSF-188 |
| file | `shared/reporting-platform/timeSeries/calendar.ts` |
| line | 12 |
| column | 15 |
| TS code | TS2459 |
| normalized message | Module '"../../utils/businessDay"' declares 'NormalizedWorkingHours' locally, but it is not exported. |
| baseline state | UNCHANGED |
| current state | PRESENT |
| category | D — LEGACY CODE |
| priority | P3 |
| likely cause | Reporting presentation/legacy surface typing |
| evidence | reporting-platform / reporting-exports path |
| remediation decision | LEGACY_ACCEPTED |
| status | OPEN |

