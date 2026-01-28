"use client";
import { ParentSize } from "@visx/responsive";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { TimeWindow } from "@/collections/appointments/check-availability";
import { LegendOrdinal } from "@visx/legend";
import { useTooltip, useTooltipInPortal, defaultStyles } from "@visx/tooltip";
import { localPoint } from "@visx/event";

export function OccupancyHistogram({
  slotsByTimeRage,
  maxCapacity,
  height = 400,
}: {
  slotsByTimeRage: TimeWindow[];
  maxCapacity: number;
  width?: number;
  height?: number;
}) {
  const {
    tooltipOpen,
    tooltipLeft,
    tooltipTop,
    tooltipData,
    showTooltip,
    hideTooltip,
  } = useTooltip<{ hour: string; value: number }>();

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    scroll: true,
  });

  const tooltipStyles = {
    ...defaultStyles,
    background: "rgba(0,0,0,.9)",
    color: "white",
    lineHeight: "1.5",
    fontSize: 13,
  };
  const margin = { top: 20, right: 20, bottom: 40, left: 40 };
  const yMax = height - margin.top - margin.bottom;

  const hours = slotsByTimeRage.map((s) =>
    new Date(s.from).toLocaleTimeString("es-ES", {
      timeZone: "Europe/Madrid",
      hour: "2-digit",
      minute: "2-digit",
    }),
  );

  const threshold = scaleLinear({
    domain: [0, maxCapacity],
    range: ["oklch(70.7% 0.165 254.624)", "oklch(28.2% 0.091 267.935)"], // tailwind green-300 / gree-800
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
            <svg
              ref={containerRef}
              width={responsiveWidth}
              height={responsiveHeight}
            >
              <Group left={margin.left} top={margin.top}>
                {slotsByTimeRage.map((slot, i) => {
                  const hour = hours[i];
                  const x = xScale(hour);
                  if (x === undefined) return null;
                  const value = slot.totalPeople;
                  const barHeight = yScale(0) - yScale(value);
                  return (
                    <rect
                      onMouseLeave={hideTooltip}
                      onMouseMove={(event) => {
                        const coords = localPoint(event);
                        showTooltip({
                          tooltipLeft: x + xScale.bandwidth() / 2,
                          tooltipTop: coords?.y,
                          tooltipData: {
                            hour,
                            value,
                          },
                        });
                      }}
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
            {tooltipOpen && tooltipData && (
              <TooltipInPortal
                top={tooltipTop}
                left={tooltipLeft}
                style={tooltipStyles}
              >
                <div>
                  <strong>{tooltipData.hour}</strong>
                </div>
                <div>{tooltipData.value} personas</div>
              </TooltipInPortal>
            )}
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
