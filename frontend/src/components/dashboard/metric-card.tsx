"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  colorClass?: string;
  delay?: number;
}

export default function MetricCard({ title, value, icon, colorClass = "text-foreground", delay = 0 }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className="metric-card"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={cn("mt-2 text-3xl font-semibold tracking-tight", colorClass)}>
            {value.toLocaleString()}
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
