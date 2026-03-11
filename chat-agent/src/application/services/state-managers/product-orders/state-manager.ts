import {
  CustomerSignals,
  MainOptions,
  FMStatus,
  BookingStatuses,
} from "@/domain/booking";
import { Product, SpecializedDomain } from "@/infraestructure/adapters/cms";
import { stateMessages } from "./messages";
import { ProductOrderState } from "@/domain/orders";
import { QuadrantPoint } from "@/infraestructure/adapters/vector-store";
import { cacheAdapter } from "@/infraestructure/adapters/cache";
import { ragService } from "../../rag";

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
  //

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
    product: { name: string; quantity: number; notes?: string },
  ) {
    const prev = await this.getState(key);

    const searchedProducts = prev?.searchedProducts ?? [];

    const productExists = searchedProducts.find(
      (p) => p.payload.name === product.name,
    );

    if (!productExists) {
      const { points } = await ragService.searchProducts(
        product.name,
        businessId,
        1,
      );
      const productFound = points[0];
      const payload = {
        productId: productFound.payload.id!,
        productName: productFound.payload.name!,
        quantity: product.quantity,
        observations: product.notes,
      };
      await cacheAdapter.save<Partial<ProductOrderState>>(key, {
        ...prev,
        products: [...(prev?.products ?? []), payload],
      });
    } //
    else {
      const payload = {
        productId: productExists.payload.id!,
        productName: product.name,
        quantity: product.quantity,
        observations: product.notes,
      };
      await cacheAdapter.save<Partial<ProductOrderState>>(key, {
        ...prev,
        products: [...(prev?.products ?? []), payload],
      });
    }
  }

  async getState(key: string) {
    return cacheAdapter.getObj<Partial<ProductOrderState>>(key);
  }
}

export const productOrderStateManager = new ProductOrderStateManager();
