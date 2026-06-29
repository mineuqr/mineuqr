export class OrderDomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "OrderDomainError";
    this.code = code;
  }
}

export class OrderAlreadyCompletedError extends OrderDomainError {
  constructor() {
    super("OrderAlreadyCompleted", "الطلب مكتمل بالفعل");
  }
}

export class OrderAlreadyCancelledError extends OrderDomainError {
  constructor() {
    super("OrderAlreadyCancelled", "الطلب ملغى بالفعل");
  }
}

export class InvalidTransitionError extends OrderDomainError {
  constructor(from: string, to: string) {
    super(
      "InvalidTransition",
      `انتقال غير مسموح من ${from} إلى ${to}`
    );
  }
}

export class OrderImmutableError extends OrderDomainError {
  constructor() {
    super("OrderImmutable", "لا يمكن تعديل الطلب بعد الإنشاء");
  }
}

export class EmptyOrderError extends OrderDomainError {
  constructor() {
    super("EmptyOrder", "السلة فارغة");
  }
}

export class DuplicateLineItemError extends OrderDomainError {
  constructor() {
    super("DuplicateLineItem", "صنف مكرر في الطلب");
  }
}

export class AccessDeniedError extends OrderDomainError {
  constructor() {
    super("AccessDenied", "غير مصرح");
  }
}

export class ConcurrencyConflictError extends OrderDomainError {
  constructor() {
    super("ConcurrencyConflict", "تم تحديث الطلب من جهة أخرى");
  }
}

export class OrderNotFoundError extends OrderDomainError {
  constructor() {
    super("OrderNotFound", "الطلب غير موجود");
  }
}
