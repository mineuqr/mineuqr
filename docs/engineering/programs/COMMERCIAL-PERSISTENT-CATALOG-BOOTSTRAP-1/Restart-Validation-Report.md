# Restart Validation Report

Architecture test: bootstrap → clear runtime store → `ensureCatalogReady` → public offerings IDs unchanged.

Live: hydrate from DB returns `already_published` with 3 versions (survives process restart / new CLI process).
