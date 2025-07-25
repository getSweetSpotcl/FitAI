import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { createDatabaseClient } from "../db/database";
import {
  FITAI_PLANS,
  MercadoPagoService,
  type SubscriptionData,
} from "../lib/mercadopago";
import { clerkAuth } from "../middleware/clerk-auth";

type Bindings = {
  CACHE: KVNamespace;
  DATABASE_URL: string;
  MERCADOPAGO_ACCESS_TOKEN: string;
};

type Variables = {
  user?: {
    id: string;
    email: string;
    plan: "free" | "premium" | "pro";
  };
};

const payments = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Obtener planes disponibles (sin auth)
payments.get("/plans", async (c) => {
  try {
    const plans = Object.values(FITAI_PLANS).map((plan) => ({
      id: plan.id,
      name: plan.name,
      price: {
        monthly: MercadoPagoService.formatPrice(plan.price.monthly),
        annual: MercadoPagoService.formatPrice(plan.price.annual),
        monthlyRaw: plan.price.monthly,
        annualRaw: plan.price.annual,
        savings: MercadoPagoService.formatPrice(
          plan.price.monthly * 12 - plan.price.annual
        ),
      },
      currency: plan.currency,
      features: plan.features,
    }));

    return c.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error("Get plans error:", error);
    throw new HTTPException(500, { message: "Error al obtener planes" });
  }
});

// Crear suscripción (requiere auth)
payments.post("/create-subscription", clerkAuth(), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const { planId, billingCycle, firstName, lastName } = await c.req.json();

    // Validar datos
    if (!planId || !billingCycle || !firstName || !lastName) {
      throw new HTTPException(400, {
        message:
          "Faltan datos requeridos: planId, billingCycle, firstName, lastName",
      });
    }

    if (!FITAI_PLANS[planId]) {
      throw new HTTPException(400, { message: "Plan no válido" });
    }

    if (!["monthly", "annual"].includes(billingCycle)) {
      throw new HTTPException(400, {
        message: "Ciclo de facturación no válido",
      });
    }

    // Verificar que el usuario no tenga ya una suscripción activa
    if (user.plan !== "free") {
      throw new HTTPException(400, {
        message:
          "Ya tienes una suscripción activa. Cancela primero tu plan actual.",
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

    const mercadoPagoService = new MercadoPagoService(
      c.env.MERCADOPAGO_ACCESS_TOKEN
    );
    const preference =
      await mercadoPagoService.createSubscriptionPreference(subscriptionData);

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
        price:
          billingCycle === "annual"
            ? FITAI_PLANS[planId].price.annual
            : FITAI_PLANS[planId].price.monthly,
        billingCycle,
      },
      message: "Preferencia de pago creada exitosamente",
    });
  } catch (error) {
    console.error("Create subscription error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error al crear suscripción" });
  }
});

// Webhook de Mercado Pago
payments.post("/webhook", async (c) => {
  try {
    const webhookData = await c.req.json();

    console.log(
      "MercadoPago Webhook received:",
      JSON.stringify(webhookData, null, 2)
    );

    const mercadoPagoService = new MercadoPagoService(
      c.env.MERCADOPAGO_ACCESS_TOKEN
    );
    const webhookResult = await mercadoPagoService.processWebhook(webhookData);

    if (!webhookResult.success) {
      console.error("Webhook processing failed:", webhookResult.error);
      return c.json({ status: "error" }, 400);
    }

    if (webhookResult.action && webhookResult.userId && webhookResult.planId) {
      const sql = createDatabaseClient(c.env.DATABASE_URL);

      switch (webhookResult.action) {
        case "subscription_activated":
          await handleSubscriptionActivation(sql, webhookResult);
          break;

        case "subscription_renewed":
          await handleSubscriptionRenewal(sql, webhookResult);
          break;

        case "subscription_cancelled":
          await handleSubscriptionCancellation(sql, webhookResult);
          break;

        case "payment_failed":
          await handlePaymentFailure(sql, webhookResult);
          break;

        default:
          console.log(`Unhandled webhook action: ${webhookResult.action}`);
      }
    }

    return c.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    return c.json({ status: "error" }, 500);
  }
});

// Verificar estado de pago
payments.get("/payment-status/:paymentId", clerkAuth(), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const paymentId = c.req.param("paymentId");

    const mercadoPagoService = new MercadoPagoService(
      c.env.MERCADOPAGO_ACCESS_TOKEN
    );
    const paymentStatus = await mercadoPagoService.getPaymentStatus(paymentId);

    if (!paymentStatus.success) {
      throw new HTTPException(400, { message: paymentStatus.error });
    }

    return c.json({
      success: true,
      data: paymentStatus.details,
    });
  } catch (error) {
    console.error("Get payment status error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: "Error al verificar estado del pago",
    });
  }
});

