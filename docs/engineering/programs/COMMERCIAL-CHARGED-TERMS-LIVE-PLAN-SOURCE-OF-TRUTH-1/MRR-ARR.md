# MRR / ARR

**MRR** = sum of monthly equivalents of each qualifying subscription’s **current Charged Terms snapshot**. Missing snapshot → no contribution (not Binding leftover, not catalog).

Yearly snapshot monthly equivalent = amount / 12.

Two customers on the same Live Plan may contribute different MRR ($10 + $9 = $19).

**ARR** = existing canonical rule `MRR × 12` (`arrMethod: "MRR_X12"`). $19 MRR → $228 ARR. Not catalog price × 12. Authority was already Charged-Terms MRR; this program did not change ARR semantics.
