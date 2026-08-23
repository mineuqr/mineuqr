# SUPERSEDED — CASHIER-DOWNSTREAM-SETTLEMENT-RECOVERY-1

**الحالة:** محفوظ كسجل تاريخي؛ superseded في Phase 2 — Cashier Critical Path Simplification.

كان هذا البرنامج يعرّف استرداداً خاصاً بـ Cashier من واقع Production Collection Fact وCheck وST/OS/SR. القرار المعتمد لاحقاً أبسط: عندما تنشأ أو يعاد تشغيل **Collection Fact** صالحة، يكون الدفع **PAID** وتعود استجابة HTTP بنجاح. لا تعد حالة Check أو ST أو OS أو SR أو مسار recovery دليلاً إضافياً مطلوباً لنجاح Cashier.

تمت إزالة worker وHTTP sweep وderived recovery state وretry/backoff الخاصين بهذا البرنامج من مسار Cashier. بقيت ST وOS وSR مكونات منصة تشغيلية شرعية، ويمكن تشغيلها بعد الالتزام بواسطة تسليم خلفي best-effort لا يعدّل Collection Fact ولا يخلق سلطة مالية ثانية ولا يوقف الاستجابة.

لا يحذف هذا السجل الوثائق التاريخية أو يغير التدفقات غير الخاصة بـ Cashier.
