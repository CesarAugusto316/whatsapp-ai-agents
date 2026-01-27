"use client";
import { TimeWindow } from "@/collections/appointments/check-availability";
import {
  Bar,
  BarChart,
  BarShapeProps,
  CartesianGrid,
  Rectangle,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// #region Types
export type SlotRange = {
  from: string;
  to: string;
  totalPeople: number;
  slots: Array<{
    id: string;
    startDateTime: string;
    endDateTime: string;
    numberOfPeople: number;
    status: string;
    createdAt: string;
    customer: string;
  }>;
};

export type TimeLineProps = {
  slotsByTimeRange: TimeWindow[];
  maxCapacity?: number;
  defaultIndex?: number;
};

type TimelineDataType = {
  name: string;
  firstCycle: [number, number];
  secondCycle: [number, number];
  outcome: "success" | "error" | "pending";
};

// #endregion

// #region Helper functions
const getBarColor = (outcome: TimelineDataType["outcome"]) => {
  switch (outcome) {
    case "success":
      return "#10b981"; // verde
    case "error":
      return "#ef4444"; // rojo
    default:
      return "#9ca3af"; // gris
  }
};

const formatHourLabel = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const transformSlotData = (
  slots: TimeWindow[],
  maxCapacity: number,
): TimelineDataType[] => {
  return slots.map((slot) => {
    const name = `${formatHourLabel(slot.from)}-${formatHourLabel(slot.to)}`;
    const firstCycle: [number, number] = [0, slot.totalPeople];
    const secondCycle: [number, number] = [slot.totalPeople, maxCapacity];

    let outcome: "success" | "error" | "pending";
    if (slot.totalPeople === 0) {
      outcome = "pending";
    } else if (slot.totalPeople >= maxCapacity) {
      outcome = "error";
    } else {
      outcome = "success";
    }

    return { name, firstCycle, secondCycle, outcome };
  });
};

const CustomFillRectangle = (props: BarShapeProps) => {
  const { outcome } = props as BarShapeProps & {
    outcome: TimelineDataType["outcome"];
  };
  return <Rectangle {...props} fill={getBarColor(outcome)} />;
};

const ActiveRectangle = (props: BarShapeProps) => {
  return <CustomFillRectangle {...props} stroke="#f59e0b" strokeWidth={3} />;
};
// #endregion

export default function TimeLine2({
  slotsByTimeRange,
  maxCapacity = 20,
  defaultIndex,
}: TimeLineProps) {
  const data = transformSlotData(slotsByTimeRange, maxCapacity);

  return (
    <BarChart
      layout="vertical"
      width={700}
      height={500}
      data={data}
      margin={{ top: 20, right: 30, left: 80, bottom: 20 }}
    >
      <CartesianGrid strokeDasharray="2 2" stroke="#374151" />
      <Tooltip
        contentStyle={{
          backgroundColor: "#1f2937",
          border: "1px solid #4b5563",
          borderRadius: "6px",
        }}
        labelStyle={{ color: "#d1d5db" }}
        formatter={(value) => [`${value} personas`, "Ocupación"]}
      />
      <XAxis
        type="number"
        domain={[0, maxCapacity]}
        tick={{ fill: "#d1d5db" }}
        axisLine={{ stroke: "#6b7280" }}
        label={{
          value: "Capacidad (personas)",
          position: "insideBottomRight",
          offset: -10,
          fill: "#9ca3af",
        }}
      />
      <YAxis
        type="category"
        dataKey="name"
        tick={{ fill: "#d1d5db" }}
        axisLine={{ stroke: "#6b7280" }}
        width={100}
        label={{
          value: "Horario",
          angle: -90,
          position: "insideTopLeft",
          offset: -10,
          fill: "#9ca3af",
        }}
      />
      <Bar
        dataKey="firstCycle"
        stackId="a"
        radius={[0, 0, 0, 0]}
        shape={CustomFillRectangle}
        activeBar={ActiveRectangle}
        name="Ocupado"
      />
      <Bar
        dataKey="secondCycle"
        stackId="a"
        radius={[5, 5, 5, 5]}
        shape={(props) => (
          <Rectangle {...props} fill="#1f2937" fillOpacity={0.2} />
        )}
        activeBar={(props) => (
          <Rectangle
            {...props}
            fill="#1f2937"
            fillOpacity={0.4}
            stroke="#f59e0b"
            strokeWidth={2}
          />
        )}
        name="Disponible"
      />
    </BarChart>
  );
}
