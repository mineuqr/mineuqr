# LEGACY-BRIDGE

Legacy Bridge (`planFeatureMatrix`, `buildCommercialContextFromDb`, `subscription_plans` quotas) executes **only** when no SubscriptionBinding exists.

Bound subscriptions never enter Bridge for commercial facts or quotas.
