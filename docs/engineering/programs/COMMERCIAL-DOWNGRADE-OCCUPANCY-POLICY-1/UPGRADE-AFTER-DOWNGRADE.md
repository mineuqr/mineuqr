# UPGRADE AFTER DOWNGRADE

**Program:** COMMERCIAL-DOWNGRADE-OCCUPANCY-POLICY-1  

## Policy

Upgrade changes the effective cap immediately. Existing rows stay intact. No downgrade marker must be cleared. No debt table.

The next `checkLimit(proposedTotal)` uses the new cap.

## TiDB evidence

occupancy 2, create at cap 1 rejected, create at cap 3 allowed, occupancy 3.

## What is not required

- Persistent downgrade-debt table
- Manual “unblock creation” flag
- Re-running bind to “heal” occupancy
- Recalculating a shadow counter
