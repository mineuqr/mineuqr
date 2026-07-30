# Plan Adoption Report

**Program:** COMMERCIAL-PROJECTION-GENERATION-1

## Changes

| Surface | Adoption |
|---------|----------|
| Plan feature bundles | Projection IDs only after normalize |
| Plan Wizard / Filter Picker | Lists Projection registry |
| Unbound `planFeatureMatrix` | Builds rows for Projection ∪ Legacy Compat |
| Published Offerings featureKeys | Projection IDs |

Plans **reference Commercial Projection IDs**, never raw Discovery names, never independent FEATURE_KEYS lists.

## Behavior preserved

Unbound legacy bridge still resolves commercial plans; feature matrix covers Runtime FeatureKey set so entitlements objects remain complete.
