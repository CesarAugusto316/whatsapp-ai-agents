import { DomainCtx } from "@/domain/booking";
import { ragService } from "@/application/services/rag";
import { formatSagaOutput } from "@/application/patterns";
import { BookingSagaResult } from "../booking/booking-saga";

/**
 * Handler para products:find
 * Busca productos semánticamente usando RAG
 */
export async function productFindWorkflow(
  ctx: DomainCtx,
): Promise<BookingSagaResult | undefined> {
  const { customerMessage, business } = ctx;

  try {
    // 1. Buscar productos semánticamente
    const searchResult = await ragService.searchProducts(
      customerMessage,
      business.id,
      5, // limit
    );

    // 2. Formatear resultados
    const products = searchResult.points || [];

    if (products.length === 0) {
      const msg = `😕 No encontramos productos que coincidan con "*${customerMessage}*".\n\nIntenta con otra búsqueda o consulta nuestro menú completo.`;
      return formatSagaOutput(msg, "products:find", {
        query: customerMessage,
        found: 0,
      });
    }

    // 3. Construir mensaje con resultados
    const productsList = products
      .map((p: any, index: number) => {
        const name = p.payload?.name || "Producto sin nombre";
        const description = p.payload?.description || "";
        const price = p.payload?.price ? `$${p.payload.price}` : "";
        return `${index + 1}. *${name}* ${price}\n   ${description}`;
      })
      .join("\n\n");

    const msg = `🔍 Resultados para "*${customerMessage}*":\n\n${productsList}\n\n💬 Si necesitas más información, escríbela directamente.`;

    return formatSagaOutput(msg, "products:find", {
      query: customerMessage,
      found: products.length,
    });
  } catch (error) {
    console.error("Error en productFindWorkflow:", error);
    const msg = "😕 Ocurrió un error buscando productos. Intenta más tarde.";
    return formatSagaOutput(msg, "products:find", {
      query: customerMessage,
      error: "SEARCH_FAILED",
    });
  }
}
