import { Locale, Payload } from "payload";
import { I18n } from "@payloadcms/translations";
import { User } from "@/payload-types";
import Charts from "./chart-wrapper";

interface ChartsContainerProps {
  payload: Payload;
  locale: Locale;
  i18n: I18n;
  params: Record<string, string>;
  searchParams: Record<string, string>;
  user: User;
}

export default async function ChartsContainer({
  payload,
  user,
}: ChartsContainerProps) {
  // Obtener los negocios del usuario desde el servidor
  const businesses = await payload.find({
    collection: "businesses",
    where: {
      "general.user": {
        equals: user.id,
      },
    },
  });

  // Preparar los datos de negocios para pasar al componente cliente
  const initialBusinesses = businesses.docs.map((business) => ({
    id: business.id,
    name: business.name,
  }));

  if (user.role === "admin") return;

  // Si no hay negocios, mostrar un mensaje
  if (initialBusinesses.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2>No hay negocios registrados</h2>
        <p>
          Por favor, registra un negocio primero para ver las reservaciones.
        </p>
      </div>
    );
  }

  // Pasar los datos iniciales al componente cliente
  return <Charts data={initialBusinesses} />;
}
