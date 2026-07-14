"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Save, RefreshCw } from "lucide-react";
import Header from "@/components/layout/header";

export default function SettingsPage() {
  const [threshold, setThreshold] = useState(0.01);
  const [maxSize, setMaxSize] = useState(20);
  const [pdfAllowed, setPdfAllowed] = useState(true);
  const [docxAllowed, setDocxAllowed] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      alert("Settings saved successfully!");
    }, 800);
  };

  return (
    <div>
      <Header
        title="Settings"
        description="Configure institutional resume ingestion parameters and parsing safety thresholds"
      />

      <div className="max-w-xl space-y-6">
        {/* Parsing Safety card */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <SettingsIcon className="h-4 w-4 text-primary" />
            Ingestion & Parsing safety
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Scanned Document Character-to-Byte Ratio
              </label>
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="range"
                  min="0.001"
                  max="0.05"
                  step="0.001"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="w-full accent-primary"
                />
                <span className="font-mono text-sm font-semibold w-12 text-right">
                  {threshold.toFixed(3)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Documents with a text-to-file-size ratio lower than this are flagged as scanned and routed to Manual Review.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Maximum File Upload Size (MB)
              </label>
              <input
                type="number"
                value={maxSize}
                onChange={(e) => setMaxSize(parseInt(e.target.value) || 20)}
                className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-2 pt-2">
              <span className="text-xs font-medium text-muted-foreground">
                Allowed File Formats
              </span>
              <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={pdfAllowed}
                  onChange={(e) => setPdfAllowed(e.target.checked)}
                  className="rounded accent-primary"
                />
                PDF Ingestion
              </label>
              <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={docxAllowed}
                  onChange={(e) => setDocxAllowed(e.target.checked)}
                  className="rounded accent-primary"
                />
                Word Document (DOCX) Ingestion
              </label>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
