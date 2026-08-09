"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";

export type WeightPoint = { date: string; weight: number | null };

export function ProgressChart({ points, unitLabel }: { points: WeightPoint[]; unitLabel: string }) {
  const data = points
    .filter((p): p is { date: string; weight: number } => p.weight !== null)
    .map((p) => ({ ...p, label: format(parseISO(p.date), "MMM d") }));

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No weight entries yet.</p>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={40}
            unit={unitLabel}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
            }}
            formatter={(value) => [`${value} ${unitLabel}`, "Weight"]}
          />
          <Line type="monotone" dataKey="weight" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
