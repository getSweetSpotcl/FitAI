import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";

export type UserPlan = "free" | "premium" | "pro";

interface PlanFeatures {
  aiRoutinesPerDay: number;
  coachingAdvicePerDay: number;
  aiModel: "gpt-3.5-turbo" | "gpt-4o-mini" | "gpt-4o";
  features: string[];
  monthlyCredits: number;
}

export const PLAN_FEATURES: Record<UserPlan, PlanFeatures> = {
  free: {
    aiRoutinesPerDay: 1,
    coachingAdvicePerDay: 5,
    aiModel: "gpt-3.5-turbo",
    monthlyCredits: 50,
    features: [
      "Rutina IA básica",
      "Seguimiento de entrenamientos",
      "Consejos básicos",
      "Acceso a biblioteca de ejercicios",
    ],
  },
  premium: {
    aiRoutinesPerDay: 10,
    coachingAdvicePerDay: 50,
    aiModel: "gpt-4o-mini",
    monthlyCredits: 500,
    features: [
      "Todo lo del plan gratuito",
      "Rutinas IA ilimitadas",
      "Análisis de progreso avanzado",
      "Coaching personalizado",
      "Integración con Apple Health",
      "Exportar datos",
    ],
  },
  pro: {
    aiRoutinesPerDay: -1, // unlimited
    coachingAdvicePerDay: -1, // unlimited
    aiModel: "gpt-4o",
    monthlyCredits: 2000,
    features: [
      "Todo lo de Premium",
      "IA de última generación (GPT-4o)",
      "Planes nutricionales",
      "Análisis biomecánico avanzado",
      "Entrenamientos exclusivos",
      "Consultas con entrenadores",
      "API personalizada",
      "Beta features",
    ],
  },
};

/**
 * Check if user plan has access to a specific feature
 */
export function checkPlanAccess(
  userPlan: UserPlan,
  requiredPlans: UserPlan[]
): boolean {
  return requiredPlans.includes(userPlan);
}

/**
 * Get plan hierarchy level (higher number = better plan)
 */
function getPlanLevel(plan: UserPlan): number {
  switch (plan) {
    case "free":
      return 0;
    case "premium":
      return 1;
    case "pro":
      return 2;
    default:
      return 0;
  }
}

/**
 * Check if user plan meets minimum requirement
 */
export function checkMinimumPlan(
  userPlan: UserPlan,
  minimumPlan: UserPlan
): boolean {
  return getPlanLevel(userPlan) >= getPlanLevel(minimumPlan);
}

/**
 * Middleware to require premium plan (premium or pro)
 */
export function requirePremium() {
  return async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    if (!checkMinimumPlan(user.plan, "premium")) {
      throw new HTTPException(403, {
        message: "Esta función requiere un plan Premium o Pro",
      });
    }

    await next();
  };
}

/**
 * Middleware to require pro plan
 */
export function requirePro() {
  return async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    if (user.plan !== "pro") {
      throw new HTTPException(403, {
        message: "Esta función requiere un plan Pro",
      });
    }

    await next();
  };
}

/**
 * Middleware to check specific feature access
 */
export function requireFeatureAccess(
  requiredPlans: UserPlan[],
  featureName: string
) {
  return async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user) {
      throw new HTTPException(401, { message: "Usuario no autenticado" });
    }

    if (!checkPlanAccess(user.plan, requiredPlans)) {
      const planNames = requiredPlans.join(" o ");
      throw new HTTPException(403, {
        message: `Esta función (${featureName}) requiere un plan ${planNames}`,
      });
    }

    await next();
  };
}

/**
 * Get user's plan features and limits
 */
export function getUserPlanInfo(userPlan: UserPlan) {
  return PLAN_FEATURES[userPlan];
}

/**
 * Check if user has remaining usage for a feature
 */
export function checkDailyUsage(
  userPlan: UserPlan,
  feature: "routines" | "coaching",
  currentUsage: number
): {
  allowed: boolean;
  limit: number;
  remaining: number;
} {
  const planFeatures = PLAN_FEATURES[userPlan];
  let limit: number;

  switch (feature) {
    case "routines":
      limit = planFeatures.aiRoutinesPerDay;
      break;
    case "coaching":
      limit = planFeatures.coachingAdvicePerDay;
      break;
    default:
      limit = 0;
  }

  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      limit: -1,
      remaining: -1,
    };
  }

  return {
    allowed: currentUsage < limit,
    limit,
    remaining: Math.max(0, limit - currentUsage),
  };
}

/**
 * Format plan comparison for upgrade suggestions
 */
export function getUpgradeOptions(currentPlan: UserPlan): {
  available: UserPlan[];
  benefits: Record<UserPlan, string[]>;
} {
  const allPlans: UserPlan[] = ["free", "premium", "pro"];
  const currentLevel = getPlanLevel(currentPlan);
  const available = allPlans.filter(
    (plan) => getPlanLevel(plan) > currentLevel
  );

  const benefits: Record<UserPlan, string[]> = {
    free: [],
    premium: [],
    pro: [],
  };

  available.forEach((plan) => {
    const currentFeatures = PLAN_FEATURES[currentPlan];
    const planFeatures = PLAN_FEATURES[plan];

    const newFeatures = planFeatures.features.filter(
      (feature) => !currentFeatures.features.includes(feature)
    );

    benefits[plan] = newFeatures;
  });

  return { available, benefits };
}
