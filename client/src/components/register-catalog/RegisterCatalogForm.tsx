/**
 * REGISTER-CATALOG-MANAGEMENT-1 /
 * REGISTER-CREATION-UX-CONSOLIDATION-1 —
 * Single create/edit register form. Catalog remains create owner (crmp.catalog.*).
 * Presentation only — reused by Catalog panel and Register Operations dialog.
 */

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  catalogFieldErrorId,
  presentRegisterCatalogError,
  registerCatalogUiLabel,
  registerCatalogValidationMessage,
  registerTypeLabel,
  useRegisterCatalogMutations,
  type CatalogFormField,
  type CatalogLanguage,
  type CatalogRegisterDto,
  type CatalogValidationMessageKey,
} from "@/lib/register-catalog-presentation";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type RegisterType = CatalogRegisterDto["registerType"];

const TYPES: RegisterType[] = [
  "settlement_station",
  "counter",
  "mobile_pos",
];

function emptyForm() {
  return {
    code: "",
    displayName: "",
    registerType: "counter" as RegisterType,
  };
}

function FieldHelper({
  field,
  messageKey,
  language,
}: {
  field: CatalogFormField;
  messageKey: CatalogValidationMessageKey | undefined;
  language: CatalogLanguage;
}) {
  if (!messageKey) return null;
  return (
    <p
      id={catalogFieldErrorId(field)}
      className="text-xs text-rose-300"
      role="alert"
    >
      {registerCatalogValidationMessage(messageKey, language)}
    </p>
  );
}

export type RegisterCatalogFormProps = {
  restaurantId: number;
  language: CatalogLanguage;
  /** null = create mode */
  editing?: CatalogRegisterDto | null;
  onCancel: () => void;
  onSuccess?: () => void;
  /** When false, parent supplies the heading (e.g. DialogTitle). */
  showHeading?: boolean;
  className?: string;
};

export function RegisterCatalogForm({
  restaurantId,
  language,
  editing = null,
  onCancel,
  onSuccess,
  showHeading = true,
  className,
}: RegisterCatalogFormProps) {
  const mutations = useRegisterCatalogMutations(restaurantId);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<CatalogFormField, CatalogValidationMessageKey>>
  >({});
  const [globalErrorKey, setGlobalErrorKey] =
    useState<CatalogValidationMessageKey | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const submittingRef = useRef(false);

  const formBusy =
    mutations.create.isPending || mutations.update.isPending;

  useEffect(() => {
    if (editing) {
      setForm({
        code: editing.code,
        displayName: editing.displayName,
        registerType: editing.registerType,
      });
    } else {
      setForm(emptyForm());
    }
    setFieldErrors({});
    setGlobalErrorKey(null);
  }, [editing]);

  function clearFieldError(field: CatalogFormField) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function focusField(field: CatalogFormField | null) {
    if (field === "code") codeRef.current?.focus();
    else if (field === "displayName") nameRef.current?.focus();
    else if (field === "registerType") typeRef.current?.focus();
  }

  async function submitForm() {
    if (submittingRef.current || formBusy) return;
    submittingRef.current = true;
    setFieldErrors({});
    setGlobalErrorKey(null);
    try {
      if (editing) {
        await mutations.update.mutateAsync({
          restaurantId,
          registerId: editing.registerId,
          code: form.code,
          displayName: form.displayName,
          registerType: form.registerType,
          expectedVersion: editing.version,
        });
        toast.success(
          registerCatalogUiLabel("saveSuccessUpdate", language)
        );
      } else {
        await mutations.create.mutateAsync({
          restaurantId,
          code: form.code,
          displayName: form.displayName,
          registerType: form.registerType,
        });
        toast.success(
          registerCatalogUiLabel("saveSuccessCreate", language)
        );
      }
      onSuccess?.();
      onCancel();
    } catch (e) {
      const presented = presentRegisterCatalogError(e);
      setFieldErrors(presented.fieldErrors);
      setGlobalErrorKey(presented.globalKey);
      focusField(presented.firstInvalidField);
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <div
      className={cn("space-y-3", className)}
      role="form"
      aria-busy={formBusy || undefined}
      aria-label={
        editing
          ? registerCatalogUiLabel("editDialogTitle", language)
          : registerCatalogUiLabel("createDialogTitle", language)
      }
    >
      {showHeading ? (
        <h3 className="text-base font-medium text-white">
          {editing
            ? registerCatalogUiLabel("editDialogTitle", language)
            : registerCatalogUiLabel("createDialogTitle", language)}
        </h3>
      ) : null}

      {globalErrorKey && (
        <div
          className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
          role="alert"
        >
          {registerCatalogValidationMessage(globalErrorKey, language)}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="reg-code">
            {registerCatalogUiLabel("code", language)}
          </Label>
          <Input
            ref={codeRef}
            id="reg-code"
            value={form.code}
            onChange={(e) => {
              clearFieldError("code");
              setForm((f) => ({ ...f, code: e.target.value }));
            }}
            autoComplete="off"
            disabled={formBusy}
            aria-invalid={fieldErrors.code ? true : undefined}
            aria-describedby={
              fieldErrors.code ? catalogFieldErrorId("code") : undefined
            }
            className={cn(
              fieldErrors.code &&
                "border-rose-500 focus-visible:ring-rose-500"
            )}
          />
          <FieldHelper
            field="code"
            messageKey={fieldErrors.code}
            language={language}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="reg-name">
            {registerCatalogUiLabel("displayName", language)}
          </Label>
          <Input
            ref={nameRef}
            id="reg-name"
            value={form.displayName}
            onChange={(e) => {
              clearFieldError("displayName");
              setForm((f) => ({ ...f, displayName: e.target.value }));
            }}
            disabled={formBusy}
            aria-invalid={fieldErrors.displayName ? true : undefined}
            aria-describedby={
              fieldErrors.displayName
                ? catalogFieldErrorId("displayName")
                : undefined
            }
            className={cn(
              fieldErrors.displayName &&
                "border-rose-500 focus-visible:ring-rose-500"
            )}
          />
          <FieldHelper
            field="displayName"
            messageKey={fieldErrors.displayName}
            language={language}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="reg-type">
            {registerCatalogUiLabel("registerType", language)}
          </Label>
          <select
            ref={typeRef}
            id="reg-type"
            className={cn(
              "flex h-10 w-full rounded-md border bg-slate-950 px-3 text-sm text-white",
              fieldErrors.registerType
                ? "border-rose-500"
                : "border-slate-600"
            )}
            value={form.registerType}
            disabled={formBusy}
            aria-invalid={fieldErrors.registerType ? true : undefined}
            aria-describedby={
              fieldErrors.registerType
                ? catalogFieldErrorId("registerType")
                : undefined
            }
            onChange={(e) => {
              clearFieldError("registerType");
              setForm((f) => ({
                ...f,
                registerType: e.target.value as RegisterType,
              }));
            }}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {registerTypeLabel(t, language)}
              </option>
            ))}
          </select>
          <FieldHelper
            field="registerType"
            messageKey={fieldErrors.registerType}
            language={language}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          disabled={formBusy}
          onClick={() => void submitForm()}
          aria-busy={formBusy || undefined}
        >
          {formBusy ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              <span className="ms-2">
                {registerCatalogUiLabel("saving", language)}
              </span>
            </>
          ) : (
            registerCatalogUiLabel("save", language)
          )}
        </Button>
        <Button variant="ghost" disabled={formBusy} onClick={onCancel}>
          {registerCatalogUiLabel("cancel", language)}
        </Button>
      </div>
    </div>
  );
}
