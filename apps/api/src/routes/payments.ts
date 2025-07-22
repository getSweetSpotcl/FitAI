import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { authMiddleware } from '../middleware/auth';
import { MercadoPagoService, SubscriptionData, FITAI_PLANS } from '../lib/mercadopago';
import { createDatabaseClient } from '../db/database';

type Bindings = {
  CACHE: KVNamespace;
  DATABASE_URL: string;
  MERCADOPAGO_ACCESS_TOKEN: string;
};

type Variables = {
  user?: {
    id: string;
    email: string;
    plan: 'free' | 'premium' | 'pro';
  };
};

const payments = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Obtener planes disponibles (sin auth)
payments.get('/plans', async (c) => {
  try {
    const plans = Object.values(FITAI_PLANS).map(plan => ({
      id: plan.id,
      name: plan.name,
      price: {
        monthly: MercadoPagoService.formatPrice(plan.price.monthly),
        annual: MercadoPagoService.formatPrice(plan.price.annual),
        monthlyRaw: plan.price.monthly,
        annualRaw: plan.price.annual,
        savings: MercadoPagoService.formatPrice(plan.price.monthly * 12 - plan.price.annual),
      },
      currency: plan.currency,
      features: plan.features,
    }));

    return c.json({
      success: true,
      data: plans,
    });

  } catch (error) {
    console.error('Get plans error:', error);
    throw new HTTPException(500, { message: 'Error al obtener planes' });
  }
});

// Crear suscripción (requiere auth)
payments.post('/create-subscription', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'Usuario no autenticado' });
    }

    const { planId, billingCycle, firstName, lastName } = await c.req.json();

    // Validar datos
    if (!planId || !billingCycle || !firstName || !lastName) {
      throw new HTTPException(400, { 
        message: 'Faltan datos requeridos: planId, billingCycle, firstName, lastName' 
      });
    }

    if (!FITAI_PLANS[planId]) {
      throw new HTTPException(400, { message: 'Plan no válido' });
    }

    if (!['monthly', 'annual'].includes(billingCycle)) {
      throw new HTTPException(400, { message: 'Ciclo de facturación no válido' });
    }

    // Verificar que el usuario no tenga ya una suscripción activa
    if (user.plan !== 'free') {
      throw new HTTPException(400, { 
        message: 'Ya tienes una suscripción activa. Cancela primero tu plan actual.' 
      });
    }

    const subscriptionData: SubscriptionData = {
      userId: user.id,
      planId,
      billingCycle,
      email: user.email,
      firstName,
      lastName,
    };

    const mercadoPagoService = new MercadoPagoService(c.env.MERCADOPAGO_ACCESS_TOKEN);
    const preference = await mercadoPagoService.createSubscriptionPreference(subscriptionData);

    if (!preference.success) {
      throw new HTTPException(400, { message: preference.error });
    }

    // Guardar intención de suscripción en BD
    const sql = createDatabaseClient(c.env.DATABASE_URL);
    await sql`
      INSERT INTO subscription_intents (
        id, user_id, plan_id, billing_cycle, 
        preference_id, status, created_at
      ) VALUES (
        ${`intent_${Date.now()}${Math.random().toString(36).substr(2, 5)}`},
        ${user.id}, ${planId}, ${billingCycle},
        ${preference.preferenceId}, 'pending', NOW()
      )
    `;

    return c.json({
      success: true,
      data: {
        preferenceId: preference.preferenceId,
        initPoint: preference.initPoint,
        planName: FITAI_PLANS[planId].name,
        price: billingCycle === 'annual' 
          ? FITAI_PLANS[planId].price.annual 
          : FITAI_PLANS[planId].price.monthly,
        billingCycle,
      },
      message: 'Preferencia de pago creada exitosamente',
    });

  } catch (error) {
    console.error('Create subscription error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error al crear suscripción' });
  }
});

