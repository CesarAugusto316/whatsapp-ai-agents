"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

interface DynamicMapProps {
  coordinates: [number, number];
  businessName?: string;
}
export default function DynamicMap({
  coordinates,
  businessName,
}: DynamicMapProps) {
  const mapRef = useRef(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Importaciones dinámicas → solo en cliente
    import("leaflet").then((L) => {
      // Fix iconos (necesario hacerlo después de importar)
      delete (L as any).Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!containerRef.current) return;
      if (mapRef.current) return; // evitar doble inicialización

      const [lng, lat] = coordinates;
      const center: [number, number] = [lat, lng];

      mapRef.current = L.map(containerRef.current).setView(center, 17);

      L.tileLayer(
        "https://{s}.tile.jawg.io/jawg-sunny/{z}/{x}/{y}{r}.png?access-token=6MBBGH7WycwgDzmY0slg0GYB65TuW2pdSFVErSykGpN59cAA0cpyC2KbzNoGovAQ",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        },
      ).addTo(mapRef.current);

      L.marker(center)
        .addTo(mapRef.current)
        .bindPopup(`<b>${businessName || "Negocio"}</b>`)
        .openPopup();
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [coordinates, businessName]);

  return <div ref={containerRef} style={{ height: "100%", width: "70%" }} />;
}
