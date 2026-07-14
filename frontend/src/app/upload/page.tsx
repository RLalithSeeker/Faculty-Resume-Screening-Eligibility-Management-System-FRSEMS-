"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Clock,
  Trash2,
} from "lucide-react";
import Header from "@/components/layout/header";
import api from "@/lib/api";
import { cn, formatFileSize, getStatusLabel } from "@/lib/utils";
import type { Resume } from "@/lib/types";

interface FileEntry {
  file: File;
  status: "queued" | "uploading" | "extracting_text" | "extracting_data" | "completed" | "failed";
  progress: number;
  error?: string;
  resume?: Resume;
}

const statusIcons: Record<string, React.ReactNode> = {
  queued: <Clock className="h-4 w-4 text-muted-foreground" />,
  uploading: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
  extracting_text: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
  extracting_data: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
  completed: <CheckCircle className="h-4 w-4 text-success" />,
  failed: <XCircle className="h-4 w-4 text-destructive" />,
};

export default function UploadPage() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [batchName, setBatchName] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);

  const handleFiles = useCallback((selectedFiles: FileList | File[]) => {
    const newFiles: FileEntry[] = Array.from(selectedFiles)
      .filter((f) => {
        const ext = f.name.toLowerCase();
        return ext.endsWith(".pdf") || ext.endsWith(".docx");
      })
      .map((file) => ({ file, status: "queued" as const, progress: 0 }));

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setDuplicateCount(0);

    // Set initial uploading state with some mock progress ticking
    setFiles((prev) =>
      prev.map((f) => (f.status === "queued" ? { ...f, status: "uploading", progress: 20 } : f))
    );

    const formData = new FormData();
    if (batchName.trim()) {
      formData.append("batch_name", batchName);
    }
    
    files.forEach((entry) => {
      if (entry.status === "uploading" || entry.status === "queued") {
        formData.append("files", entry.file);
      }
    });

    try {
      setFiles((prev) =>
        prev.map((f) =>
          ["uploading", "queued"].includes(f.status) ? { ...f, status: "extracting_text", progress: 60 } : f
        )
      );

      const res = await api.post("/resumes/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { resumes, duplicates } = res.data;
      setDuplicateCount(duplicates.length);

      setFiles((prev) =>
        prev.map((entry) => {
          const matchedResume = resumes.find(
            (r: Resume) =>
              r.original_filename === entry.file.name.replace(/[^\w\s\-.]/g, "").replace(/\s+/g, "_").slice(0, 200)
          );

          if (matchedResume) {
            return {
              ...entry,
              status: matchedResume.status === "failed" ? "failed" : "completed",
              progress: matchedResume.status === "failed" ? 0 : 100,
              resume: matchedResume,
              error: matchedResume.error_message || undefined,
            };
          }

          const isDupe = duplicates.some(
            (d: { filename: string }) => d.filename === entry.file.name
          );
          if (isDupe) {
            return { ...entry, status: "completed", progress: 100, error: "Duplicate file" };
          }

          return { ...entry, status: "completed", progress: 100 };
        })
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setFiles((prev) =>
        prev.map((f) =>
          f.status !== "completed" ? { ...f, status: "failed", progress: 0, error: message } : f
        )
      );
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFiles([]);
    setBatchName("");
    setDuplicateCount(0);
  };

  return (
    <div>
      <Header
        title="Upload Resumes"
        description="Ingest PDFs or Word Documents under a batch run"
      >
        {files.length > 0 && (
          <div className="flex gap-3">
            <button
              onClick={clearAll}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading || files.every((f) => f.status !== "queued")}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Start Upload
            </button>
          </div>
        )}
      </Header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Dropzone & Batch Configuration */}
        <div className="xl:col-span-2 space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              "flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200",
              isDragOver
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-border bg-card hover:border-primary/40"
            )}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.multiple = true;
              input.accept = ".pdf,.docx";
              input.onchange = (e) => {
                const target = e.target as HTMLInputElement;
                if (target.files) handleFiles(target.files);
              };
              input.click();
            }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">
              Drag & Drop your files here
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Supported formats: PDF, DOC, DOCX · Max file size: 10MB
            </p>
          </div>

          {/* Batch Configuration */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Batch Configuration
            </label>
            <div>
              <label className="text-xs font-medium text-foreground">Batch Name</label>
              <input
                type="text"
                placeholder="e.g. Batch - May 18, 2024 10:30 AM"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Upload Progress & Details Table */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Upload Progress</h3>

          {duplicateCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
              <AlertTriangle className="h-3.5 w-3.5" />
              {duplicateCount} duplicate(s) skipped
            </div>
          )}

          <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
            {files.length === 0 ? (
              <p className="text-xs text-center text-muted-foreground py-10">No files selected</p>
            ) : (
              files.map((entry, idx) => (
                <div key={idx} className="space-y-1.5 border-b border-border last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground">{entry.file.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatFileSize(entry.file.size)}</p>
                    </div>
                    <button
                      onClick={() => removeFile(idx)}
                      disabled={isUploading}
                      className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${entry.progress}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] font-semibold min-w-[28px] text-right">
                      {entry.progress}%
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px]">
                    {statusIcons[entry.status]}
                    <span className={cn(
                      "font-medium capitalize",
                      entry.status === "completed" && "text-success",
                      entry.status === "failed" && "text-destructive"
                    )}>
                      {getStatusLabel(entry.status)}
                    </span>
                    {entry.error && (
                      <span className="text-destructive truncate max-w-[120px]">— {entry.error}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
