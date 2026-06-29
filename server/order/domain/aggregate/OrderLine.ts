export type OrderLineProps = {
  id?: number;
  menuItemId: number;
  nameAr: string;
  nameEn: string | null;
  unitPrice: string;
  quantity: number;
  notes: string | null;
};

export class OrderLine {
  readonly id?: number;
  readonly menuItemId: number;
  readonly nameAr: string;
  readonly nameEn: string | null;
  readonly unitPrice: string;
  readonly quantity: number;
  readonly notes: string | null;

  private constructor(props: OrderLineProps) {
    if (props.quantity < 1 || props.quantity > 99) {
      throw new Error("Invalid line quantity");
    }
    this.id = props.id;
    this.menuItemId = props.menuItemId;
    this.nameAr = props.nameAr;
    this.nameEn = props.nameEn;
    this.unitPrice = props.unitPrice;
    this.quantity = props.quantity;
    this.notes = props.notes;
  }

  static create(props: OrderLineProps): OrderLine {
    return new OrderLine(props);
  }

  lineTotal(): number {
    return parseFloat(this.unitPrice) * this.quantity;
  }

  toProps(): OrderLineProps {
    return {
      id: this.id,
      menuItemId: this.menuItemId,
      nameAr: this.nameAr,
      nameEn: this.nameEn,
      unitPrice: this.unitPrice,
      quantity: this.quantity,
      notes: this.notes,
    };
  }
}
