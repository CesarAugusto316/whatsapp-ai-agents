"use client";
import { TimeWindow } from "@/collections/appointments/check-availability";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const formatHour = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const toChartData = (slots: any[]) =>
  slots.map((s) => ({
    name: formatHour(s.from),
    occupied: s.totalPeople,
  }));

interface Props {
  slotsByTimeRange: TimeWindow[];
  maxCapacityPerHour: number;
}

export default function BarCharts({
  slotsByTimeRange,
  maxCapacityPerHour,
}: Props) {
  //
  const data = toChartData(slotsByTimeRange);
  return (
    <BarChart
      width={700}
      height={350}
      data={data}
      margin={{ top: 20, bottom: 20 }}
    >
      <CartesianGrid strokeDasharray="3 3" />

      <XAxis dataKey="name" />

      <YAxis
        domain={[0, maxCapacityPerHour]}
        label={{ value: "Personas", angle: -90, position: "insideLeft" }}
      />

      <Tooltip />

      <Bar dataKey="occupied" fill="#10b981" background={{ fill: "#1f2937" }} />
    </BarChart>
  );
}
