/**
 * FRSEMS — Utility functions.
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind class merge utility (shadcn pattern) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a date string to readable format */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Format a date string with time */
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format file size to human readable */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/** Status label mapping */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pending",
    eligible: "Eligible",
    not_eligible: "Not Eligible",
    manual_review: "Manual Review",
    completed: "Completed",
    pursuing: "Pursuing",
    not_found: "Not Found",
    uploading: "Uploading",
    extracting_text: "Extracting Text",
    extracting_data: "Extracting Data",
    failed: "Failed",
  };
  return labels[status] || status;
}

/** Status CSS class mapping */
export function getStatusClass(status: string): string {
  const classes: Record<string, string> = {
    eligible: "status-eligible",
    not_eligible: "status-not-eligible",
    manual_review: "status-manual-review",
    pending: "status-pending",
    completed: "status-completed",
    pursuing: "status-pursuing",
    not_found: "status-pending",
  };
  return classes[status] || "status-pending";
}

/** Qualification level label */
export function getLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    ug: "Undergraduate",
    pg: "Postgraduate",
    phd: "Ph.D.",
  };
  return labels[level] || level;
}
