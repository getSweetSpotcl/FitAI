import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

export interface PlanType {
  id: "free" | "premium" | "pro";
  name: string;
  price: {
    monthly: number;
    annual: number;
  };
  currency: "CLP";
  features: string[];
}

export interface SubscriptionData {
  userId: string;
  planId: string;
  billingCycle: "monthly" | "annual";
  email: string;
  firstName: string;
  lastName: string;
}

export const FITAI_PLANS: Record<string, PlanType> = {
  premium: {
    id: "premium",
    name: "FitAI Premium",
    price: {
      monthly: 7990, // CLP
      annual: 71910, // CLP (25% descuento)
    },
    currency: "CLP",
    features: [
      "10 rutinas IA por mes",
      "50 consejos de entrenamiento",
      "20 análisis de progreso",
      "Exportar datos y reportes",
      "Soporte prioritario",
    ],
  },
  pro: {
    id: "pro",
    name: "FitAI Pro",
    price: {
      monthly: 14990, // CLP
      annual: 134910, // CLP (25% descuento)
    },
    currency: "CLP",
    features: [
      "Rutinas IA ilimitadas",
      "Consejos ilimitados",
      "Análisis avanzado con predicciones",
      "Integración con Apple Watch",
      "API de exportación",
      "Soporte 24/7",
      "Beta features access",
    ],
  },
};

export class MercadoPagoService {
  private client: MercadoPagoConfig;

  constructor(accessToken: string) {
    this.client = new MercadoPagoConfig({
      accessToken,
      options: {
        timeout: 5000,
        idempotencyKey: `fitai-${Date.now()}`,
      },
    });
  }

  /**
   * Crear preferencia de pago para suscripción
   */
  async createSubscriptionPreference(
    subscriptionData: SubscriptionData
  ): Promise<{
    success: boolean;
    preferenceId?: string;
    initPoint?: string;
    error?: string;
  }> {
    try {
      const plan = FITAI_PLANS[subscriptionData.planId];
      if (!plan) {
        return {
          success: false,
          error: "Plan no válido",
        };
      }

      const price =
        subscriptionData.billingCycle === "annual"
          ? plan.price.annual
          : plan.price.monthly;

      const preference = new Preference(this.client);

      const preferenceData = {
        items: [
          {
            id: `${subscriptionData.planId}_${subscriptionData.billingCycle}`,
            title: `${plan.name} - ${subscriptionData.billingCycle === "annual" ? "Plan Anual" : "Plan Mensual"}`,
            description: `Suscripción a ${plan.name} - FitAI`,
            quantity: 1,
            unit_price: price,
            currency_id: "CLP",
          },
        ],
        payer: {
          name: subscriptionData.firstName,
          surname: subscriptionData.lastName,
          email: subscriptionData.email,
        },
        payment_methods: {
          excluded_payment_methods: [],
          excluded_payment_types: [],
          installments: subscriptionData.billingCycle === "annual" ? 1 : 12,
        },
        back_urls: {
          success: "https://fitai.cl/payment/success",
          failure: "https://fitai.cl/payment/failure",
          pending: "https://fitai.cl/payment/pending",
        },
        auto_return: "approved",
        external_reference: `fitai_${subscriptionData.userId}_${subscriptionData.planId}_${subscriptionData.billingCycle}_${Date.now()}`,
        notification_url: "https://api.fitai.cl/api/v1/payments/webhook",
        statement_descriptor: "FITAI",
        expires: false,
      };

      const result = await preference.create({ body: preferenceData });

      return {
        success: true,
        preferenceId: result.id,
        initPoint: result.init_point,
      };
    } catch (error) {
      console.error("Error creating MercadoPago preference:", error);
      return {
        success: false,
        error: "Error al crear preferencia de pago",
      };
    }
  }

  /**
   * Verificar estado de pago
   */
  async getPaymentStatus(paymentId: string): Promise<{
    success: boolean;
    status?: string;
    details?: any;
    error?: string;
  }> {
    try {
      const payment = new Payment(this.client);
      const result = await payment.get({ id: paymentId });

      return {
        success: true,
        status: result.status,
        details: {
          id: result.id,
          status: result.status,
          status_detail: result.status_detail,
          transaction_amount: result.transaction_amount,
          currency_id: result.currency_id,
          date_created: result.date_created,
          date_approved: result.date_approved,
          external_reference: result.external_reference,
          payment_method_id: result.payment_method_id,
          payer_email: result.payer?.email,
        },
      };
    } catch (error) {
      console.error("Error getting payment status:", error);
      return {
        success: false,
        error: "Error al verificar estado del pago",
      };
    }
  }

  /**
   * Procesar webhook de Mercado Pago
   */
  async processWebhook(webhookData: any): Promise<{
    success: boolean;
    action?:
      | "subscription_activated"
      | "subscription_cancelled"
      | "payment_failed";
    userId?: string;
    planId?: string;
    error?: string;
  }> {
    try {
      // MercadoPago sends different types of notifications
      if (!webhookData.type || !webhookData.data) {
        return {
          success: false,
          error: "Invalid webhook data structure",
        };
      }

      // Handle payment notifications
      if (webhookData.type === "payment") {
        const paymentId = webhookData.data.id;
        const paymentStatus = await this.getPaymentStatus(paymentId);

        if (
          !paymentStatus.success ||
          !paymentStatus.details?.external_reference
        ) {
          return {
            success: false,
            error: "Could not retrieve payment details",
          };
        }

        // Parse external reference: fitai_userId_planId_billingCycle_timestamp
        const externalRef = paymentStatus.details.external_reference;
        const refParts = externalRef.split("_");

        if (refParts.length < 4 || refParts[0] !== "fitai") {
          return {
            success: false,
            error: "Invalid external reference format",
          };
        }

        const userId = refParts[1];
        const planId = refParts[2];
        const status = paymentStatus.status;

        let action:
          | "subscription_activated"
          | "subscription_cancelled"
          | "payment_failed";

        switch (status) {
          case "approved":
            action = "subscription_activated";
            break;
          case "rejected":
          case "cancelled":
            action = "payment_failed";
            break;
          default:
            // For pending status, we don't take action yet
            return { success: true };
        }

        return {
          success: true,
          action,
          userId,
          planId,
        };
      }

      // Handle subscription notifications (if using MercadoPago subscriptions)
      if (webhookData.type === "subscription") {
        // Implementation for subscription-specific webhooks
        return {
          success: true,
          // Add subscription handling logic here
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Error processing webhook:", error);
      return {
        success: false,
        error: "Error al procesar webhook",
      };
    }
  }

  /**
   * Calcular precio con descuento anual
   */
  static calculateAnnualDiscount(
    monthlyPrice: number,
    discountPercent: number = 25
  ): number {
    const yearlyPrice = monthlyPrice * 12;
    const discount = yearlyPrice * (discountPercent / 100);
    return Math.round(yearlyPrice - discount);
  }

  /**
   * Formatear precio para Chile
   */
  static formatPrice(price: number): string {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  }
}
