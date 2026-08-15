# INVOICE IMPACT

`generateInvoicePDF` still calls `getSubscriptionCommercialBinding`. That reader overlays **current snapshot** charged fields when a snapshot exists.

New invoices freeze that amount onto `invoices.amount`. Historical invoice rows are unchanged.

Invoice period-as-of historical snapshot lookup is not implemented; Admin PDF is issued “now” against current terms. If a future program invoices a past period, it must use `effectiveFrom` selection — not this workaround.
