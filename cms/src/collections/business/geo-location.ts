/**
 * Extrae coordenadas (latitud, longitud) del código de un iframe de Google Maps.
 * Utiliza la función `extractPreciseCoordsFromGoogleLink` para el procesamiento preciso.
 * @param iframeString - Código HTML completo del iframe o solo el atributo src.
 * @returns Objeto con latitude y longitude, o null si no se encuentran.
 */
export async function extractCoordsFromGoogleIframe(
  iframeString: string,
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    // 1. Extraer la URL del atributo src del iframe
    let srcUrl: string | null = null;

    // Intentar extraer el src usando una expresión regular flexible
    const srcMatch = iframeString.match(/src\s*=\s*["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      srcUrl = srcMatch[1];
    } else {
      // Si no se encuentra un atributo src, asumir que el string es directamente la URL
      srcUrl = iframeString.trim();
    }

    if (!srcUrl) {
      console.log("No se pudo extraer la URL del iframe.");
      return null;
    }

    // 2. Usar tu función probada para extraer las coordenadas de la URL
    return await extractPreciseCoordsFromGoogleLink(srcUrl);
  } catch (error) {
    console.error("Error al procesar el iframe:", error);
    return null;
  }
}

export async function extractPreciseCoordsFromGoogleLink(
  link: string,
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    // 1. Resolver URL acortada (maps.app.goo.gl) a su destino final
    let finalUrl = link;
    if (link.includes("maps.app.goo.gl")) {
      const res = await fetch(link, { redirect: "follow" });
      finalUrl = res.url;
    }

    // 2. BÚSQUEDA PRINCIPAL: Coordenadas EXACTAS del marcador (Pin)
    // Buscar en TODOS los patrones posibles, en orden de preferencia

    // Patrón A: Formato de enlace corto o lugar (!3dLATITUD!4dLONGITUD)
    const preciseMatch = finalUrl.match(/!3d(-?\d+\.\d+)(?:!4d(-?\d+\.\d+))?/);
    if (preciseMatch && preciseMatch[1] && preciseMatch[2]) {
      console.log(
        "Coordenadas extraídas (patrón !3d!4d):",
        preciseMatch[1],
        preciseMatch[2],
      );
      return {
        latitude: parseFloat(preciseMatch[1]),
        longitude: parseFloat(preciseMatch[2]),
      };
    }

    // Patrón B: Formato de iframe embed (!2dLONGITUD!3dLATITUD)
    const embedPattern = finalUrl.match(/!2d(-?\d+\.\d+)(?:!3d(-?\d+\.\d+))?/);
    if (embedPattern && embedPattern[1] && embedPattern[2]) {
      console.log(
        "Coordenadas extraídas (patrón !2d!3d):",
        embedPattern[2],
        embedPattern[1],
      );
      return {
        latitude: parseFloat(embedPattern[2]), // !3d es latitud
        longitude: parseFloat(embedPattern[1]), // !2d es longitud
      };
    }

    // 3. BÚSQUEDA SECUNDARIA: Coordenadas del centro de la vista del mapa
    // Patrón: @LATITUD,LONGITUD
    const viewMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (viewMatch) {
      console.log(
        "Coordenadas extraídas (patrón @):",
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
          'Coordenadas extraídas (parámetro "q"):',
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