// Obtener suscripción actual del usuario
payments.get("/subscription", clerkAuth(), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
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
      id: "free",
      name: "Plan Gratuito",
      features: [
        "1 rutina IA por mes",
        "5 consejos de entrenamiento",
        "2 análisis de progreso",
        "Funciones básicas",
      ],
    };

    return c.json({
      success: true,
      data: {
        currentPlan: user.plan,
        planDetails: currentPlan,
        subscription: subscriptions[0] || null,
        canUpgrade: user.plan === "free" || user.plan === "premium",
      },
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    throw new HTTPException(500, { message: "Error al obtener suscripción" });
  }
});

// Cancelar suscripción
payments.post("/cancel-subscription", clerkAuth(), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    if (user.plan === "free") {
      throw new HTTPException(400, {
        message: "No tienes una suscripción activa",
      });
    }

    const { cancelImmediately = false, reason } = await c.req.json();

    const sql = createDatabaseClient(c.env.DATABASE_URL);

    // Obtener suscripción actual
    const currentSubscription = await sql`
      SELECT * FROM payment_subscriptions 
      WHERE user_id = ${user.id} AND status = 'active'
      LIMIT 1
    `;

    if ((currentSubscription as any[]).length === 0) {
      throw new HTTPException(400, { message: "No se encontró suscripción activa" });
    }

    const subscription = (currentSubscription as any[])[0];

    if (cancelImmediately) {
      // Cancelación inmediata
      await sql`
        UPDATE payment_subscriptions 
        SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW(),
            cancellation_reason = ${reason || 'user_request'}
        WHERE user_id = ${user.id} AND status = 'active'
      `;

      await sql`
        UPDATE users 
        SET plan = 'free', updated_at = NOW()
        WHERE id = ${user.id}
      `;

      return c.json({
        success: true,
        message: "Suscripción cancelada inmediatamente.",
        effectiveDate: new Date().toISOString(),
      });
    } else {
      // Cancelación al final del período
      const nextBillingDate = calculateNextBillingDate(subscription);
      
      await sql`
        UPDATE payment_subscriptions 
        SET status = 'scheduled_for_cancellation', 
            scheduled_cancellation_date = ${nextBillingDate.toISOString()},
            cancellation_reason = ${reason || 'user_request'},
            updated_at = NOW()
        WHERE user_id = ${user.id} AND status = 'active'
      `;

      return c.json({
        success: true,
        message: "Suscripción programada para cancelación. Mantienes el acceso hasta el final del período actual.",
        effectiveDate: nextBillingDate.toISOString(),
      });
    }
  } catch (error) {
    console.error("Cancel subscription error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error al cancelar suscripción" });
  }
});

