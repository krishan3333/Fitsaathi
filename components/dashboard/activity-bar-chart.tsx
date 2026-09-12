"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { formatNumber } from "@/lib/utils";
import type { DayStat } from "@/lib/activity-stats";

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">{formatNumber(payload[0].value)} steps</p>
    </div>
  );
}

export function ActivityBarChart({ data, dataKey = "steps", height = 160 }: { data: DayStat[]; dataKey?: keyof DayStat; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barCategoryGap={12}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="0" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-muted)" }} />
        <Bar dataKey={dataKey} fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
