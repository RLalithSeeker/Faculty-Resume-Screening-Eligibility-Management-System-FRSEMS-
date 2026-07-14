"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, Eye, ArrowRight } from "lucide-react";
import Header from "@/components/layout/header";
import api from "@/lib/api";
import { cn, formatDate, getStatusLabel, getStatusClass } from "@/lib/utils";
import type { CandidateListItem } from "@/lib/types";

export default function ReviewQueuePage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReviewQueue() {
      try {
        const res = await api.get("/candidates/review-queue", { params: { page_size: "50" } });
        setCandidates(res.data.candidates);
      } catch (err) {
        console.error("Failed to fetch review queue:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReviewQueue();
  }, []);

  return (
    <div>
      <Header
        title="Manual Review Queue"
        description="Verify candidates flagged for scanned documents, missing values, or specialization overrides"
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">S.No</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Candidate Name</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reason</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ph.D. Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Uploaded On</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Review Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No candidates currently in manual review queue
                  </td>
                </tr>
              ) : (
                candidates.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{c.name}</td>
                    <td className="px-4 py-3 text-xs text-warning font-medium">
                      {c.review_reason || "Verification required"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("status-chip", getStatusClass(c.phd_status))}>
                        {getStatusLabel(c.phd_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(c.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-warning/15 text-warning">
                        Pending
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => router.push(`/candidates/${c.id}`)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                      >
                        <Eye className="h-3.5 w-3.5" /> Review
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
