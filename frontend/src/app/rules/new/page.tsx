"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, Plus, Trash2, ArrowLeft } from "lucide-react";
import Header from "@/components/layout/header";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { RuleCondition, ConditionOperator, LogicOperator } from "@/lib/types";

const STEPS = ["Rule Details", "Conditions", "Review"];

const FIELD_OPTIONS = [
  { value: "ug_degree", label: "UG Degree" },
  { value: "ug_field", label: "UG Field" },
  { value: "pg_degree", label: "PG Degree" },
  { value: "pg_field", label: "PG Field" },
  { value: "phd_status", label: "PhD Status" },
  { value: "phd_field", label: "PhD Field" },
  { value: "phd_is_allied", label: "PhD Is Allied" },
  { value: "experience_years", label: "Total Experience (Years)" },
  { value: "teaching_experience", label: "Teaching Experience (Years)" },
];

const OPERATOR_OPTIONS: { value: ConditionOperator; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "in", label: "In (list)" },
  { value: "not_in", label: "Not In (list)" },
  { value: "gte", label: "≥ (Greater or Equal)" },
  { value: "lte", label: "≤ (Less or Equal)" },
  { value: "exists", label: "Exists (not empty)" },
  { value: "is_allied", label: "Is Allied" },
];

const POSITION_OPTIONS = [
  { value: "Assistant Professor", label: "Assistant Professor" },
  { value: "Associate Professor", label: "Associate Professor" },
  { value: "Professor", label: "Professor" },
];

interface FormData {
  name: string;
  description: string;
  department: string;
  position: string;
  priority: number;
  is_active: boolean;
  logic_operator: LogicOperator;
  version: string;
  effective_from: string;
  effective_to: string;
  conditions: Omit<RuleCondition, "id" | "rule_id">[];
}

const defaultForm: FormData = {
  name: "",
  description: "",
  department: "",
  position: "Assistant Professor",
  priority: 1,
  is_active: true,
  logic_operator: "AND",
  version: "1.0",
  effective_from: "",
  effective_to: "",
  conditions: [],
};

function RuleWizardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [saving, setSaving] = useState(false);

  // Load existing rule for edit
  useEffect(() => {
    if (editId) {
      async function loadRule() {
        try {
          const res = await api.get(`/rules/${editId}`);
          const rule = res.data;
          setForm({
            name: rule.name,
            description: rule.description || "",
            department: rule.department,
            position: rule.position || "Assistant Professor",
            priority: rule.priority,
            is_active: rule.is_active,
            logic_operator: rule.logic_operator,
            version: rule.version || "1.0",
            effective_from: rule.effective_from ? rule.effective_from.split("T")[0] : "",
            effective_to: rule.effective_to ? rule.effective_to.split("T")[0] : "",
            conditions: rule.conditions.map((c: RuleCondition) => ({
              field: c.field,
              operator: c.operator,
              value: c.value,
              order: c.order,
            })),
          });
        } catch {
          console.error("Failed to load rule");
        }
      }
      loadRule();
    }
  }, [editId]);

  const addCondition = () => {
    setForm((prev) => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        { field: "ug_degree", operator: "equals" as ConditionOperator, value: "", order: prev.conditions.length },
      ],
    }));
  };

  const removeCondition = (index: number) => {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  };

  const updateCondition = (index: number, updates: Partial<Omit<RuleCondition, "id" | "rule_id">>) => {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c, i) => (i === index ? { ...c, ...updates } : c)),
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // Parse condition values
      const conditions = form.conditions.map((c) => {
        let value = c.value;
        if ((c.operator === "in" || c.operator === "not_in") && typeof value === "string") {
          value = (value as string).split(",").map((v) => v.trim());
        }
        if ((c.operator === "gte" || c.operator === "lte") && typeof value === "string") {
          value = parseFloat(value as string);
        }
        if (c.operator === "is_allied" || c.operator === "exists") {
          value = value === "true" || value === true;
        }
        return { ...c, value };
      });

      const payload = {
        ...form,
        effective_from: form.effective_from ? `${form.effective_from}T00:00:00Z` : null,
        effective_to: form.effective_to ? `${form.effective_to}T23:59:59Z` : null,
        conditions,
      };

      if (editId) {
        await api.put(`/rules/${editId}`, payload);
      } else {
        await api.post("/rules", payload);
      }
      router.push("/rules");
    } catch (err) {
      console.error("Failed to save rule:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Header
        title={editId ? "Edit Rule" : "Create / Edit Rule"}
        description="Multi-step wizard to define eligibility criteria"
      >
        <button
          onClick={() => router.push("/rules")}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Rules
        </button>
      </Header>

      {/* Step Indicator */}
      <div className="mb-8 flex items-center gap-4">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              onClick={() => setStep(i)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                i <= step
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </button>
            <span className={cn("text-sm", i <= step ? "font-medium text-foreground" : "text-muted-foreground")}>
              {label}
            </span>
            {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {/* Left Column — Rule Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground border-b pb-2">Rule Details</h3>
              <Field label="Rule Name" required>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Criteria 1" className="input-field" />
              </Field>
              <Field label="Description">
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="BE/BTech, ME/MTech, PhD in CSE or allied" className="input-field resize-none" rows={3} />
              </Field>
              <Field label="Department" required>
                <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="e.g. CSE" className="input-field" />
              </Field>
              <Field label="Position">
                <select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="input-field">
                  {POSITION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
            </div>

            {/* Right Column — Rule Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground border-b pb-2">Rule Settings</h3>
              <Field label="Priority">
                <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 1 })} className="input-field" />
              </Field>
              <Field label="Status">
                <select value={form.is_active ? "active" : "inactive"} onChange={(e) => setForm({ ...form, is_active: e.target.value === "active" })} className="input-field">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
              <Field label="Effective From">
                <input type="date" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} className="input-field" />
              </Field>
              <Field label="Effective To">
                <input type="date" value={form.effective_to} onChange={(e) => setForm({ ...form, effective_to: e.target.value })} className="input-field" />
              </Field>
              <Field label="Logic Operator">
                <select value={form.logic_operator} onChange={(e) => setForm({ ...form, logic_operator: e.target.value as LogicOperator })} className="input-field">
                  <option value="AND">AND (all conditions must pass)</option>
                  <option value="OR">OR (any condition can pass)</option>
                </select>
              </Field>
            </div>

            <div className="md:col-span-2 pt-4">
              <button onClick={() => setStep(1)} disabled={!form.name || !form.department} className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 hover:bg-primary/90 transition-colors">
                Next: Conditions <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="conditions" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            {form.conditions.map((cond, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                <span className="mt-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">{i + 1}</span>
                <div className="flex-1 grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Field</label>
                    <select value={cond.field} onChange={(e) => updateCondition(i, { field: e.target.value })} className="input-field mt-1">
                      {FIELD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Operator</label>
                    <select value={cond.operator} onChange={(e) => updateCondition(i, { operator: e.target.value as ConditionOperator })} className="input-field mt-1">
                      {OPERATOR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Value</label>
                    <input value={typeof cond.value === 'object' ? JSON.stringify(cond.value) : String(cond.value)} onChange={(e) => updateCondition(i, { value: e.target.value })} placeholder="value" className="input-field mt-1" />
                  </div>
                </div>
                <button onClick={() => removeCondition(i)} className="mt-6 text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}

            <button onClick={addCondition} className="flex items-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors w-full justify-center">
              <Plus className="h-4 w-4" /> Add Condition
            </button>

            <div className="flex gap-3 pt-4">
              <button onClick={() => setStep(0)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Back</button>
              <button onClick={() => setStep(2)} disabled={form.conditions.length === 0} className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 hover:bg-primary/90 transition-colors">
                Next: Review <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-2xl space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <h3 className="text-sm font-semibold">Rule Summary</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{form.name}</span></div>
                <div><span className="text-muted-foreground">Department:</span> <span className="font-medium">{form.department}</span></div>
                <div><span className="text-muted-foreground">Position:</span> <span className="font-medium">{form.position}</span></div>
                <div><span className="text-muted-foreground">Priority:</span> <span className="font-medium">{form.priority}</span></div>
                <div><span className="text-muted-foreground">Effective:</span> <span className="font-medium">{form.effective_from || "Immediate"} – {form.effective_to || "No expiry"}</span></div>
                <div><span className="text-muted-foreground">Logic:</span> <span className="font-medium">{form.logic_operator}</span></div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold mb-3">Conditions ({form.conditions.length})</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 text-left text-xs text-muted-foreground">#</th>
                    <th className="py-2 text-left text-xs text-muted-foreground">Field</th>
                    <th className="py-2 text-left text-xs text-muted-foreground">Operator</th>
                    <th className="py-2 text-left text-xs text-muted-foreground">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {form.conditions.map((c, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-2">{i + 1}</td>
                      <td className="py-2 font-mono text-xs">{c.field}</td>
                      <td className="py-2">{c.operator}</td>
                      <td className="py-2 font-mono text-xs">{typeof c.value === 'object' ? JSON.stringify(c.value) : String(c.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Back</button>
              <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-primary/90 transition-colors">
                {saving ? "Saving..." : editId ? "Update Rule" : "Create Rule"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .input-field {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid var(--color-border);
          background: var(--color-card);
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .input-field:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 1px var(--color-ring);
        }
      `}</style>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export default function RuleWizardPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading wizard...</div>}>
      <RuleWizardPageContent />
    </Suspense>
  );
}
