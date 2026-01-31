"use client";
import { useState, useEffect, useCallback } from "react";
import { AvailabilityResponse } from "@/collections/appointments/check-availability";
import { OccupancyHistogram } from "./bar-chart";
import { TimeLine } from "./time-line";

interface SelectorOptions {
  id: string;
  name: string;
  timeZone: string;
}

interface ChartsProps {
  data: SelectorOptions[];
}

// Claves para localStorage
const STORAGE_KEYS = {
  SELECTED_BUSINESS_ID: "chart-wrapper_selected-business-id",
  SELECTED_DATE: "chart-wrapper_selected-date",
} as const;

// Función para llamar a la API de disponibilidad
async function fetchAvailabilityData(
  businessId: string,
  date: Date,
): Promise<AvailabilityResponse> {
  const payload = {
    businessId,
    startDateTime: date.toISOString().split("T")[0],
  };
  const response = await fetch("/api/availability", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Error ${response.status}: ${response.statusText}`,
    );
  }

  return response.json();
}

// Helper para guardar en localStorage de manera segura
const saveToLocalStorage = (key: string, value: string): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Error saving to localStorage key "${key}":`, error);
  }
};

// Helper para cargar desde localStorage de manera segura
const loadFromLocalStorage = (key: string, defaultValue: string): string => {
  if (typeof window === "undefined") return defaultValue;
  try {
    const value = localStorage.getItem(key);
    return value !== null ? value : defaultValue;
  } catch (error) {
    console.error(`Error loading from localStorage key "${key}":`, error);
    return defaultValue;
  }
};

/**
 *
 * @description React component for rendering charts.
 * @param param0
 * @returns
 */
export default function Charts({ data: initialBusinesses }: ChartsProps) {
  // Obtener valores iniciales desde localStorage o valores por defecto
  const getInitialBusinessId = (): string => {
    const savedBusinessId = loadFromLocalStorage(
      STORAGE_KEYS.SELECTED_BUSINESS_ID,
      "",
    );

    // Verificar que el businessId guardado existe en la lista de negocios
    if (
      savedBusinessId &&
      initialBusinesses.some((b) => b.id === savedBusinessId)
    ) {
      return savedBusinessId;
    }

    // Si no existe o no es válido, usar el primer negocio disponible
    return initialBusinesses[0]?.id || "";
  };

  // Estado para el negocio seleccionado
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(
    getInitialBusinessId(),
  );

  // Estado para la fecha seleccionada
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Estado para los datos de disponibilidad
  const [availabilityData, setAvailabilityData] =
    useState<AvailabilityResponse | null>(null);

  // Estado para loading
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Estado para error
  const [error, setError] = useState<string | null>(null);

  // Función para cargar datos de disponibilidad
  const loadAvailabilityData = useCallback(
    async (businessId: string, date: Date) => {
      if (!businessId) return;

      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchAvailabilityData(businessId, date);
        setAvailabilityData(res);
      } catch (err) {
        console.error("Error loading availability data:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load availability data",
        );
        setAvailabilityData(null);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Efecto para cargar datos cuando cambia el negocio o la fecha
  useEffect(() => {
    if (selectedBusinessId) {
      loadAvailabilityData(selectedBusinessId, selectedDate);
    }
  }, [selectedBusinessId, selectedDate, loadAvailabilityData]);

  // Efecto para guardar el businessId en localStorage cuando cambia
  useEffect(() => {
    if (selectedBusinessId) {
      saveToLocalStorage(STORAGE_KEYS.SELECTED_BUSINESS_ID, selectedBusinessId);
    }
  }, [selectedBusinessId]);

  // Manejar cambio de negocio
  const handleBusinessChange = useCallback((value: string) => {
    setSelectedBusinessId(value);
  }, []);

  // Manejar cambio de fecha
  const handleDateChange = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  // Preparar opciones para el selector de negocios
  const businessOptions = initialBusinesses.map((business) => ({
    label: business.name,
    value: business.id,
    id: business.id,
  }));

  return (
    <div
      style={{ display: "grid", gap: 40, paddingTop: 30, paddingBottom: 30 }}
    >
      <h2 style={{ textAlign: "center" }}>
        {availabilityData?.startDate
          ? `Reservaciones para el ${Intl.DateTimeFormat("es-ES", {
              timeZone:
                initialBusinesses.find(
                  (option) => option.id === selectedBusinessId,
                )?.timeZone || "Europe/Madrid",
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })?.format(new Date(availabilityData?.startDate ?? ""))}`
          : "Cargando disponibilidad..."}
      </h2>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div>
          <label
            htmlFor="business-select"
            style={{ marginRight: 8, fontWeight: 500 }}
          >
            Negocio:
          </label>
          <select
            id="business-select"
            value={selectedBusinessId}
            onChange={(e) => handleBusinessChange(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 4,
              border: "1px solid #ccc",
              fontSize: 14,
              minWidth: 200,
            }}
          >
            {businessOptions.map((option) => (
              <option key={option.id} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="date-picker"
            style={{ marginRight: 8, fontWeight: 500 }}
          >
            Fecha:
          </label>
          <input
            id="date-picker"
            type="date"
            value={selectedDate.toISOString().split("T")[0]}
            onChange={(e) => handleDateChange(new Date(e.target.value))}
            style={{
              padding: "8px 12px",
              borderRadius: 4,
              border: "1px solid #ccc",
              fontSize: 14,
            }}
          />
        </div>
      </div>

      {isLoading && <div style={{ textAlign: "center" }}>Cargando...</div>}

      {error && (
        <div style={{ color: "red", textAlign: "center" }}>Error: {error}</div>
      )}

      {availabilityData && !isLoading && (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            width: "100%",
          }}
        >
          <OccupancyHistogram
            slotsByTimeRage={availabilityData.slotsByTimeRange ?? []}
            maxCapacity={availabilityData.maxCapacityPerHour}
          />
          <TimeLine
            slotsByTimeRage={availabilityData.slotsByTimeRange ?? []}
            maxCapacity={availabilityData.maxCapacityPerHour}
          />
        </section>
      )}
    </div>
  );
}
