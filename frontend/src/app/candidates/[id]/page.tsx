"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Phone, Building, Briefcase, GraduationCap, Calendar,
  CheckCircle, XCircle, AlertTriangle, Edit3, Play, ChevronDown, ChevronUp,
  FileText, History, Scroll, FileSpreadsheet, Scale
} from "lucide-react";
import Header from "@/components/layout/header";
import api from "@/lib/api";
import { cn, formatDate, getStatusLabel, getStatusClass, getLevelLabel } from "@/lib/utils";
import type { CandidateDetail, EvaluationTrace, AuditLogEntry } from "@/lib/types";

type DetailTab = "personal" | "qualifications" | "experience" | "raw" | "eligibility" | "review" | "audit";

export default function CandidateDetailPage() {
  const params = useParams();
  const candidateId = params.id as string;
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [evaluations, setEvaluations] = useState<EvaluationTrace[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<DetailTab>("personal");
  const [previewMode, setPreviewMode] = useState<"pdf" | "raw">("pdf");

  // Edits state
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  // Status Override Form
  const [overrideStatus, setOverrideStatus] = useState("eligible");
  const [overrideComment, setOverrideComment] = useState("");
  const [overriding, setOverriding] = useState(false);

  const fetchCandidate = async () => {
    try {
      const res = await api.get(`/candidates/${candidateId}`);
      setCandidate(res.data);
    } catch (err) {
      console.error("Failed to fetch candidate:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvaluations = async () => {
    try {
      const res = await api.get(`/candidates/${candidateId}/evaluations`);
      setEvaluations(res.data.map((e: { evaluation_trace: EvaluationTrace }) => e.evaluation_trace));
    } catch {
      // No evaluations yet
    }
  };

  const fetchCandidateAudits = async () => {
    try {
      // Fetch audits specifically for this candidate.
      // We can query candidate audit histories
      const res = await api.get(`/candidates/audit-logs/all`);
      const filtered = res.data.filter((l: AuditLogEntry) => l.candidate_id === candidateId);
      setAuditLogs(filtered);
    } catch {
      // Failed to load audits
    }
  };

  useEffect(() => {
    fetchCandidate();
    fetchEvaluations();
    fetchCandidateAudits();
  }, [candidateId]);

  const handleSaveEdit = async (field: string) => {
    if (!comment.trim()) return;
    setSaving(true);
    try {
      await api.patch(`/candidates/${candidateId}`, {
        [field]: editValue,
        reviewer_comment: comment,
      });
      setEditField(null);
      setComment("");
      await fetchCandidate();
      await fetchCandidateAudits();
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleOverrideStatus = async () => {
    if (!overrideComment.trim()) return;
    setOverriding(true);
    try {
      await api.post(`/candidates/${candidateId}/override-status`, {
        eligibility_status: overrideStatus,
        reviewer_comment: overrideComment,
      });
      setOverrideComment("");
      await fetchCandidate();
      await fetchCandidateAudits();
      alert("Eligibility status overridden successfully!");
    } catch (err) {
      console.error("Override failed:", err);
    } finally {
      setOverriding(false);
    }
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      await api.post(`/candidates/${candidateId}/evaluate`);
      await fetchCandidate();
      await fetchEvaluations();
      await fetchCandidateAudits();
    } catch (err) {
      console.error("Evaluation failed:", err);
    } finally {
      setEvaluating(false);
    }
  };

  if (loading || !candidate) {
    return (
      <div>
        <Header title="Candidate Detail" />
        <div className="animate-pulse space-y-6">
          <div className="h-64 rounded-xl bg-muted" />
          <div className="h-48 rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  const resumeFile = candidate.resumes?.[0];

  return (
    <div>
      <Header title={`Candidate: Dr. ${candidate.name}`} description={`Uploaded ${formatDate(candidate.created_at)}`}>
        <div className="flex items-center gap-3">
          <span className={cn("status-chip text-sm", getStatusClass(candidate.eligibility_status))}>
            {getStatusLabel(candidate.eligibility_status)}
          </span>
          <button
            onClick={handleEvaluate}
            disabled={evaluating}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Play className="h-4 w-4" />
            {evaluating ? "Evaluating..." : "Re-evaluate"}
          </button>
        </div>
      </Header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        
        {/* Left Column — Navigation Tabs & Extracted data */}
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex border-b border-border bg-muted/20">
              <button
                onClick={() => setActiveTab("personal")}
                className={cn("flex-1 py-3 text-xs font-semibold uppercase tracking-wider text-center border-r border-border hover:bg-muted/10 transition-colors", activeTab === "personal" ? "bg-primary/10 text-primary border-b-2 border-b-primary" : "text-muted-foreground")}
              >
                Personal
              </button>
              <button
                onClick={() => setActiveTab("qualifications")}
                className={cn("flex-1 py-3 text-xs font-semibold uppercase tracking-wider text-center border-r border-border hover:bg-muted/10 transition-colors", activeTab === "qualifications" ? "bg-primary/10 text-primary border-b-2 border-b-primary" : "text-muted-foreground")}
              >
                Quals
              </button>
              <button
                onClick={() => setActiveTab("experience")}
                className={cn("flex-1 py-3 text-xs font-semibold uppercase tracking-wider text-center border-r border-border hover:bg-muted/10 transition-colors", activeTab === "experience" ? "bg-primary/10 text-primary border-b-2 border-b-primary" : "text-muted-foreground")}
              >
                Exp
              </button>
              <button
                onClick={() => setActiveTab("review")}
                className={cn("flex-1 py-3 text-xs font-semibold uppercase tracking-wider text-center hover:bg-muted/10 transition-colors", activeTab === "review" ? "bg-primary/10 text-primary border-b-2 border-b-primary" : "text-muted-foreground")}
              >
                Review
              </button>
            </div>
            
            <div className="flex border-b border-border bg-muted/20">
              <button
                onClick={() => setActiveTab("eligibility")}
                className={cn("flex-1 py-2 text-xs font-semibold uppercase tracking-wider text-center border-r border-border hover:bg-muted/10 transition-colors", activeTab === "eligibility" ? "bg-primary/10 text-primary border-b-2 border-b-primary" : "text-muted-foreground")}
              >
                Eligibility Result
              </button>
              <button
                onClick={() => setActiveTab("audit")}
                className={cn("flex-1 py-2 text-xs font-semibold uppercase tracking-wider text-center hover:bg-muted/10 transition-colors", activeTab === "audit" ? "bg-primary/10 text-primary border-b-2 border-b-primary" : "text-muted-foreground")}
              >
                Audit Trail
              </button>
            </div>

            <div className="p-5 min-h-[380px]">
              <AnimatePresence mode="wait">
                {activeTab === "personal" && (
                  <motion.div key="personal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <EditableField label="Full Name" value={candidate.name} field="name" editField={editField} editValue={editValue} comment={comment} saving={saving} onEdit={(f, v) => { setEditField(f); setEditValue(v); }} onSave={handleSaveEdit} onCancel={() => setEditField(null)} setEditValue={setEditValue} setComment={setComment} icon={<Briefcase className="h-4 w-4" />} />
                    <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={candidate.email} />
                    <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={candidate.phone} />
                    <InfoRow icon={<Building className="h-4 w-4" />} label="Institution" value={candidate.current_institution} />
                    <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Designation" value={candidate.current_designation} />
                    <InfoRow icon={<Calendar className="h-4 w-4" />} label="Experience" value={candidate.total_experience_years != null ? `${candidate.total_experience_years} years` : null} />
                    <div className="flex items-center gap-3 py-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">PhD Status</span>
                      <span className={cn("status-chip ml-auto", getStatusClass(candidate.phd_status))}>
                        {getStatusLabel(candidate.phd_status)}
                      </span>
                    </div>
                  </motion.div>
                )}

                {activeTab === "qualifications" && (
                  <motion.div key="quals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                    {candidate.qualifications.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-10">No qualifications extracted</p>
                    ) : (
                      candidate.qualifications.map((q) => (
                        <div key={q.id} className="rounded-lg border border-border bg-muted/20 p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              {getLevelLabel(q.level)}
                            </span>
                            {q.is_allied != null && (
                              <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold", q.is_allied ? "bg-primary/15 text-primary" : "bg-success/15 text-success")}>
                                {q.is_allied ? "Allied" : "Core"}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm font-semibold text-foreground">{q.degree_normalized || q.degree_original}</p>
                          {q.field_normalized && (
                            <p className="text-xs text-muted-foreground">Field: {q.field_normalized}</p>
                          )}
                          {q.institution && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">{q.institution}</p>
                          )}
                          {q.year_of_completion && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">Completed in {q.year_of_completion}</p>
                          )}
                        </div>
                      ))
                    )}
                  </motion.div>
                )}

                {activeTab === "experience" && (
                  <motion.div key="exp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                    {candidate.experiences.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-10">No work experience extracted</p>
                    ) : (
                      candidate.experiences.map((e) => (
                        <div key={e.id} className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/10 transition-colors">
                          <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground">{e.designation}</p>
                            <p className="text-xs text-muted-foreground">{e.institution}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-muted-foreground">
                                {e.start_year || "?"} – {e.end_year || "Present"}
                              </span>
                              {e.is_teaching && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">Teaching</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </motion.div>
                )}

                {activeTab === "review" && (
                  <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div className="rounded-lg border border-border p-4 bg-muted/10 space-y-4">
                      <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Manual Review & Comment Override</h4>
                      
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Override Eligibility Status</label>
                        <select
                          value={overrideStatus}
                          onChange={(e) => setOverrideStatus(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                        >
                          <option value="eligible">Eligible</option>
                          <option value="not_eligible">Not Eligible</option>
                          <option value="manual_review">Manual Review Required</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Reviewer Remarks (required)</label>
                        <textarea
                          placeholder="Provide detailed comments for overriding..."
                          value={overrideComment}
                          onChange={(e) => setOverrideComment(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary resize-none"
                          rows={3}
                        />
                      </div>

                      <button
                        onClick={handleOverrideStatus}
                        disabled={overriding || !overrideComment.trim()}
                        className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {overriding ? "Overriding..." : "Apply Override"}
                      </button>
                    </div>
                  </motion.div>
                )}

                {activeTab === "eligibility" && (
                  <motion.div key="eligibility" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                    {evaluations.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-10">Run evaluation to get trace results</p>
                    ) : (
                      evaluations.map((trace, idx) => (
                        <div key={idx} className="rounded-lg border border-border p-3 bg-muted/10">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-foreground">{trace.rule_name}</span>
                            {trace.overall_passed ? (
                              <CheckCircle className="h-4.5 w-4.5 text-success" />
                            ) : (
                              <XCircle className="h-4.5 w-4.5 text-destructive" />
                            )}
                          </div>
                          <div className="space-y-1">
                            {trace.conditions.map((c, cIdx) => (
                              <div key={cIdx} className="flex items-center gap-1.5 text-xs">
                                {c.passed ? (
                                  <span className="text-success">✓</span>
                                ) : (
                                  <span className="text-destructive">✗</span>
                                )}
                                <span className="text-muted-foreground">{c.field}:</span>
                                <span className="font-semibold text-foreground">{c.actual !== null && c.actual !== undefined ? String(c.actual) : "null"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </motion.div>
                )}

                {activeTab === "audit" && (
                  <motion.div key="audit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                    {auditLogs.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-10">No modifications recorded</p>
                    ) : (
                      auditLogs.map((log) => (
                        <div key={log.id} className="rounded-lg border border-border p-3 bg-muted/10 text-xs">
                          <div className="flex justify-between items-center text-muted-foreground">
                            <span className="font-semibold capitalize text-foreground">{log.action.replace("_", " ")}</span>
                            <span>{formatDate(log.created_at)}</span>
                          </div>
                          {log.field_changed && (
                            <p className="mt-1 text-muted-foreground">
                              Field changed: <span className="font-mono text-[11px] text-foreground">{log.field_changed}</span>
                            </p>
                          )}
                          <p className="mt-1 text-foreground font-medium italic">"{log.reviewer_comment}"</p>
                        </div>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right Column — Resume Preview or Raw Text view */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
              <span className="text-sm font-semibold">Resume Viewer</span>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewMode("pdf")}
                  className={cn("px-3 py-1 rounded text-xs font-semibold transition-colors", previewMode === "pdf" ? "bg-primary text-white" : "bg-muted text-muted-foreground")}
                >
                  PDF
                </button>
                <button
                  onClick={() => setPreviewMode("raw")}
                  className={cn("px-3 py-1 rounded text-xs font-semibold transition-colors", previewMode === "raw" ? "bg-primary text-white" : "bg-muted text-muted-foreground")}
                >
                  Raw Text
                </button>
              </div>
            </div>

            {previewMode === "pdf" ? (
              resumeFile ? (
                <iframe
                  src={`http://localhost:8000/uploads/${resumeFile.stored_filename}`}
                  className="h-[680px] w-full"
                  title="Resume PDF Viewer"
                />
              ) : (
                <div className="flex h-[400px] items-center justify-center text-sm text-muted-foreground">
                  No resume PDF uploaded
                </div>
              )
            ) : (
              <div className="p-6 font-mono text-xs text-muted-foreground bg-muted/10 h-[680px] overflow-y-auto whitespace-pre-wrap">
                {resumeFile && (resumeFile as any).raw_text ? (
                  (resumeFile as any).raw_text
                ) : (
                  "Raw text content extraction not cached or empty."
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="ml-auto text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

function EditableField({ label, value, field, editField, editValue, comment, saving, onEdit, onSave, onCancel, setEditValue, setComment, icon }: {
  label: string; value: string; field: string; editField: string | null; editValue: string; comment: string; saving: boolean;
  onEdit: (f: string, v: string) => void; onSave: (f: string) => void; onCancel: () => void; setEditValue: (v: string) => void; setComment: (v: string) => void; icon: React.ReactNode;
}) {
  if (editField === field) {
    return (
      <div className="space-y-2 py-2">
        <input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary" />
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Reviewer comment (required)" className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary resize-none" rows={2} />
        <div className="flex gap-2">
          <button onClick={() => onSave(field)} disabled={saving || !comment.trim()} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-white disabled:opacity-50">Save</button>
          <button onClick={onCancel} className="rounded-lg border px-3 py-1.5 text-xs">Cancel</button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="ml-auto text-sm font-medium">{value}</span>
      <button onClick={() => onEdit(field, value)} className="text-muted-foreground hover:text-primary"><Edit3 className="h-3.5 w-3.5" /></button>
    </div>
  );
}
