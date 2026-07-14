"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, BookOpen, Tag, X, Check, Edit3 } from "lucide-react";
import Header from "@/components/layout/header";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Specialization } from "@/lib/types";

export default function SpecializationsPage() {
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [newIsAllied, setNewIsAllied] = useState(false);
  const [newAliases, setNewAliases] = useState("");
  const [saving, setSaving] = useState(false);
  const [aliasInput, setAliasInput] = useState<Record<string, string>>({});

  const fetchSpecializations = async () => {
    try {
      const res = await api.get("/specializations");
      setSpecializations(res.data.specializations);
    } catch (err) {
      console.error("Failed to fetch specializations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpecializations();
  }, []);

  const handleCreate = async () => {
    if (!newName || !newDepartment) return;
    setSaving(true);
    try {
      const aliases = newAliases.split(",").map((a) => a.trim()).filter(Boolean);
      await api.post("/specializations", {
        name: newName,
        department: newDepartment,
        is_allied: newIsAllied,
        aliases,
      });
      setNewName("");
      setNewDepartment("");
      setNewIsAllied(false);
      setNewAliases("");
      setShowCreate(false);
      await fetchSpecializations();
    } catch (err) {
      console.error("Failed to create specialization:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAllied = async (spec: Specialization) => {
    try {
      await api.put(`/specializations/${spec.id}`, { is_allied: !spec.is_allied });
      setSpecializations((prev) =>
        prev.map((s) => (s.id === spec.id ? { ...s, is_allied: !s.is_allied } : s))
      );
    } catch (err) {
      console.error("Failed to toggle allied flag:", err);
    }
  };

  const handleAddAlias = async (spec: Specialization) => {
    const alias = aliasInput[spec.id]?.trim();
    if (!alias) return;
    try {
      const currentAliases = spec.aliases.map((a) => a.alias);
      await api.put(`/specializations/${spec.id}`, {
        aliases: [...currentAliases, alias],
      });
      setAliasInput((prev) => ({ ...prev, [spec.id]: "" }));
      await fetchSpecializations();
    } catch (err) {
      console.error("Failed to add alias:", err);
    }
  };

  const handleRemoveAlias = async (spec: Specialization, aliasToRemove: string) => {
    try {
      const remaining = spec.aliases.filter((a) => a.alias !== aliasToRemove).map((a) => a.alias);
      await api.put(`/specializations/${spec.id}`, { aliases: remaining });
      await fetchSpecializations();
    } catch (err) {
      console.error("Failed to remove alias:", err);
    }
  };

  const handleDelete = async (spec: Specialization) => {
    if (!confirm(`Delete specialization "${spec.name}" and all its aliases?`)) return;
    try {
      await api.delete(`/specializations/${spec.id}`);
      await fetchSpecializations();
    } catch (err) {
      console.error("Failed to delete specialization:", err);
    }
  };

  return (
    <div>
      <Header title="Specializations" description="Manage specializations and search aliases to align mappings">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> + Add Specialization
        </button>
      </Header>

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Specialization Name</label>
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Computer Science and Engineering" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-sm font-medium">Department</label>
                  <input value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)} placeholder="e.g., CSE" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Aliases (comma-separated)</label>
                <input value={newAliases} onChange={(e) => setNewAliases(e.target.value)} placeholder="CSE, CS, Computer Science" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary" />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input type="checkbox" checked={newIsAllied} onChange={(e) => setNewIsAllied(e.target.checked)} className="rounded accent-primary" />
                  Mark as Allied Field
                </label>
                <div className="flex gap-2">
                  <button onClick={() => setShowCreate(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors">Cancel</button>
                  <button onClick={handleCreate} disabled={saving || !newName || !newDepartment} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-primary/90 transition-colors">
                    {saving ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Specializations Table aligned with Screen 9 mockup */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Specialization</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aliases</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Allied</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Status</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-5 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : specializations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                    No specializations defined. Click '+ Add Specialization' to create one.
                  </td>
                </tr>
              ) : (
                specializations.map((spec, idx) => (
                  <tr key={spec.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-foreground">{spec.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{spec.department}</p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-1.5 max-w-lg">
                        {spec.aliases.map((alias) => (
                          <span key={alias.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs">
                            {alias.alias}
                            <button onClick={() => handleRemoveAlias(spec, alias.alias)} className="text-muted-foreground hover:text-destructive">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        <div className="inline-flex items-center gap-1">
                          <input
                            value={aliasInput[spec.id] || ""}
                            onChange={(e) => setAliasInput((prev) => ({ ...prev, [spec.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === "Enter" && handleAddAlias(spec)}
                            placeholder="+ Add alias"
                            className="w-20 rounded-full border border-dashed border-border bg-transparent px-2.5 py-0.5 text-xs outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => handleToggleAllied(spec)}
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-semibold select-none",
                          spec.is_allied ? "bg-primary/10 text-primary" : "bg-success/10 text-success"
                        )}
                      >
                        {spec.is_allied ? "Yes" : "No"}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success/15 text-success">
                        Active
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleDelete(spec)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
