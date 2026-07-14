"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronLeft, ChevronRight, Download, ArrowUpDown, Plus, X, AlertTriangle } from "lucide-react";
import Header from "@/components/layout/header";
import api from "@/lib/api";
import { cn, formatDate, getStatusLabel, getStatusClass } from "@/lib/utils";
import type { CandidateListItem } from "@/lib/types";

export default function CandidatesPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [phdFilter, setPhdFilter] = useState<string>("");
  const [matchedFilter, setMatchedFilter] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Add Candidate Form State
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newDesignation, setNewDesignation] = useState("");
  const [newInstitution, setNewInstitution] = useState("");
  const [newExp, setNewExp] = useState(0);
  const [newPhd, setNewPhd] = useState("not_found");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const fetchCandidates = async () => {
    try {
      const params: Record<string, string> = { page_size: "100" };
      if (statusFilter) params.status = statusFilter;
      if (phdFilter) params.phd_status = phdFilter;

      const res = await api.get("/candidates", { params });
      setCandidates(res.data.candidates);
    } catch (err) {
      console.error("Failed to fetch candidates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [statusFilter, phdFilter]);

  const handleAddCandidate = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    setAddError("");
    try {
      await api.post("/candidates", {
        name: newName,
        email: newEmail || null,
        phone: newPhone || null,
        current_designation: newDesignation || null,
        current_institution: newInstitution || null,
        total_experience_years: parseFloat(String(newExp)) || 0,
        phd_status: newPhd,
        eligibility_status: "pending"
      });
      setShowAddModal(false);
      // Reset form
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewDesignation("");
      setNewInstitution("");
      setNewExp(0);
      setNewPhd("not_found");
      await fetchCandidates();
    } catch (err: any) {
      setAddError(err.response?.data?.detail || "Failed to create candidate");
    } finally {
      setAdding(false);
    }
  };

  const columns = useMemo<ColumnDef<CandidateListItem>[]>(
    () => [
      {
        id: "sno",
        header: "S.No",
        cell: (info) => info.row.index + 1,
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <button className="flex items-center gap-1 font-semibold" onClick={() => column.toggleSorting()}>
            Candidate Name <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-semibold text-foreground">{row.getValue("name")}</span>
        ),
      },
      {
        accessorKey: "email",
        header: "Email ID",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">{row.getValue("email") || "—"}</span>
        ),
      },
      {
        accessorKey: "phone",
        header: "Phone Number",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">{row.getValue("phone") || "—"}</span>
        ),
      },
      {
        accessorKey: "current_designation",
        header: "Designation",
        cell: ({ row }) => (
          <span className="text-sm">{row.getValue("current_designation") || "—"}</span>
        ),
      },
      {
        accessorKey: "phd_status",
        header: "PhD",
        cell: ({ row }) => {
          const status = row.getValue("phd_status") as string;
          return (
            <span className={cn("status-chip", getStatusClass(status))}>
              {getStatusLabel(status)}
            </span>
          );
        },
      },
      {
        accessorKey: "eligibility_status",
        header: "Eligibility",
        cell: ({ row }) => {
          const status = row.getValue("eligibility_status") as string;
          return (
            <span className={cn("status-chip", getStatusClass(status))}>
              {getStatusLabel(status)}
            </span>
          );
        },
      },
      {
        accessorKey: "total_experience_years",
        header: ({ column }) => (
          <button className="flex items-center gap-1 font-semibold" onClick={() => column.toggleSorting()}>
            Exp (yrs) <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => {
          const val = row.getValue("total_experience_years") as number | null;
          return <span>{val != null ? val.toFixed(1) : "—"}</span>;
        },
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <button className="flex items-center gap-1 font-semibold" onClick={() => column.toggleSorting()}>
            Uploaded On <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(row.getValue("created_at"))}
          </span>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: candidates,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      const res = await api.get(`/export/${format}`, {
        responseType: "blob",
        params: statusFilter ? { status: statusFilter } : {},
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `candidates.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const handleClearFilters = () => {
    setGlobalFilter("");
    setStatusFilter("");
    setPhdFilter("");
    setMatchedFilter("");
  };

  return (
    <div>
      <Header title="Candidates" description="Manage and review all screened faculty candidates">
        <div className="flex gap-2">
          <button
            onClick={() => handleExport("csv")}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <Download className="h-4 w-4" /> CSV
          </button>
          <button
            onClick={() => handleExport("xlsx")}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <Download className="h-4 w-4" /> Excel
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Candidate
          </button>
        </div>
      </Header>

      {/* Advanced Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
        >
          <option value="">Eligibility Status</option>
          <option value="eligible">Eligible</option>
          <option value="not_eligible">Not Eligible</option>
          <option value="manual_review">Manual Review</option>
          <option value="pending">Pending</option>
        </select>

        <select
          value={matchedFilter}
          onChange={(e) => setMatchedFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
        >
          <option value="">Matched Criteria</option>
          <option value="Criteria 1">Criteria 1</option>
          <option value="Criteria 2">Criteria 2</option>
          <option value="Criteria 3">Criteria 3</option>
        </select>

        <select
          value={phdFilter}
          onChange={(e) => setPhdFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
        >
          <option value="">PhD Status</option>
          <option value="completed">Completed</option>
          <option value="pursuing">Pursuing</option>
          <option value="not_found">Not Found</option>
        </select>

        <button
          onClick={handleClearFilters}
          className="text-xs font-semibold text-primary hover:underline"
        >
          Clear Filters
        </button>
      </div>

      {/* Table grid */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-border bg-muted/50">
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="sticky top-0 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[...Array(9)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No candidates found. Upload resumes to get started.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, i) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.01 }}
                    onClick={() => router.push(`/candidates/${row.original.id}`)}
                    className="cursor-pointer border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Showing {table.getRowModel().rows.length} of {candidates.length} candidates
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded-lg border border-border p-2 text-sm disabled:opacity-30 hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded-lg border border-border p-2 text-sm disabled:opacity-30 hover:bg-muted transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Manual Add Candidate Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">Add New Candidate</h3>
                <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {addError && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {addError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Dr. Ananya Rao" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Email ID</label>
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="ananya@example.com" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Phone Number</label>
                  <input type="text" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="98XXXXXXXX" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Experience (Years)</label>
                  <input type="number" value={newExp} onChange={(e) => setNewExp(parseFloat(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Current Designation</label>
                  <input type="text" value={newDesignation} onChange={(e) => setNewDesignation(e.target.value)} placeholder="e.g. Assistant Professor" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Current Institution</label>
                  <input type="text" value={newInstitution} onChange={(e) => setNewInstitution(e.target.value)} placeholder="e.g. ABC College" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">PhD Status</label>
                <select value={newPhd} onChange={(e) => setNewPhd(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary">
                  <option value="completed">Completed</option>
                  <option value="pursuing">Pursuing</option>
                  <option value="not_found">Not Found</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setShowAddModal(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
                <button onClick={handleAddCandidate} disabled={adding || !newName} className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {adding ? "Adding..." : "Add Candidate"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
