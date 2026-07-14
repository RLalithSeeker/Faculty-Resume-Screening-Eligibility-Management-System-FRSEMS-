"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { History, Search } from "lucide-react";
import Header from "@/components/layout/header";
import api from "@/lib/api";
import { formatDate, formatDateTime, getStatusLabel } from "@/lib/utils";
import type { AuditLogEntry } from "@/lib/types";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchLogs = async () => {
    try {
      // Fetch audit logs. In the backend, we can query candidates audit logs or expose a dedicated endpoint.
      // For now, let's query candidates and aggregate, or just fetch via a general endpoint.
      // Wait, let's add a GET /api/candidates/audit-logs endpoint to get global logs, or mock it from candidate histories.
      // Let's implement /api/candidates/audit-logs on the backend to be safe. We will write it in candidates router next.
      const res = await api.get("/candidates/audit-logs/all");
      setLogs(res.data);
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) =>
    (log.reviewer_comment || "").toLowerCase().includes(search.toLowerCase()) ||
    (log.field_changed || "").toLowerCase().includes(search.toLowerCase()) ||
    (log.action || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header
        title="Audit Logs"
        description="System-wide trail of human overrides, edits, and evaluations"
      />

      <div className="mb-5 relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search audit trail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Field Changed</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Old Value</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">New Value</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reviewer Comment</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No audit logs recorded yet
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, i) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-3 font-medium capitalize">
                      {log.action.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {log.field_changed || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[120px] truncate">
                      {log.old_value || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium max-w-[120px] truncate">
                      {log.new_value || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground italic">
                      {log.reviewer_comment}
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
