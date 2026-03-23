import { ServerComponentProps } from "payload";
import dynamic from "next/dynamic";

const DynamicMap = dynamic(() => import("./map-client"));

export default function EmbedMap({ data }: ServerComponentProps) {
  const coordinates = data.general?.location as [number, number];
  const hasCoordinates =
    coordinates && Array.isArray(coordinates) && coordinates.length === 2;

  return (
    <div style={{ border: 0, marginBottom: 38, marginTop: 30 }}>
      <h2 style={{ marginBottom: 20 }}>{data?.name}</h2>

      {/*{data?.general?.embedMap ? (
        <div dangerouslySetInnerHTML={{ __html: data?.general.embedMap }} />
      ) : (
        <h4>Mapa no disponible, Agrega el mapa desde Google Maps</h4>
      )}*/}

      {hasCoordinates ? (
        <div style={{ height: "450px", width: "100%", position: "relative" }}>
          <DynamicMap coordinates={coordinates} businessName={data?.name} />
        </div>
      ) : (
        <h4>Mapa no disponible. Agrega la ubicación desde Google Maps.</h4>
      )}
    </div>
  );
}
