"use client";
import { ParentSize } from "@visx/responsive";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { TimeWindow } from "@/collections/appointments/check-availability";
import { LegendOrdinal } from "@visx/legend";

export function TimeLine({
  slots,
  maxCapacity,
  height = 400,
}: {
  slots: TimeWindow[];
  maxCapacity: number;
  width?: number;
  height?: number;
}) {
  const margin = { top: 20, right: 20, bottom: 40, left: 40 };
  const yMax = height - margin.top - margin.bottom;

  const hours = slots.map((s) =>
    new Date(s.from).toLocaleTimeString("es-ES", {
      timeZone: "Europe/Madrid",
      hour: "2-digit",
      minute: "2-digit",
    }),
  );

  console.log({ slots });

  const threshold = scaleLinear({
    domain: [0, maxCapacity],
    range: ["oklch(87.1% 0.15 154.449)", "oklch(39.3% 0.095 152.535)"], // tailwind green-300 / gree-800
  });

  const yScale = scaleLinear({
    domain: [0, maxCapacity],
    range: [yMax, 0],
    nice: true,
  });

  return (
    <ParentSize>
      {({ width: parentWidth }) => {
        if (parentWidth < 10) return null;

        const responsiveWidth = parentWidth;
        const responsiveHeight = height;

        const xMax = responsiveWidth - margin.left - margin.right;

        const xScale = scaleBand({
          domain: hours,
          range: [0, xMax],
          padding: 0.3,
        });

        return (
          <div>
            <svg width={responsiveWidth} height={responsiveHeight}>
              <Group left={margin.left} top={margin.top}>
                {slots.map((slot, i) => {
                  const hour = hours[i];
                  const x = xScale(hour);
                  if (x === undefined) return null;
                  const value = slot.totalPeople;
                  const barHeight = yScale(0) - yScale(value);

                  return (
                    <rect
                      key={slot.from}
                      x={x}
                      y={yScale(value)}
                      width={xScale.bandwidth()}
                      height={barHeight}
                      fill={threshold(value)}
                      rx={4}
                    />
                  );
                })}

                <AxisLeft scale={yScale} />

                <AxisBottom
                  top={yMax}
                  scale={xScale}
                  tickLabelProps={() => ({
                    fontSize: 11,
                    textAnchor: "middle",
                  })}
                />
              </Group>
            </svg>

            <LegendOrdinal
              scale={threshold}
              direction="row"
              labelFormat={(d, i) =>
                i === 0 ? "Disponible" : "Capacidad máxima"
              }
              itemMargin="0 16px 0 0"
              shape="rect"
              shapeWidth={20}
              shapeHeight={14}
              style={{
                fontSize: "13px",
                fontWeight: 500,
                marginTop: 12,
              }}
            />
          </div>
        );
      }}
    </ParentSize>
  );
}
