# BILLING CYCLE GOVERNANCE

Admin monthly → yearly: new snapshot uses yearly Live Plan offer (`currentPriceForPlan(planId, "yearly")`). Never `monthlyAmount * 12`. Never overwrite snapshot #1.

Yearly → monthly uses monthly offer.
