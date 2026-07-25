/**
 * REGISTER-CREATION-UX-CONSOLIDATION-1 /
 * REGISTER-CREATION-LABEL-ADOPTION-1 —
 * Hosts the single RegisterCatalogForm inside Register Operations.
 * Visible title: إنشاء صندوق. Catalog remains create owner internally.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RegisterCatalogForm } from "@/components/register-catalog/RegisterCatalogForm";
import {
  registerCatalogUiLabel,
  type CatalogLanguage,
} from "@/lib/register-catalog-presentation";
import { registerOperationsUiLabel } from "@/lib/register-operations-presentation";

type Props = {
  open: boolean;
  restaurantId: number;
  language: CatalogLanguage;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
};

export function CreateRegisterDialog({
  open,
  restaurantId,
  language,
  onOpenChange,
  onCreated,
}: Props) {
  const dir = language === "ar" ? "rtl" : "ltr";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir={dir}
        className="max-w-2xl gap-0 overflow-hidden p-0 sm:max-w-2xl"
        aria-describedby="create-register-desc"
      >
        <DialogHeader className="border-b border-slate-800/80 px-4 py-3 text-start sm:px-5">
          <DialogTitle>
            {registerCatalogUiLabel("createDialogTitle", language)}
          </DialogTitle>
          <DialogDescription id="create-register-desc" className="text-slate-400">
            {registerOperationsUiLabel("createRegisterEmbeddedHint", language)}
          </DialogDescription>
        </DialogHeader>
        <div className="px-4 py-4 sm:px-5">
          {open ? (
            <RegisterCatalogForm
              restaurantId={restaurantId}
              language={language}
              editing={null}
              showHeading={false}
              onCancel={() => onOpenChange(false)}
              onSuccess={onCreated}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
