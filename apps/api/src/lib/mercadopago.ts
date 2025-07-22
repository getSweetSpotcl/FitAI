// import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

// Temporary types until mercadopago is installed
type MercadoPagoConfig = any;
type Preference = any;  
type Payment = any;

export interface PlanType {
  id: 'free' | 'premium' | 'pro';
  name: string;
  price: {
    monthly: number;
    annual: number;
  };
  currency: 'CLP';
  features: string[];
}

export interface SubscriptionData {
  userId: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  email: string;
  firstName: string;
  lastName: string;
}

export const FITAI_PLANS: Record<string, PlanType> = {
  premium: {
    id: 'premium',
    name: 'FitAI Premium',
    price: {
      monthly: 7990, // CLP
      annual: 71910, // CLP (25% descuento)
    },
    currency: 'CLP',
    features: [
      '10 rutinas IA por mes',
      '50 consejos de entrenamiento',
      '20 análisis de progreso',
      'Exportar datos y reportes',
      'Soporte prioritario',
    ],
  },
  pro: {
    id: 'pro',
    name: 'FitAI Pro',
    price: {
      monthly: 14990, // CLP
      annual: 134910, // CLP (25% descuento)
    },
    currency: 'CLP',
    features: [
      'Rutinas IA ilimitadas',
      'Consejos ilimitados',
      'Análisis avanzado con predicciones',
      'Integración con Apple Watch',
      'API de exportación',
      'Soporte 24/7',
      'Beta features access',
    ],
  },
};

export class MercadoPagoService {
  private client: MercadoPagoConfig;

  constructor(accessToken: string) {
    // TODO: Install mercadopago package and uncomment
    // this.client = new MercadoPagoConfig({
    //   accessToken,
    //   options: {
    //     timeout: 5000,
    //     idempotencyKey: 'fitai-' + Date.now(),
    //   },
    // });
    console.warn('MercadoPago not configured - install mercadopago package');
  }

  /**
   * Crear preferencia de pago para suscripción
   */
  async createSubscriptionPreference(subscriptionData: SubscriptionData): Promise<{
    success: boolean;
    preferenceId?: string;
    initPoint?: string;
    error?: string;
  }> {
    // TODO: Uncomment when mercadopago package is installed
    return {
      success: false,
      error: 'MercadoPago not configured - install mercadopago package first'
    };
    
    /* 
    try {
      const plan = FITAI_PLANS[subscriptionData.planId];
      if (!plan) {
        return {
          success: false,
          error: 'Plan no válido',
        };
      }

      const price = subscriptionData.billingCycle === 'annual' 
        ? plan.price.annual 
        : plan.price.monthly;

      const preference = new Preference(this.client);

      // ... rest of implementation
    } catch (error) {
      console.error('Error creating MercadoPago preference:', error);
      return {
        success: false,
        error: 'Error al crear preferencia de pago',
      };
    }
    */
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
    // TODO: Uncomment when mercadopago package is installed
    return {
      success: false,
      error: 'MercadoPago not configured - install mercadopago package first'
    };
  }

  /**
   * Procesar webhook de Mercado Pago
   */
  async processWebhook(webhookData: any): Promise<{
    success: boolean;
    action?: 'subscription_activated' | 'subscription_cancelled' | 'payment_failed';
    userId?: string;
    planId?: string;
    error?: string;
  }> {
    // TODO: Uncomment when mercadopago package is installed
    return {
      success: false,
      error: 'MercadoPago not configured - install mercadopago package first'
    };
  }

  /**
   * Calcular precio con descuento anual
   */
  static calculateAnnualDiscount(monthlyPrice: number, discountPercent: number = 25): number {
    const yearlyPrice = monthlyPrice * 12;
    const discount = yearlyPrice * (discountPercent / 100);
    return Math.round(yearlyPrice - discount);
  }

  /**
   * Formatear precio para Chile
   */
  static formatPrice(price: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  }
}