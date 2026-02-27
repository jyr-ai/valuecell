import { CheckCircle, Upload, X } from "lucide-react";
import { type DragEvent, type ChangeEvent, useRef } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface CsvUploadZoneProps {
  label: string;
  description: string;
  fileName: string | null;
  required?: boolean;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  error?: string | null;
}

export function CsvUploadZone({
  label,
  description,
  fileName,
  required = false,
  onFileSelect,
  onClear,
  error,
}: CsvUploadZoneProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const isUploaded = fileName !== null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm text-foreground">{label}</span>
        {required ? (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary text-xs">
            {t("portfolio.upload.required")}
          </span>
        ) : (
          <span className="rounded bg-muted-foreground/10 px-1.5 py-0.5 font-medium text-muted-foreground text-xs">
            {t("portfolio.upload.optional")}
          </span>
        )}
      </div>

      <p className="text-muted-foreground text-xs">{description}</p>

      {isUploaded ? (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <CheckCircle className="size-4 shrink-0 text-primary" />
          <span className="flex-1 truncate font-medium text-sm text-foreground">
            {fileName}
          </span>
          <button
            type="button"
            onClick={onClear}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
            aria-label={t("portfolio.upload.remove")}
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed",
            "px-6 py-8 text-center transition-colors",
            error
              ? "border-destructive/50 bg-destructive/5 hover:bg-destructive/10"
              : "border-border bg-muted/30 hover:border-primary/50 hover:bg-primary/5",
          )}
        >
          <Upload className="size-6 text-muted-foreground" />
          <div>
            <p className="font-medium text-sm text-foreground">
              {t("portfolio.upload.dragDrop")}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("portfolio.upload.csvOnly")}
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-destructive text-xs">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