// Actualizar suscripción (upgrade/downgrade)
payments.post("/update-subscription", clerkAuth(), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    if (user.plan === "free") {
      throw new HTTPException(400, {
        message: "No tienes una suscripción activa para actualizar",
      });
    }

    const { newPlanId, billingCycle, firstName, lastName } = await c.req.json();

    if (!newPlanId || !FITAI_PLANS[newPlanId]) {
      throw new HTTPException(400, { message: "Plan no válido" });
    }

    if (newPlanId === user.plan) {
      throw new HTTPException(400, { message: "Ya tienes este plan activo" });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);

    // Obtener suscripción actual
    const currentSubscription = await sql`
      SELECT * FROM payment_subscriptions 
      WHERE user_id = ${user.id} AND status = 'active'
      LIMIT 1
    `;

    if ((currentSubscription as any[]).length === 0) {
      throw new HTTPException(400, { message: "No se encontró suscripción activa" });
    }

    const isUpgrade = getPlanTier(newPlanId) > getPlanTier(user.plan);
    
    if (isUpgrade) {
      // Para upgrades, crear nueva suscripción inmediatamente
      const subscriptionData = {
        userId: user.id,
        planId: newPlanId,
        billingCycle: billingCycle || 'monthly',
        email: user.email,
        firstName: firstName || '',
        lastName: lastName || '',
      };

      const mercadoPagoService = new MercadoPagoService(c.env.MERCADOPAGO_ACCESS_TOKEN);
      const preference = await mercadoPagoService.createSubscriptionPreference(subscriptionData);

      if (!preference.success) {
        throw new HTTPException(400, { message: preference.error });
      }

      // Cancelar suscripción actual y crear intent para la nueva
      await sql`
        UPDATE payment_subscriptions 
        SET status = 'upgrading', updated_at = NOW()
        WHERE user_id = ${user.id} AND status = 'active'
      `;

      await sql`
        INSERT INTO subscription_intents (
          id, user_id, plan_id, billing_cycle, 
          preference_id, status, intent_type, created_at
        ) VALUES (
          ${`upgrade_${Date.now()}${Math.random().toString(36).substr(2, 5)}`},
          ${user.id}, ${newPlanId}, ${billingCycle || 'monthly'},
          ${preference.preferenceId}, 'pending', 'upgrade', NOW()
        )
      `;

      return c.json({
        success: true,
        data: {
          preferenceId: preference.preferenceId,
          initPoint: preference.initPoint,
          changeType: 'upgrade',
          effectiveDate: 'immediate',
        },
        message: "Upgrade procesado. Complete el pago para activar el nuevo plan.",
      });

    } else {
      // Para downgrades, programar para el próximo ciclo de facturación
      const nextBillingDate = calculateNextBillingDate(currentSubscription[0]);
      
      await sql`
        UPDATE payment_subscriptions 
        SET scheduled_plan_change = ${newPlanId},
            scheduled_plan_change_date = ${nextBillingDate.toISOString()},
            updated_at = NOW()
        WHERE user_id = ${user.id} AND status = 'active'
      `;

      return c.json({
        success: true,
        data: {
          changeType: 'downgrade',
          effectiveDate: nextBillingDate.toISOString(),
          newPlan: FITAI_PLANS[newPlanId].name,
        },
        message: `Downgrade programado para ${nextBillingDate.toLocaleDateString()}. Mantienes el plan actual hasta entonces.`,
      });
    }

  } catch (error) {
    console.error("Update subscription error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error al actualizar suscripción" });
  }
});

// Reanudar suscripción cancelada
payments.post("/resume-subscription", clerkAuth(), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);

    // Buscar suscripción programada para cancelación
    const scheduledCancellation = await sql`
      SELECT * FROM payment_subscriptions 
      WHERE user_id = ${user.id} 
        AND status = 'scheduled_for_cancellation'
      LIMIT 1
    `;

    if ((scheduledCancellation as any[]).length === 0) {
      throw new HTTPException(400, { 
        message: "No hay suscripción programada para cancelación" 
      });
    }

    // Reanudar suscripción
    await sql`
      UPDATE payment_subscriptions 
      SET status = 'active', 
          scheduled_cancellation_date = NULL,
          cancellation_reason = NULL,
          updated_at = NOW()
      WHERE user_id = ${user.id} AND status = 'scheduled_for_cancellation'
    `;

    return c.json({
      success: true,
      message: "Suscripción reanudada exitosamente. Tu plan continúa activo.",
    });

  } catch (error) {
    console.error("Resume subscription error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Error al reanudar suscripción" });
  }
});

// Helper functions for webhook processing

async function handleSubscriptionActivation(sql: any, webhookResult: any) {
  console.log(`Processing subscription activation for user ${webhookResult.userId}, plan ${webhookResult.planId}`);

  // Actualizar plan del usuario
  await sql`
    UPDATE users 
    SET subscription_plan = ${webhookResult.planId}, updated_at = NOW()
    WHERE id = ${webhookResult.userId}
  `;

  // Verificar si es un upgrade de suscripción existente
  const existingSubscription = await sql`
    SELECT * FROM payment_subscriptions 
    WHERE user_id = ${webhookResult.userId} 
      AND status IN ('active', 'upgrading')
    LIMIT 1
  `;

  if ((existingSubscription as any[]).length > 0) {
    // Cancelar suscripción anterior
    await sql`
      UPDATE payment_subscriptions 
      SET status = 'replaced', updated_at = NOW()
      WHERE user_id = ${webhookResult.userId} 
        AND status IN ('active', 'upgrading')
    `;
  }

  // Crear nuevo registro de suscripción
  const planDetails = FITAI_PLANS[webhookResult.planId];
  const billingCycle = webhookResult.billingCycle || 'monthly';
  const amount = billingCycle === 'annual' ? planDetails.price.annual : planDetails.price.monthly;

  await sql`
    INSERT INTO payment_subscriptions (
      id, user_id, plan_id, status, amount, billing_cycle,
      started_at, next_billing_date, created_at
    ) VALUES (
      ${`sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`},
      ${webhookResult.userId}, ${webhookResult.planId}, 'active', 
      ${amount}, ${billingCycle},
      NOW(), ${calculateNextBillingDate({ billing_cycle: billingCycle, started_at: new Date() }).toISOString()}, NOW()
    )
  `;

  // Actualizar subscription intent como completado
  await sql`
    UPDATE subscription_intents 
    SET status = 'completed', updated_at = NOW()
    WHERE user_id = ${webhookResult.userId} 
      AND status = 'pending'
  `;

  console.log(`Subscription activated successfully for user ${webhookResult.userId}`);
}

