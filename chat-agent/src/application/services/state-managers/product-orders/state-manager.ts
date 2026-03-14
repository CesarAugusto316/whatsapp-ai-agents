import {
  CustomerSignals,
  MainOptions,
  FMStatus,
  BookingStatuses,
} from "@/domain/booking";
import { Product, SpecializedDomain } from "@/infraestructure/adapters/cms";
import { stateMessages } from "./messages";
import { ProductItem, ProductOrderState } from "@/domain/orders";
import { QuadrantPoint } from "@/infraestructure/adapters/vector-store";
import { cacheAdapter } from "@/infraestructure/adapters/cache";
import { ragService } from "../../rag";
import { findMatchingProduct, findMatchingProductInCart } from "./helpers";

interface ProductStateTransition {
  nextState?: FMStatus;
  /**
   * Mensaje template determinístico para enviar al usuario después de la transición.
   * Se genera automáticamente basado en el estado, dominio y datos.
   *
   * @see getBookingStateMessage en domain/booking/prompts/helpers/state-messages.ts
   */
  message: string;
}

/**
 * Manager para el estado del proceso de reserva
 */
class ProductOrderStateManager {
  /**
   * Deriva el siguiente estado basado en el estado actual y la acción del usuario.
   * Genera automáticamente el mensaje template para enviar al usuario.
   *
   * @param status - Estado actual o acción del usuario
   * @param action - Acción del usuario (opcional)
   * @param params - Parámetros adicionales para generar el mensaje
   * @param params.data - Datos de la reserva (para mensajes que requieren estado)
   * @param params.timeZone - Zona horaria del negocio
   * @param params.domain - Dominio especializado (restaurant, medical, etc.)
   * @param params.userName - Nombre del usuario (para mensajes personalizados)
   */
  nextTransition(
    status: string,
    params?: {
      timeZone?: string;
      domain?: SpecializedDomain;
      data?: Partial<ProductOrderState>;
    },
  ): ProductStateTransition {
    const { data, timeZone, domain = "restaurant" } = params || {};

    switch (status) {
      // CREATE
      case MainOptions.CREATE_ORDER:
        return {
          nextState: BookingStatuses.MAKE_STARTED,
          message: stateMessages[BookingStatuses.MAKE_STARTED]({
            domain,
            data,
          }),
        };
      case BookingStatuses.MAKE_STARTED:
        return {
          nextState: BookingStatuses.MAKE_VALIDATED,
          message: stateMessages[BookingStatuses.MAKE_VALIDATED]({
            domain,
            data,
            timeZone,
          }),
        };
      case BookingStatuses.MAKE_VALIDATED + CustomerSignals.CONFIRM:
        return {
          nextState: BookingStatuses.MAKE_CONFIRMED,
          message: stateMessages[BookingStatuses.MAKE_CONFIRMED]({
            domain,
            signal: CustomerSignals.CONFIRM,
            data,
            timeZone,
          }),
        };
      case BookingStatuses.MAKE_VALIDATED + CustomerSignals.EXIT:
        return {
          nextState: undefined,
          message: stateMessages[BookingStatuses.MAKE_CONFIRMED]({
            domain,
            signal: CustomerSignals.EXIT,
            data,
            timeZone,
          }),
        };
      case BookingStatuses.MAKE_VALIDATED + CustomerSignals.RESTART:
        return {
          nextState: BookingStatuses.MAKE_STARTED,
          message: stateMessages[BookingStatuses.MAKE_CONFIRMED]({
            domain,
            signal: CustomerSignals.RESTART,
            data,
            timeZone,
          }),
        };

        // UPDATE
        // case MainOptions.UPDATE_BOOKING:
        //   return {
        //     nextState: BookingStatuses.UPDATE_STARTED,
        //     message: stateMessages[BookingStatuses.UPDATE_STARTED]({
        //       domain,
        //       data,
        //       timeZone,
        //     }),
        //   };
        // case BookingStatuses.UPDATE_STARTED:
        //   return {
        //     nextState: BookingStatuses.UPDATE_VALIDATED,
        //     message: stateMessages[BookingStatuses.UPDATE_VALIDATED]({
        //       domain,
        //       data,
        //       timeZone,
        //     }),
        //   };
        // case BookingStatuses.UPDATE_VALIDATED + CustomerSignals.CONFIRM:
        //   return {
        //     nextState: BookingStatuses.UPDATE_CONFIRMED,
        //     message: stateMessages[BookingStatuses.UPDATE_CONFIRMED]({
        //       domain,
        //       signal: CustomerSignals.CONFIRM,
        //       data,
        //       timeZone,
        //     }),
        //   };
        // case BookingStatuses.UPDATE_VALIDATED + CustomerSignals.EXIT:
        //   return {
        //     nextState: undefined,
        //     message: stateMessages[BookingStatuses.UPDATE_CONFIRMED]({
        //       domain,
        //       signal: CustomerSignals.EXIT,
        //       data,
        //       timeZone,
        //     }),
        //   };
        // case BookingStatuses.UPDATE_VALIDATED + CustomerSignals.RESTART:
        return {
          nextState: BookingStatuses.UPDATE_STARTED,
          message: stateMessages[BookingStatuses.UPDATE_CONFIRMED]({
            domain,
            signal: CustomerSignals.RESTART,
            data,
            timeZone,
          }),
        };

        // CANCEL
        // case MainOptions.CANCEL_BOOKING:
        //   return {
        //     nextState: BookingStatuses.CANCEL_VALIDATED,
        //     message: stateMessages[BookingStatuses.CANCEL_VALIDATED]({
        //       domain,
        //       data,
        //       timeZone,
        //     }),
        //   };
        // case BookingStatuses.CANCEL_VALIDATED + CustomerSignals.CONFIRM:
        return {
          nextState: BookingStatuses.CANCEL_CONFIRMED,
          message: stateMessages[BookingStatuses.CANCEL_CONFIRMED]({
            domain,
            data,
          }),
        };

      default:
        return {
          nextState: status as FMStatus,
          message: "",
        };
    }
  }

