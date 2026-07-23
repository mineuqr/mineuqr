import {
  multiCheckAllocationUiLabel,
  type MultiCheckAllocationDetailViewModel,
  type MultiCheckAllocationLang,
} from "@/lib/multi-check-allocation-presentation";

type Props = {
  row: MultiCheckAllocationDetailViewModel;
  language: MultiCheckAllocationLang;
};

export function AllocationMetadataView({ row, language }: Props) {
  return (
    <p
      className="text-[10px] text-slate-600"
      title={row.projection.projectionRevision}
    >
      {multiCheckAllocationUiLabel("metadataTitle", language)}:{" "}
      {row.projection.projectionId} · v
      {row.projection.projectionSchemaVersion}
      {" · "}
      {multiCheckAllocationUiLabel("apiContract", language)} v
      {row.projection.apiContractVersion}
    </p>
  );
}
