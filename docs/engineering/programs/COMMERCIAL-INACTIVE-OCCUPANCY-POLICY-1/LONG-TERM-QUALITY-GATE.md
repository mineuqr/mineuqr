# LONG-TERM QUALITY GATE

**Program:** COMMERCIAL-INACTIVE-OCCUPANCY-POLICY-1  

## REQUIRED NOW

Document and test the occupancy set per resource class (done). Do not hide catalog inactive from COUNT.

## REQUIRED FOUNDATION FOR FUTURE

Keep occupancy definitions in the COUNT callback next to the resource. New quantity resources must declare whether operational hide releases a slot (default: **no**, unless the unit is a provisioned identity like POS).

## SAFE TO DEFER

G-11 downgrade when occupancy > new cap. Staff/branches quantity occupancy (no COUNT path). POS hard-delete API. stagIn `pos_terminals` table.

## SHOULD NEVER BE INTRODUCED

Inactive counters · grace-period Commercial tables · hiding rows from COUNT to pass races · POS-specific lock · role-specific inactive policy · treating `replaced` as a second terminal

## Scale

Many restaurants: each hidden location still a slot — predictable billing.  
Many terminals: deactivate frees a provisioned slot for another cashier device.  
Branches: when a COUNT path exists, decide explicitly; do not copy POS deactivated by accident.