// Webhook de Mercado Pago
payments.post('/webhook', async (c) => {
  try {
    const webhookData = await c.req.json();
    
    console.log('MercadoPago Webhook received:', JSON.stringify(webhookData, null, 2));

    const mercadoPagoService = new MercadoPagoService(c.env.MERCADOPAGO_ACCESS_TOKEN);
    const webhookResult = await mercadoPagoService.processWebhook(webhookData);

    if (!webhookResult.success) {
      console.error('Webhook processing failed:', webhookResult.error);
      return c.json({ status: 'error' }, 400);
    }

    if (webhookResult.action && webhookResult.userId && webhookResult.planId) {
      const sql = createDatabaseClient(c.env.DATABASE_URL);

      switch (webhookResult.action) {
        case 'subscription_activated':
          // Actualizar plan del usuario
          await sql`
            UPDATE users 
            SET plan = ${webhookResult.planId}, updated_at = NOW()
            WHERE id = ${webhookResult.userId}
          `;

          // Crear registro de suscripción
          await sql`
            INSERT INTO payment_subscriptions (
              id, user_id, plan_id, status, amount, billing_cycle,
              started_at, created_at
            ) VALUES (
              ${`sub_${Date.now()}${Math.random().toString(36).substr(2, 5)}`},
              ${webhookResult.userId}, ${webhookResult.planId}, 'active', 
              ${FITAI_PLANS[webhookResult.planId].price.monthly}, 'monthly',
              NOW(), NOW()
            )
          `;

          console.log(`Subscription activated for user ${webhookResult.userId}, plan ${webhookResult.planId}`);
          break;

        case 'payment_failed':
          // Actualizar intent como fallido
          await sql`
            UPDATE subscription_intents 
            SET status = 'failed', updated_at = NOW()
            WHERE user_id = ${webhookResult.userId}
              AND status = 'pending'
          `;

          console.log(`Payment failed for user ${webhookResult.userId}`);
          break;
      }
    }

    return c.json({ status: 'ok' });

  } catch (error) {
    console.error('Webhook error:', error);
    return c.json({ status: 'error' }, 500);
  }
});

// Verificar estado de pago
payments.get('/payment-status/:paymentId', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'Usuario no autenticado' });
    }

    const paymentId = c.req.param('paymentId');
    
    const mercadoPagoService = new MercadoPagoService(c.env.MERCADOPAGO_ACCESS_TOKEN);
    const paymentStatus = await mercadoPagoService.getPaymentStatus(paymentId);

    if (!paymentStatus.success) {
      throw new HTTPException(400, { message: paymentStatus.error });
    }

    return c.json({
      success: true,
      data: paymentStatus.details,
    });

  } catch (error) {
    console.error('Get payment status error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error al verificar estado del pago' });
  }
});

// Obtener suscripción actual del usuario
payments.get('/subscription', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'Usuario no autenticado' });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);
    
    const subscriptions = await sql`
      SELECT * 
      FROM payment_subscriptions
      WHERE user_id = ${user.id} 
        AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const currentPlan = FITAI_PLANS[user.plan] || {
      id: 'free',
      name: 'Plan Gratuito',
      features: [
        '1 rutina IA por mes',
        '5 consejos de entrenamiento',
        '2 análisis de progreso',
        'Funciones básicas',
      ],
    };

    return c.json({
      success: true,
      data: {
        currentPlan: user.plan,
        planDetails: currentPlan,
        subscription: subscriptions[0] || null,
        canUpgrade: user.plan === 'free' || user.plan === 'premium',
      },
    });

  } catch (error) {
    console.error('Get subscription error:', error);
    throw new HTTPException(500, { message: 'Error al obtener suscripción' });
  }
});

// Cancelar suscripción
payments.post('/cancel-subscription', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'Usuario no autenticado' });
    }

    if (user.plan === 'free') {
      throw new HTTPException(400, { message: 'No tienes una suscripción activa' });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);

    // Marcar suscripción como cancelada
    await sql`
      UPDATE payment_subscriptions 
      SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
      WHERE user_id = ${user.id} AND status = 'active'
    `;

    // Actualizar plan del usuario a free
    await sql`
      UPDATE users 
      SET plan = 'free', updated_at = NOW()
      WHERE id = ${user.id}
    `;

    return c.json({
      success: true,
      message: 'Suscripción cancelada exitosamente. Mantienes el acceso hasta el final del período actual.',
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    throw new HTTPException(500, { message: 'Error al cancelar suscripción' });
  }
});

export default payments;