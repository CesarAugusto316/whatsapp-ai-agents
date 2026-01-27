"use client";
import { ParentSize } from "@visx/responsive";
import { Group } from "@visx/group";
import { scaleBand, scaleUtc } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { TimeWindow } from "@/collections/appointments/check-availability";
import { useMemo } from "react";

interface GanttSlot {
  id: string;
  startDateTime: string;
  endDateTime: string;
  numberOfPeople: number;
  status: string;
  createdAt: string;
  customer: string;
}

export function TimeLine({
  slots,
  maxCapacity: _maxCapacity,
  height = 400,
}: {
  slots: TimeWindow[];
  maxCapacity: number;
  width?: number;
  height?: number;
}) {
  const margin = { top: 20, right: 20, bottom: 40, left: 40 };

  // Extraer todos los slots individuales de todas las horas
  const allSlots = useMemo(() => {
    const slotMap = new Map<string, GanttSlot>();

    slots.forEach((timeWindow) => {
      try {
        // Intentar parsear si es string
        const slotsData =
          typeof timeWindow.slots === "string"
            ? JSON.parse(timeWindow.slots)
            : timeWindow.slots;

        if (Array.isArray(slotsData)) {
          slotsData.forEach((slot: GanttSlot) => {
            if (!slotMap.has(slot.id)) {
              slotMap.set(slot.id, slot);
            }
          });
        }
      } catch (_error) {
        // Ignorar errores de parseo
      }
    });

    return Array.from(slotMap.values());
  }, [slots]);

  // Ordenar slots por hora de inicio
  const sortedSlots = useMemo(() => {
    return [...allSlots].sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() -
        new Date(b.startDateTime).getTime(),
    );
  }, [allSlots]);

  // Encontrar el rango de tiempo total
  const timeRange = useMemo(() => {
    if (sortedSlots.length === 0) {
      return { min: new Date(), max: new Date() };
    }

    const startTimes = sortedSlots.map((s) =>
      new Date(s.startDateTime).getTime(),
    );
    const endTimes = sortedSlots.map((s) => new Date(s.endDateTime).getTime());

    const minTime = Math.min(...startTimes);
    const maxTime = Math.max(...endTimes);

    // Si solo hay un slot, agregar margen de 1 hora
    if (minTime === maxTime) {
      return {
        min: new Date(minTime),
        max: new Date(maxTime + 60 * 60 * 1000),
      };
    }

    return {
      min: new Date(minTime),
      max: new Date(maxTime),
    };
  }, [sortedSlots]);

  // Crear escala para el eje Y (filas de slots)
  const yScale = useMemo(() => {
    return scaleBand({
      domain: sortedSlots.map((slot) => slot.id),
      padding: 0.2,
    });
  }, [sortedSlots]);

  // Colores para diferentes estados
  const statusColors = {
    confirmed: "oklch(69.6% 0.17 162.48)", // emerald
    pending: "oklch(79.5% 0.184 86.047)", // verde claro
    cancelled: "oklch(70.4% 0.191 22.216)", // verde oscuro
  };

  return (
    <ParentSize>
      {({ width: parentWidth }) => {
        if (parentWidth < 10) return null;

        const responsiveWidth = parentWidth;
        const responsiveHeight = height;
        const xMax = responsiveWidth - margin.left - margin.right;
        const yMax = responsiveHeight - margin.top - margin.bottom;

        // Configurar escalas
        const xScale = scaleUtc({
          domain: [timeRange.min, timeRange.max],
          range: [0, xMax],
        });

        yScale.range([0, yMax]);

        // Formatear horas para el eje X
        const formatTime = (value: Date | { valueOf(): number }) => {
          const date =
            value instanceof Date ? value : new Date(value.valueOf());
          return date.toLocaleTimeString("es-ES", {
            timeZone: "Europe/Madrid",
            hour: "2-digit",
            minute: "2-digit",
          });
        };

        return (
          <div>
            <svg width={responsiveWidth} height={responsiveHeight}>
              <Group left={margin.left} top={margin.top}>
                {/* Ejes */}
                <AxisBottom
                  top={yMax}
                  scale={xScale}
                  tickFormat={formatTime}
                  tickLabelProps={() => ({
                    fontSize: 11,
                    textAnchor: "middle",
                  })}
                />

                <AxisLeft
                  scale={yScale}
                  tickFormat={() => ""} // No mostrar labels en eje Y
                />

                {/* Barras Gantt */}
                {sortedSlots.map((slot) => {
                  const startX = xScale(new Date(slot.startDateTime));
                  const endX = xScale(new Date(slot.endDateTime));
                  const barWidth = Math.max(1, endX - startX);
                  const y = yScale(slot.id);

                  if (y === undefined || barWidth <= 0) return null;

                  return (
                    <g key={slot.id}>
                      <rect
                        x={startX}
                        y={y}
                        width={barWidth}
                        height={yScale.bandwidth()}
                        fill={
                          statusColors[
                            slot.status as keyof typeof statusColors
                          ] || statusColors.pending
                        }
                        rx={2}
                        opacity={0.8}
                      />
                      {/* Etiqueta con número de personas */}
                      {barWidth > 30 && (
                        <text
                          x={startX + barWidth / 2}
                          y={y + yScale.bandwidth() / 2}
                          textAnchor="middle"
                          dy="0.33em"
                          fontSize={10}
                          fill="white"
                          fontWeight="bold"
                        >
                          {slot.numberOfPeople}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Líneas de tiempo de referencia */}
                {slots.map((timeWindow, _i) => {
                  const x = xScale(new Date(timeWindow.from));
                  return (
                    <line
                      key={`line-${timeWindow.from}`}
                      x1={x}
                      x2={x}
                      y1={0}
                      y2={yMax}
                      stroke="rgba(0,0,0,0.1)"
                      strokeWidth={1}
                      strokeDasharray="2,2"
                    />
                  );
                })}
              </Group>
            </svg>

            {/* Leyenda */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  fontSize: "13px",
                  fontWeight: 500,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 20,
                      height: 14,
                      backgroundColor: statusColors.confirmed,
                      borderRadius: 2,
                    }}
                  />
                  <span>Confirmado</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 20,
                      height: 14,
                      backgroundColor: statusColors.pending,
                      borderRadius: 2,
                    }}
                  />
                  <span>Pendiente</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 20,
                      height: 14,
                      backgroundColor: statusColors.cancelled,
                      borderRadius: 2,
                    }}
                  />
                  <span>Cancelado</span>
                </div>
              </div>
            </div>

            {/* Información de slots */}
            <div
              style={{
                marginTop: 16,
                fontSize: "12px",
                color: "#666",
                textAlign: "center",
              }}
            >
              {sortedSlots.length === 0
                ? "No hay reservas en este período"
                : `${sortedSlots.length} reserva${sortedSlots.length !== 1 ? "s" : ""} mostrada${sortedSlots.length !== 1 ? "s" : ""}`}
            </div>
          </div>
        );
      }}
    </ParentSize>
  );
}
