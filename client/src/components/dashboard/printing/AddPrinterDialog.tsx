import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function AddPrinterDialog({
  open,
  onOpenChange,
  restaurantId,
  isAr,
  hasExistingPrinters,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: number;
  isAr: boolean;
  hasExistingPrinters: boolean;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [paperWidthMm, setPaperWidthMm] = useState<"58" | "80">("80");
  const [isDefault, setIsDefault] = useState(true);

  useEffect(() => {
    if (!open) {
      setName("");
      setPaperWidthMm("80");
      setIsDefault(true);
    }
  }, [open]);

  const createMutation = trpc.printOps.createPrinter.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تمت إضافة الطابعة" : "Printer Added", {
        description: isAr
          ? "الخطوة التالية: ربط جهاز نقطة البيع"
          : "Next step: connect your POS device",
      });
      onCreated();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(isAr ? "تعذر إضافة الطابعة" : "Could Not Add Printer", {
        description: error.message,
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isAr ? "إضافة طابعة" : "Add Printer"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="printer-name">{isAr ? "اسم الطابعة" : "Printer Name"}</Label>
            <Input
              id="printer-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={isAr ? "مثال: طابعة المطبخ" : "e.g. Kitchen Printer"}
            />
          </div>
          <div className="space-y-2">
            <Label>{isAr ? "عرض الورق" : "Paper Width"}</Label>
            <Select value={paperWidthMm} onValueChange={(value) => setPaperWidthMm(value as "58" | "80")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="80">80 mm</SelectItem>
                <SelectItem value="58">58 mm</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {hasExistingPrinters ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/40 px-3 py-2">
              <div>
                <p className="text-sm font-medium">{isAr ? "طابعة افتراضية" : "Default Printer"}</p>
                <p className="text-xs text-muted-foreground">
                  {isAr ? "تُستخدم للطباعة التلقائية" : "Used for automatic printing"}
                </p>
              </div>
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
            </div>
          ) : null}
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {isAr ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            type="button"
            disabled={!name.trim() || createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                restaurantId,
                name: name.trim(),
                paperWidthMm: Number(paperWidthMm) as 58 | 80,
                isDefault: hasExistingPrinters ? isDefault : true,
              })
            }
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isAr ? "إضافة" : "Add Printer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
