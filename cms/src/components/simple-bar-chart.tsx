import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { TimeWindow } from "@/collections/appointments/check-availability";

export function OccupancyHistogram({
  slots,
  maxCapacity,
  width = 700,
  height = 250,
}: {
  slots: TimeWindow[];
  maxCapacity: number;
  width?: number;
  height?: number;
}) {
  const margin = { top: 20, right: 20, bottom: 40, left: 40 };

  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  const hours = slots.map((s) => s.from);

  const xScale = scaleBand({
    domain: hours,
    range: [0, xMax],
    padding: 0.2,
  });

  const yScale = scaleLinear({
    domain: [0, maxCapacity],
    range: [yMax, 0],
  });

  return (
    <svg width={width} height={height}>
      <Group top={margin.top} left={margin.left}>
        {slots.map((s) => {
          const x = xScale(s.from)!;
          const y = yScale(s.totalPeople);
          const h = yMax - y;

          return (
            <rect
              key={s.from}
              x={x}
              y={y}
              width={xScale.bandwidth()}
              height={h}
              fill="#4f46e5"
            />
          );
        })}

        {/* capacity line */}
        <line
          x1={0}
          x2={xMax}
          y1={yScale(maxCapacity)}
          y2={yScale(maxCapacity)}
          stroke="red"
          strokeDasharray="4 4"
        />

        <AxisLeft scale={yScale} />
        <AxisBottom top={yMax} scale={xScale} />
      </Group>
    </svg>
  );
}
