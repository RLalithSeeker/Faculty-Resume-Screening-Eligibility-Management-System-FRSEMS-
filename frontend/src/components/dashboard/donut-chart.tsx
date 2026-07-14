"use client";

import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { PhDDistribution } from "@/lib/types";

const COLORS = {
  completed: "hsl(142, 71%, 45%)",
  pursuing: "hsl(217, 91%, 60%)",
  not_found: "hsl(215, 16%, 75%)",
};

const LABELS: Record<string, string> = {
  completed: "Completed",
  pursuing: "Pursuing",
  not_found: "Not Found",
};

interface DonutChartProps {
  data: PhDDistribution;
}

export default function DonutChart({ data }: DonutChartProps) {
  const chartData = [
    { name: LABELS.completed, value: data.completed, key: "completed" },
    { name: LABELS.pursuing, value: data.pursuing, key: "pursuing" },
    { name: LABELS.not_found, value: data.not_found, key: "not_found" },
  ].filter((d) => d.value > 0);

  const total = data.completed + data.pursuing + data.not_found;

  if (total === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        No candidate data yet
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="h-[300px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.key}
                fill={COLORS[entry.key as keyof typeof COLORS]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "white",
              border: "1px solid hsl(214, 32%, 91%)",
              borderRadius: "8px",
              fontSize: "13px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value: string) => (
              <span className="text-sm text-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
