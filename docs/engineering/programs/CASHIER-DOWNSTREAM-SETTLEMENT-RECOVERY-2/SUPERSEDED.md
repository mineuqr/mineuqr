# SUPERSEDED — CASHIER-DOWNSTREAM-SETTLEMENT-RECOVERY-2

**الحالة:** محفوظ كسجل تاريخي؛ superseded في Phase 2 — Cashier Critical Path Simplification.

كان هذا البرنامج يضيف Vercel Cron وendpoint سرياً وworker لاستعادة تسوية Cashier بعد حقيقة Collection Fact. القرار المعتمد استبدل ذلك بعقد صريح: **Collection Fact create/replay = PAID = HTTP success**. لا تعتمد صحة دفع Cashier على Vercel أو `CRON_SECRET` أو انتظار تسوية تشغيلية أو التحقق من إيصال أو تقرير.

تمت إزالة cron ومسار HTTP والعامل ومحاولات الاسترداد الخاصة بهذا البرنامج. يبقى بعد الاستجابة تسليم best-effort محدود لمعالجة Check وST وOS وSR المشروعة. هذا التسليم لا يقرر الدفع ولا يعيد محاولة مالية ولا ينشئ queue أو ledger أو حقيقة Collection Fact أخرى.

لا يصرح هذا السجل بحذف ST/OS/SR من المنصة ولا يغير المسارات غير الخاصة بـ Cashier.
