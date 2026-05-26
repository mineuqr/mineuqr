import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BillingCycle } from "@/lib/subscription";
import { getBillingCycleLabel } from "@/lib/subscription";

type SubscriptionCycleSelectorProps = {
  value: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
  label: string;
  locale: "ar" | "en";
  id?: string;
};

export function SubscriptionCycleSelector({
  value,
  onChange,
  label,
  locale,
  id = "billing-cycle",
}: SubscriptionCycleSelectorProps) {
  return (
    <div>
      <Label htmlFor={id} className="text-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={(v) => onChange(v as BillingCycle)}>
        <SelectTrigger id={id} className="mt-2 bg-background border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="monthly">{getBillingCycleLabel("monthly", locale)}</SelectItem>
          <SelectItem value="yearly">{getBillingCycleLabel("yearly", locale)}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
