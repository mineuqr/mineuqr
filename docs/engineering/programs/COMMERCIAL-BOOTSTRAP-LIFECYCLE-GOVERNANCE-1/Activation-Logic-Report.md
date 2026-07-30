# Activation Logic Report

## Before (incorrect)

```
if (publishedVersions === 0) → bootstrap → publish(non-published including retired)
```

## After (governed)

```
if (!isPersistentCatalogUninitialized()) → return already_initialized
else → create graph → publish(draft only)
```

Result reason renamed: `already_published` → `already_initialized`.
