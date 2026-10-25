"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Series {
  key: string;
  label: string;
  color: string;
}

/** A thin, styled wrapper around recharts — presentation only, no
 * business logic. One <Line> per series entry, keyed against each data
 * point and a shared "date" field on the X axis. */
export function TrendChart({
  data,
  series,
}: {
  data: Array<Record<string, string | number>>;
  series: Series[];
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={{ stroke: "#e2e8f0" }}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={32} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
          labelStyle={{ fontWeight: 600 }}
        />
        {series.map(({ key, label, color }) => (
          <Line key={key} type="monotone" dataKey={key} name={label} stroke={color} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