async function handleSubscriptionRenewal(sql: any, webhookResult: any) {
  console.log(`Processing subscription renewal for user ${webhookResult.userId}`);

  // Actualizar next_billing_date
  const currentSubscription = await sql`
    SELECT * FROM payment_subscriptions 
    WHERE user_id = ${webhookResult.userId} AND status = 'active'
    LIMIT 1
  `;

  if ((currentSubscription as any[]).length > 0) {
    const subscription = (currentSubscription as any[])[0];
    const nextBillingDate = calculateNextBillingDate(subscription);

    await sql`
      UPDATE payment_subscriptions 
      SET next_billing_date = ${nextBillingDate.toISOString()},
          last_payment_date = NOW(),
          updated_at = NOW()
      WHERE user_id = ${webhookResult.userId} AND status = 'active'
    `;

    // Crear registro de transacción
    await sql`
      INSERT INTO payment_transactions (
        id, subscription_id, user_id, amount, status, transaction_type,
        mercadopago_payment_id, created_at
      ) VALUES (
        ${`txn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`},
        ${subscription.id}, ${webhookResult.userId}, ${subscription.amount},
        'completed', 'renewal', ${webhookResult.paymentId || null}, NOW()
      )
    `;

    console.log(`Subscription renewed successfully for user ${webhookResult.userId}`);
  }
}

async function handleSubscriptionCancellation(sql: any, webhookResult: any) {
  console.log(`Processing subscription cancellation for user ${webhookResult.userId}`);

  // Actualizar suscripción como cancelada
  await sql`
    UPDATE payment_subscriptions 
    SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
    WHERE user_id = ${webhookResult.userId} AND status = 'active'
  `;

  // Actualizar plan del usuario a free
  await sql`
    UPDATE users 
    SET subscription_plan = 'free', updated_at = NOW()
    WHERE id = ${webhookResult.userId}
  `;

  console.log(`Subscription cancelled for user ${webhookResult.userId}`);
}

async function handlePaymentFailure(sql: any, webhookResult: any) {
  console.log(`Processing payment failure for user ${webhookResult.userId}`);

  // Actualizar subscription intent como fallido
  await sql`
    UPDATE subscription_intents 
    SET status = 'failed', updated_at = NOW()
    WHERE user_id = ${webhookResult.userId} AND status = 'pending'
  `;

  // Marcar suscripción como teniendo problemas de pago
  await sql`
    UPDATE payment_subscriptions 
    SET payment_failed_count = COALESCE(payment_failed_count, 0) + 1,
        last_payment_failure = NOW(),
        updated_at = NOW()
    WHERE user_id = ${webhookResult.userId} AND status = 'active'
  `;

  // Si han fallado 3 pagos, suspender la suscripción
  const failedPayments = await sql`
    SELECT payment_failed_count FROM payment_subscriptions 
    WHERE user_id = ${webhookResult.userId} AND status = 'active'
    LIMIT 1
  `;

  if ((failedPayments as any[]).length > 0 && (failedPayments as any[])[0].payment_failed_count >= 3) {
    await sql`
      UPDATE payment_subscriptions 
      SET status = 'suspended', suspended_at = NOW(), updated_at = NOW()
      WHERE user_id = ${webhookResult.userId} AND status = 'active'
    `;

    await sql`
      UPDATE users 
      SET subscription_plan = 'free', updated_at = NOW()
      WHERE id = ${webhookResult.userId}
    `;

    console.log(`Subscription suspended due to multiple payment failures for user ${webhookResult.userId}`);
  }
}

// Utility functions

function calculateNextBillingDate(subscription: any): Date {
  const startDate = new Date(subscription.started_at || subscription.next_billing_date || Date.now());
  const billingCycle = subscription.billing_cycle || 'monthly';

  if (billingCycle === 'annual') {
    startDate.setFullYear(startDate.getFullYear() + 1);
  } else {
    startDate.setMonth(startDate.getMonth() + 1);
  }

  return startDate;
}

function getPlanTier(planId: string): number {
  const tiers = {
    'free': 0,
    'premium': 1,
    'pro': 2
  };
  return tiers[planId as keyof typeof tiers] || 0;
}

export default payments;
