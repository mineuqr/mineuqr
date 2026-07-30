# Bootstrap Governance Report

## Canonical empty catalog

`isPersistentCatalogUninitialized()` — true only when all of:

- plans = 0  
- versions = 0  
- prices = 0  
- billing cycles = 0  
- feature bundles / bundle features = 0  
- limit profiles / values = 0  

**Not** based on `publishedVersions === 0`.

## Activation

| Condition | Action |
|-----------|--------|
| Uninitialized | Bootstrap once (create + publish drafts) |
| Initialized (any lifecycle) | Return `already_initialized` — hydrate only, no publish |

## Publication inside bootstrap

`catalogPublishingService.publish` only when `version.state === "draft"`.