  async addSearchedProducts(
    key: string,
    products: QuadrantPoint<Partial<Product>>[],
  ) {
    const prev = await this.getState(key);

    await cacheAdapter.save<Partial<ProductOrderState>>(key, {
      ...prev,
      searchedProducts: [...(prev?.searchedProducts ?? []), ...products],
    });
  }

  async addProductToCart(
    key: string,
    businessId: string,
    product: Omit<ProductItem, "id">,
  ) {
    const prev = await this.getState(key);
    const searchedProducts = prev?.searchedProducts ?? [];

    const productExists = findMatchingProduct(searchedProducts, product.name);

    if (!productExists) {
      const { points } = await ragService.searchProducts(
        product.name,
        businessId,
        1,
      );
      const productFound = points[0];
      const payload = {
        ...product,
        id: productFound.payload.id!,
        name: productFound.payload.name!,
      };
      const products = [...(prev?.products ?? []), payload];
      await cacheAdapter.save<Partial<ProductOrderState>>(key, {
        ...prev,
        products,
      });
      return { added: true, products };
    }

    const payload = {
      ...product,
      id: productExists.payload.id!,
      name: productExists.payload.name!,
    };
    const products = [...(prev?.products ?? []), payload];
    await cacheAdapter.save<Partial<ProductOrderState>>(key, {
      ...prev,
      products,
    });
    return { added: true, products };
  }

  async removeProductFromCart(
    key: string,
    product: { name: string; quantity?: number },
  ) {
    const prev = await this.getState(key);
    const prevProducts = prev?.products ?? [];

    if (!product.quantity) {
      const match = findMatchingProductInCart(prevProducts, product.name);
      const filtered = match
        ? prevProducts.filter((_, i) => i !== match.index)
        : prevProducts;

      await cacheAdapter.save<Partial<ProductOrderState>>(key, {
        ...prev,
        products: filtered,
      });

      return { removed: true, products: filtered };
    }

    const match = findMatchingProductInCart(prevProducts, product.name);
    if (!match) {
      return { removed: false, products: prevProducts };
    }

    const updated = [...prevProducts];
    updated[match.index] = {
      ...updated[match.index],
      quantity: Math.max(0, updated[match.index].quantity - product.quantity!),
    };
    const filtered = updated.filter((p) => p.quantity > 0);

    await cacheAdapter.save<Partial<ProductOrderState>>(key, {
      ...prev,
      products: filtered,
    });

    return { removed: true, products: filtered };
  }

  async updateProductInCart(
    key: string,
    businessId: string,
    product: Omit<ProductItem, "id">,
  ) {
    const prev = await this.getState(key);
    const products = prev?.products ?? [];

    const match = findMatchingProductInCart(products, product.name);

    if (!match) {
      const { products } = await this.addProductToCart(
        key,
        businessId,
        product,
      );
      return { updated: true, products };
    }

    const updated = [...products];
    updated[match.index] = {
      ...updated[match.index],
      quantity: product.quantity,
    };

    await cacheAdapter.save<Partial<ProductOrderState>>(key, {
      ...prev,
      products: updated,
    });
    return { updated: true, products: updated };
  }

  async viewCart(key: string) {
    const prev = await this.getState(key);
    return {
      viewed: true,
      products: prev?.products ?? [],
      totalItems: prev?.products?.length ?? 0,
      customerName: prev?.customerName,
      customerId: prev?.customerId,
    };
  }

  async enterUsername(key: string, customerName: string) {
    const prev = await this.getState(key);
    await cacheAdapter.save<Partial<ProductOrderState>>(key, {
      ...prev,
      customerName,
    });
    return { enteredUsername: true, customerName };
  }

  async getState(key: string) {
    return cacheAdapter.getObj<Partial<ProductOrderState>>(key);
  }
}

export const productOrderStateManager = new ProductOrderStateManager();
