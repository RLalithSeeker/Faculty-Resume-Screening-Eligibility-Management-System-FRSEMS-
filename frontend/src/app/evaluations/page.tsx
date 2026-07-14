"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, ChevronDown, ChevronUp, ClipboardCheck, Check, X } from "lucide-react";
import Header from "@/components/layout/header";
import api from "@/lib/api";
import { cn, getStatusLabel, getStatusClass } from "@/lib/utils";
import type { CandidateListItem, EvaluationTrace } from "@/lib/types";

interface CandidateEvaluation {
  candidate: CandidateListItem;
  traces: EvaluationTrace[];
}

export default function EvaluationsPage() {
  const [data, setData] = useState<CandidateEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const candidatesRes = await api.get("/candidates", { params: { page_size: "50" } });
        const candidates: CandidateListItem[] = candidatesRes.data.candidates;

        const evaluations = await Promise.all(
          candidates
            .filter((c) => c.eligibility_status !== "pending")
            .map(async (c) => {
              try {
                const evalRes = await api.get(`/candidates/${c.id}/evaluations`);
                return {
                  candidate: c,
                  traces: evalRes.data.map((e: { evaluation_trace: EvaluationTrace }) => e.evaluation_trace),
                };
              } catch {
                return { candidate: c, traces: [] };
              }
            })
        );

        setData(evaluations.filter((e) => e.traces.length > 0));
      } catch (err) {
        console.error("Failed to fetch evaluations:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div>
      <Header
        title="Eligibility Evaluation"
        description="Explainable checklist matching candidates against active requirements"
      />

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <ClipboardCheck className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-sm text-muted-foreground">
            No evaluations completed yet. Click 'Re-evaluate' on any candidate details page.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((entry, i) => (
            <CandidateEvalCard key={entry.candidate.id} entry={entry} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function CandidateEvalCard({ entry, index }: { entry: CandidateEvaluation; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors text-left"
      >
        <div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-foreground">{entry.candidate.name}</span>
            <span className={cn("status-chip", getStatusClass(entry.candidate.eligibility_status))}>
              {getStatusLabel(entry.candidate.eligibility_status)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{entry.candidate.current_institution || "No Institution"}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {entry.traces.length} Rule trace(s)
          </span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: "auto" }}
          className="border-t border-border bg-muted/5 p-4 space-y-4"
        >
          {entry.traces.map((trace, traceIdx) => (
            <div key={traceIdx} className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div>
                  <h4 className="text-sm font-bold text-foreground">{trace.rule_name}</h4>
                  <p className="text-xs text-muted-foreground">{trace.department} · Operator: {trace.logic_operator}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Trace status:</span>
                  {trace.overall_passed ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-success/15 text-success font-semibold">PASSED</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/15 text-destructive font-semibold">FAILED</span>
                  )}
                </div>
              </div>

              {/* Criteria Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {trace.conditions.map((cond, condIdx) => (
                  <div key={condIdx} className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/10 p-3">
                    <div className="mt-0.5">
                      {cond.passed ? (
                        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-success text-white">
                          <Check className="h-2.5 w-2.5" />
                        </div>
                      ) : (
                        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white">
                          <X className="h-2.5 w-2.5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="font-semibold text-foreground uppercase tracking-wide text-[10px]">{cond.field.replace("_", " ")}</p>
                      <p className="text-muted-foreground mt-0.5">Expected: <span className="font-mono">{JSON.stringify(cond.expected)}</span></p>
                      <p className="text-muted-foreground">Actual: <span className={cn("font-semibold font-mono", cond.passed ? "text-success" : "text-destructive")}>{cond.actual !== null && cond.actual !== undefined ? String(cond.actual) : "null"}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
