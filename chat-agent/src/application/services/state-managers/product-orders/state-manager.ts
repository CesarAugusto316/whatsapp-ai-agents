import {
  CustomerSignals,
  MainOptions,
  FMStatus,
  BookingStatuses,
} from "@/domain/booking";
import {
  CartItem,
  Product,
  SpecializedDomain,
} from "@/infraestructure/adapters/cms";
import { stateMessages } from "./messages";
import { ProductItem, ProductOrderState } from "@/domain/orders";
import { QuadrantPoint } from "@/infraestructure/adapters/vector-store";
import { cacheAdapter } from "@/infraestructure/adapters/cache";
import { ragService } from "../../rag";
import { fuzzyMatch } from "../../fuzzy-matching";
import { RoutingHistoryEntry } from "@/application/use-cases/sagas/product-orders";

const MAX_HISTORY_LENGTH = 5;

type HistoryArg = Omit<RoutingHistoryEntry, "timestamp">;

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
      // return {
      //   nextState: BookingStatuses.UPDATE_STARTED,
      //   message: stateMessages[BookingStatuses.UPDATE_CONFIRMED]({
      //     domain,
      //     signal: CustomerSignals.RESTART,
      //     data,
      //     timeZone,
      //   }),
      // };

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
      // return {
      //   nextState: BookingStatuses.CANCEL_CONFIRMED,
      //   message: stateMessages[BookingStatuses.CANCEL_CONFIRMED]({
      //     domain,
      //     data,
      //   }),
      // };

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

    const productExists = searchedProducts
      .filter((p) => p.payload.enabled)
      .findLast((p) => fuzzyMatch(p.payload?.name!, product.name));

    if (!productExists) {
      const { points } = await ragService.searchProducts(
        product.name,
        businessId,
        1,
      );
      const productFound = points.filter((p) => p.payload.enabled)?.[0];

      if (!productFound) return { products: prev?.products };

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
      return { products };
    }

    const payload = {
      ...product,
      id: productExists.payload.id!,
      name: product.name,
    };
    const products = [...(prev?.products ?? []), payload];
    await cacheAdapter.save<Partial<ProductOrderState>>(key, {
      ...prev,
      products,
    });
    return { products };
  }

  async removeProductFromCart(
    key: string,
    product: { name: string; quantity?: number },
  ) {
    const prev = await this.getState(key);
    const prevProducts = prev?.products ?? [];

    // Si no hay quantity, eliminamos todos los que coincidan con el nombre
    if (!product.quantity) {
      const found = prevProducts.findLast((p) =>
        fuzzyMatch(p.name, product.name),
      );
      const filtered = prevProducts.filter((p) => p.name !== found?.name);
      await cacheAdapter.save<Partial<ProductOrderState>>(key, {
        ...prev,
        products: filtered,
      });

      return { products: filtered };
    }

    // Si hay quantity, reducimos o eliminamos
    const found = prevProducts.findLast((p) =>
      fuzzyMatch(p.name, product.name),
    );

    const updated = prevProducts
      .map((p) => {
        if (p.name === found?.name) {
          return {
            ...p,
            quantity: Math.max(0, p.quantity - product.quantity!),
          };
        }
        return p;
      })
      .filter((p) => p.quantity > 0);

    await cacheAdapter.save<Partial<ProductOrderState>>(key, {
      ...prev,
      products: updated,
    });

    return { products: updated };
  }

  async updateProductInCart(
    key: string,
    businessId: string,
    product: Omit<ProductItem, "id">,
  ) {
    const prev = await this.getState(key);
    const products = prev?.products ?? [];

    const productIndex = products.findLastIndex((p) =>
      fuzzyMatch(p.name, product.name),
    );

    if (productIndex === -1) {
      // No existe, lo agregamos
      const { products } = await this.addProductToCart(
        key,
        businessId,
        product,
      );

      return { products };
    }

    // Actualizamos la cantidad
    const updated = [...products];
    updated[productIndex] = {
      ...updated[productIndex],
      quantity: product.quantity,
    };

    await cacheAdapter.save<Partial<ProductOrderState>>(key, {
      ...prev,
      products: updated,
    });
    return { products: updated };
  }

  async viewCart(key: string) {
    const prev = await this.getState(key);

    const summary: CartItem[] = (prev?.products ?? []).map((p) => {
      const found = prev?.searchedProducts.findLast(
        (sp) => sp.id === p.id,
      )?.payload;

      return {
        productId: found?.id!,
        productName: found?.name!,
        quantity: p.quantity ?? 1,
        observations: p.notes ?? "",
        price: found?.price ?? 0,
        subTotal: p.quantity * (found?.price ?? 0),
        estimatedProcessingTime: found?.estimatedProcessingTime!,
        isAvailable: found?.enabled ?? false,
      };
    });

    const orderItems = summary.toSorted(
      (a, b) => b.estimatedProcessingTime.max - a.estimatedProcessingTime.max,
    );

    return {
      summary,
      estimatedProcessingTime: orderItems[0]?.estimatedProcessingTime,
      searchedProducts: prev?.searchedProducts ?? [],
      products: prev?.products ?? [],
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
    return { customerName };
  }

  async getState(key: string) {
    return cacheAdapter.getObj<ProductOrderState>(key);
  }

  async setHasAskedForConfirmation(key: string, hasAsked: boolean) {
    const prev = await this.getState(key);
    await cacheAdapter.save<Partial<ProductOrderState>>(key, {
      ...prev,
      hasAskedForConfirmation: hasAsked,
    });
  }

  async saveRouterHistory(
    key: string,
    { agent, action, userMessage, toolName }: HistoryArg,
  ) {
    //
    const newEntry: RoutingHistoryEntry = {
      agent,
      action,
      toolName,
      userMessage: userMessage.substring(0, 100),
      timestamp: Date.now(),
    };
    const prev = (await this.getState(key)) ?? ({} as ProductOrderState);
    const history = prev?.routerHistory ?? [];
    const updatedHistory = [newEntry, ...history].slice(0, MAX_HISTORY_LENGTH);

    await cacheAdapter.save<ProductOrderState>(key, {
      ...prev,
      routerHistory: updatedHistory,
    });
  }

  async getRouterHistory(key: string): Promise<RoutingHistoryEntry[]> {
    const state = (await cacheAdapter.getObj<ProductOrderState>(key))! || [];
    return state?.routerHistory ?? [];
  }

  async resetRouterHistory(key: string) {
    const prev = (await this.getState(key)) ?? ({} as ProductOrderState);
    await cacheAdapter.save<ProductOrderState>(key, {
      ...prev,
      products: [],
      routerHistory: [],
    });
  }
}

export const productOrderStateManager = new ProductOrderStateManager();
