import { ServerComponentProps } from "payload";

// coords: {
//    latitude: 0.8260696,
//    longitude: -79.9475483,
//  },
// https://www.google.com/maps/place/0.8260696,-79.9475483   // with pin (marker)

export default function EmbedMap({ data }: ServerComponentProps) {
  return (
    <div style={{ border: 0, marginBottom: 38, marginTop: 30 }}>
      <h2 style={{ marginBottom: 20 }}>{data?.name}</h2>

      {data?.general?.embedMap ? (
        <div dangerouslySetInnerHTML={{ __html: data?.general.embedMap }} />
      ) : (
        <h4>Mapa no disponible, Agrega el mapa desde Google Maps</h4>
      )}
    </div>
  );
}
