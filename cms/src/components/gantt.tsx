import { TimeWindow } from "@/collections/appointments/check-availability";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";

const colorFromId = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = id.charCodeAt(i) + ((h << 5) - h);
  }
  return `hsl(${h % 360},70%,55%)`;
};

export function ReservationTimeline({
  slots,
  maxCapacity,
  width = 700,
  height = 300,
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
    padding: 0.15,
  });

  const yScale = scaleLinear({
    domain: [0, maxCapacity],
    range: [yMax, 0],
  });

  return (
    <svg width={width} height={height}>
      <Group top={margin.top} left={margin.left}>
        {slots.map((hour) => {
          let acc = 0;

          return hour.slots.map((res) => {
            const x = xScale(hour.from)!;

            const y0 = acc;
            acc += res.numberOfPeople;

            return (
              <rect
                key={`${hour.from}-${res.id}`}
                x={x}
                y={yScale(acc)}
                width={xScale.bandwidth()}
                height={yScale(y0) - yScale(acc)}
                fill={colorFromId(res.id)}
              />
            );
          });
        })}
      </Group>
    </svg>
  );
}
