/**
 * OPERATIONAL-SESSION-PLATFORM-1 — platform-level session errors.
 * Table specialization may still throw DiningSession* errors from adapters.
 */

export class OperationalSessionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OperationalSessionValidationError";
  }
}

export class OperationalSessionAnchorNotActivatedError extends Error {
  readonly anchorType: string;

  constructor(anchorType: string) {
    super(
      `Operational Session anchor type "${anchorType}" is not activated for PlaceOrder resolution`
    );
    this.name = "OperationalSessionAnchorNotActivatedError";
    this.anchorType = anchorType;
  }
}
