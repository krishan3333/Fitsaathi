"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/utils";

function ChartTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { value: number }[]; label?: string; unit: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-card px-3 py-2 text-xs shadow-float ring-1 ring-foreground/8">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">{formatNumber(payload[0].value)} {unit}</p>
    </div>
  );
}

export function RankedBarChart({ data, dataKey, nameKey, unit, height = 220 }: { data: Record<string, unknown>[]; dataKey: string; nameKey: string; unit: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid horizontal={false} stroke="var(--color-border)" />
        <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} />
        <YAxis dataKey={nameKey} type="category" tickLine={false} axisLine={false} width={90} tick={{ fill: "var(--color-foreground)", fontSize: 12 }} />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: "var(--color-muted)" }} />
        <Bar dataKey={dataKey} fill="var(--color-primary)" radius={[0, 4, 4, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}
