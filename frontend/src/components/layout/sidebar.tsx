"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  Users,
  ClipboardCheck,
  AlertTriangle,
  BookOpen,
  GraduationCap,
  History,
  Settings as SettingsIcon,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Upload", icon: Upload, href: "/upload" },
  { label: "Candidates", icon: Users, href: "/candidates" },
  { label: "Evaluations", icon: ClipboardCheck, href: "/evaluations" },
  { label: "Review Queue", icon: AlertTriangle, href: "/review" },
  { label: "Rules", icon: Scale, href: "/rules" },
  { label: "Specializations", icon: BookOpen, href: "/specializations" },
  { label: "Audit Logs", icon: History, href: "/audit" },
  { label: "Settings", icon: SettingsIcon, href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-white">FRSEMS</h1>
          <p className="text-[11px] text-sidebar-foreground/60">Faculty Screening</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("sidebar-link", isActive && "active")}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-6 py-4">
        <p className="text-[11px] text-sidebar-foreground/40">
          Woxsen University
        </p>
        <p className="text-[10px] text-sidebar-foreground/30">v1.0.0</p>
      </div>
    </aside>
  );
}
