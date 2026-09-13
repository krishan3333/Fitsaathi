"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { formatNumber } from "@/lib/utils";
import type { DayStat } from "@/lib/activity-stats";

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-card px-3 py-2 shadow-float ring-1 ring-foreground/8">
      <p className="text-[0.7rem] text-muted-foreground">{label}</p>
      <p className="metric-sm text-[0.95rem]">{formatNumber(payload[0].value)}</p>
    </div>
  );
}

export function ActivityBarChart({ data, dataKey = "steps", height = 170 }: { data: DayStat[]; dataKey?: keyof DayStat; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barCategoryGap={14} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="0" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-muted)", radius: 8 }} />
        <Bar dataKey={dataKey} fill="var(--color-primary)" radius={[6, 6, 2, 2]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  );
}
