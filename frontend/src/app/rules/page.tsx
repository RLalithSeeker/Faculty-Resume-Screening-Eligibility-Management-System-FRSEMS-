"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Scale, ChevronRight, Edit3, Trash2 } from "lucide-react";
import Header from "@/components/layout/header";
import api from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import type { EligibilityRule } from "@/lib/types";

export default function RulesPage() {
  const router = useRouter();
  const [rules, setRules] = useState<EligibilityRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRules() {
      try {
        const res = await api.get("/rules");
        setRules(res.data.rules);
      } catch (err) {
        console.error("Failed to fetch rules:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRules();
  }, []);

  const handleToggle = async (rule: EligibilityRule) => {
    try {
      await api.put(`/rules/${rule.id}`, { is_active: !rule.is_active });
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
      );
    } catch (err) {
      console.error("Failed to toggle rule:", err);
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm("Are you sure you want to deactivate and delete this rule?")) return;
    try {
      await api.delete(`/rules/${ruleId}`);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (err) {
      console.error("Failed to delete rule:", err);
    }
  };

  return (
    <div>
      <Header title="Eligibility Rules" description="Create and manage dynamic criteria matching logic">
        <button
          onClick={() => router.push("/rules/new")}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> + New Rule
        </button>
      </Header>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rule Name</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Department</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Priority</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Status</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Version</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Effective From</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-5 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-muted-foreground">
                    No eligibility rules defined. Click '+ New Rule' to create one.
                  </td>
                </tr>
              ) : (
                rules.map((rule, idx) => (
                  <motion.tr
                    key={rule.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className={cn(
                      "border-b border-border hover:bg-muted/20 transition-colors",
                      !rule.is_active && "opacity-60"
                    )}
                  >
                    <td className="px-5 py-3 font-semibold text-foreground">{rule.name}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                      {rule.description || "BE/BTech, ME/MTech, PhD"}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">{rule.department}</td>
                    <td className="px-5 py-3 text-center font-medium">{rule.priority}</td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => handleToggle(rule)}
                        className={cn(
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 outline-none",
                          rule.is_active ? "bg-primary" : "bg-muted-foreground/30"
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                            rule.is_active ? "translate-x-4" : "translate-x-0"
                          )}
                        />
                      </button>
                    </td>
                    <td className="px-5 py-3 text-center font-mono text-xs">{rule.version || "1.0"}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {rule.created_at ? formatDate(rule.created_at) : "Immediate"}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => router.push(`/rules/new?edit=${rule.id}`)}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
