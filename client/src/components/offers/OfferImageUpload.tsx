import { useCallback, useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { toastTrpcError } from "@/lib/trpcErrors";
import {
  readFileAsBase64,
  resolveOfferImageUrl,
  validateOfferImageFile,
  type OfferImageSource,
} from "@/lib/offers/offerImage";

type OfferImageUploadProps = {
  offerId?: number;
  value: OfferImageSource;
  onChange: (next: OfferImageSource) => void;
  onPendingFile?: (file: File | null) => void;
  disabled?: boolean;
};

export function OfferImageUpload({ offerId, value, onChange, onPendingFile, disabled }: OfferImageUploadProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const uploadMutation = trpc.offer.uploadImage.useMutation();
  const deleteMutation = trpc.offer.deleteImage.useMutation();

  const previewUrl = localPreview ?? resolveOfferImageUrl(value);
  const isBusy = uploadMutation.isPending || deleteMutation.isPending || disabled;

  useEffect(() => {
    return () => {
      if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const applyFile = useCallback(
    async (file: File) => {
      const errorKey = validateOfferImageFile(file);
      if (errorKey) {
        toast.error(t(`dashboard.${errorKey}`));
        return;
      }

      const blobUrl = URL.createObjectURL(file);
      setLocalPreview(blobUrl);

      if (!offerId) {
        onPendingFile?.(file);
        return;
      }

      try {
        const imageData = await readFileAsBase64(file);
        const result = await uploadMutation.mutateAsync({
          offerId,
          imageData,
          fileName: file.name,
          contentType: file.type,
        });
        onChange({ imageUrl: result.url, image: result.image });
        setLocalPreview(null);
        toast.success(t("dashboard.uploadSuccess"));
      } catch (err) {
        setLocalPreview(null);
        toastTrpcError(err, t);
      }
    },
    [offerId, onChange, t, uploadMutation]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void applyFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void applyFile(file);
  };

  const handleRemove = async () => {
    if (offerId && (value.imageUrl || value.image)) {
      try {
        await deleteMutation.mutateAsync({ offerId });
        onChange({ imageUrl: null, image: null });
        setLocalPreview(null);
        toast.success(t("dashboard.deleteImageSuccess"));
      } catch (err) {
        toastTrpcError(err, t);
      }
      return;
    }
    onChange({ imageUrl: null, image: null });
    setLocalPreview(null);
    onPendingFile?.(null);
  };

  return (
    <div>
      <Label className="text-foreground">{t("dashboard.uploadOfferImage")}</Label>
      <div
        className={`mt-2 border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
        } ${isBusy ? "opacity-70 pointer-events-none" : "cursor-pointer"}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
      >
        {previewUrl ? (
          <div className="relative inline-block">
            <img
              src={previewUrl}
              alt=""
              className="w-full max-w-xs h-40 rounded-lg object-cover mx-auto"
            />
            {!isBusy && (
              <div className="absolute inset-0 max-w-xs mx-auto bg-black/0 hover:bg-black/40 rounded-lg transition-colors flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <Upload className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-red-500/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleRemove();
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 flex flex-col items-center gap-2">
            <ImageIcon className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("dashboard.clickToUpload")}</p>
            <p className="text-xs text-muted-foreground">{t("dashboard.offerImageHint")}</p>
          </div>
        )}
        {isBusy && (
          <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            {uploadMutation.isPending ? t("dashboard.uploading") : t("dashboard.deleting")}
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={ENTITY_IMAGE_ACCEPT}
        className="hidden"
        onChange={handleFileInput}
      />
      {!offerId && localPreview && (
        <p className="text-xs text-muted-foreground mt-2">{t("dashboard.offerImagePendingCreate")}</p>
      )}
    </div>
  );
}

const ENTITY_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

/** Pending file held until offer is created (create flow). */
export type PendingOfferImage = File | null;

export async function uploadPendingOfferImage(
  offerId: number,
  file: File,
  upload: (input: {
    offerId: number;
    imageData: string;
    fileName: string;
    contentType: string;
  }) => Promise<{ url: string; image: OfferImageSource["image"] }>
): Promise<OfferImageSource> {
  const imageData = await readFileAsBase64(file);
  const result = await upload({
    offerId,
    imageData,
    fileName: file.name,
    contentType: file.type,
  });
  return { imageUrl: result.url, image: result.image };
}
