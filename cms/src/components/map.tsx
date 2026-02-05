import { ServerComponentProps } from "payload";

async function extractPreciseCoordsFromGoogleLink(
  link: string,
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    // 1. Resolver URL acortada (maps.app.goo.gl) a su destino final
    let finalUrl = link;
    if (link.includes("maps.app.goo.gl")) {
      const res = await fetch(link, { redirect: "follow" });
      // `res.url` ahora contiene la URL final después de seguir todos los redireccionamientos
      finalUrl = res.url;
    }

    // 2. BÚSQUEDA PRINCIPAL: Coordenadas EXACTAS del marcador (Pin)
    // Patrón común en iframes y enlaces: !3dLATITUD!4dLONGITUD
    const preciseMatch = finalUrl.match(/!3d(-?\d+\.\d+)(?:!4d(-?\d+\.\d+))?/);

    if (preciseMatch && preciseMatch[1] && preciseMatch[2]) {
      console.log(
        "Coordenadas extraídas del marcador (patrón !3d!4d):",
        preciseMatch[1],
        preciseMatch[2],
      );
      return {
        latitude: parseFloat(preciseMatch[1]),
        longitude: parseFloat(preciseMatch[2]),
      };
    }

    // 3. BÚSQUEDA SECUNDARIA: Coordenadas del centro de la vista del mapa
    // Patrón: @LATITUD,LONGITUD
    const viewMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (viewMatch) {
      console.log(
        "Coordenadas extraídas del centro del mapa (patrón @):",
        viewMatch[1],
        viewMatch[2],
      );
      return {
        latitude: parseFloat(viewMatch[1]),
        longitude: parseFloat(viewMatch[2]),
      };
    }

    // 4. ÚLTIMO RESORTE: Buscar en el parámetro de consulta 'q' (menos común)
    const urlObj = new URL(finalUrl);
    const qParam = urlObj.searchParams.get("q");
    if (qParam) {
      const qMatch = qParam.match(/^(-?\d+\.\d+),(-?\d+\.\d+)$/);
      if (qMatch) {
        console.log(
          'Coordenadas extraídas del parámetro "q":',
          qMatch[1],
          qMatch[2],
        );
        return {
          latitude: parseFloat(qMatch[1]),
          longitude: parseFloat(qMatch[2]),
        };
      }
    }

    console.log("No se pudieron extraer coordenadas de la URL.");
    return null;
  } catch (error) {
    console.error("Error al procesar el enlace:", error);
    return null;
  }
}

// --- PRUEBAS CON TUS ENLACES ---
(async () => {
  // Enlace 2: Enlace para compartir acortado (maps.app.goo.gl)
  const shortUrl = "https://maps.app.goo.gl/nUiogXDuTVkgWMV97";
  const coordsFromShort = await extractPreciseCoordsFromGoogleLink(shortUrl);
  console.log("Resultado Enlace Corto:", coordsFromShort);
  // También debería devolver las coordenadas precisas del marcador.
})();

// https://www.google.com/maps/place/0.8260696,-79.9475483   // with pin (marker)

export default function EmbedMap({ data }: ServerComponentProps) {
  return (
    <div style={{ border: 0, marginBottom: 38, marginTop: 30 }}>
      <h2 style={{ marginBottom: 20 }}>{data?.name}</h2>
      {/* ... otros campos ... */}
      {/* Renderiza el mapa incrustado directamente desde el HTML guardado */}
      {data?.general.embedMap ? (
        <div dangerouslySetInnerHTML={{ __html: data?.general.embedMap }} />
      ) : (
        <h4>Mapa no disponible, Agrega el mapa desde Google Maps</h4>
      )}
    </div>
  );
}
