# ADMIN CYCLE CHANGE

Same transaction path as plan change.

Yearly uses `currentPriceForPlan(planId, "yearly")`. Monthly uses `"monthly"`. Never `monthlyAmount * 12` when a yearly catalog price exists. Missing cycle price fails closed.
