import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { stringifyAuditJson } from "./auditEventDisplay";

type AuditEventJsonFieldProps = {
  label: string;
  value: unknown;
  defaultOpen?: boolean;
};

export function AuditEventJsonField({
  label,
  value,
  defaultOpen = false,
}: AuditEventJsonFieldProps) {
  const { t } = useLanguage();
  const text = stringifyAuditJson(value);
  const isEmpty = value == null;

  if (isEmpty) {
    return (
      <div className="rounded-md border border-cyan-500/15 bg-slate-900/40 px-2.5 py-2">
        <p className="text-[11px] font-medium text-slate-400">{label}</p>
        <p className="mt-1 text-xs text-slate-500">—</p>
      </div>
    );
  }

  return (
    <Collapsible defaultOpen={defaultOpen} className="rounded-md border border-cyan-500/15 bg-slate-900/40">
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center justify-between gap-2 px-2.5 py-2 text-start",
          "text-[11px] font-medium text-slate-300 hover:bg-slate-800/40"
        )}
      >
        <span>{label}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre
          dir="ltr"
          className="max-h-48 overflow-auto border-t border-cyan-500/10 px-2.5 py-2 text-[10px] leading-relaxed text-slate-300"
        >
          {text}
        </pre>
        <p className="border-t border-cyan-500/10 px-2.5 py-1 text-[10px] text-slate-500">
          {t("admin.security.timeline.jsonCollapsedHint")}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
