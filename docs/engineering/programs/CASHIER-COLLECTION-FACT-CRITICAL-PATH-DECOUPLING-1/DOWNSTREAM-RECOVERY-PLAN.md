# DOWNSTREAM-DELIVERY-PLAN

## Current approved contract

**Cashier success = Production Collection Fact created or replayed.** هذا يعني **PAID** ثم HTTP success. ولا يعني نجاح Cashier أن Check أصبح `PAID` أو أن ST أو OS أو SR اكتملت أو أن الإيصال أو التقرير أصبحا جاهزين.

## Mechanism

يستخدم المسار المنفذ `dispatchBestEffortDownstreamDelivery` بعد عودة مسار Cashier المالي. تستدعي الدالة `completeCashierOperationalSettlementAfterCollectionFact` لمعالجة Check وST/OS/SR عند الإمكان، وتسجل فشل المعالجة الخلفية. لا تعيد المحاولة، ولا تستطلع الحالة، ولا تملك cron أو worker أو queue أو endpoint، ولا تكتب Collection Fact ولا تغير PAID إلى فشل.

| المجال | العقد المنفذ |
|---|---|
| الحد المالي | `commitCashierProductionCollectionFact` create/replay |
| HTTP | نجاح بعد Collection Fact فقط |
| التسليم الخلفي | محاولة best-effort غير حاجبة |
| فشل Check/ST/OS/SR | ملاحظة تشغيلية؛ لا يغير الدفع |
| نتيجة HTTP مجهولة للمتصفح | إعادة نفس أمر Cashier بنفس `paymentIntentId` و`idempotencyKey` |
| التكرار | uniqueness/fingerprint في Collection Fact؛ لا حقيقة ثانية |
| Vercel | لا Cron ولا `CRON_SECRET` لصحة Cashier |

## Explicit exclusions

لا يستخدم Cashier lookup لـ Check أو `financiallyPaid` أو Settlement Record لكي يقرر الدفع بعد انقطاع شبكة. كما لا توجد Cashier-specific recovery state أو worker أو HTTP sweep. بقيت ST وOS وSR مكونات منصة تشغيلية مشروعة للتدفقات غير الخاصة بـ Cashier.

## Ownership

Cashier Confirm لا يملك persistence التشغيلي اللاحق. Collection Fact تظل insert-only ومالية authoritative؛ وCheck/service owners يحتفظون بكتابة الإسقاطات التشغيلية دون أن يصبحوا سلطة دفع ثانية.
