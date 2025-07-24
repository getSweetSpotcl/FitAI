import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";

// Validation rules
export interface ValidationRule {
  type:
    | "string"
    | "number"
    | "boolean"
    | "array"
    | "object"
    | "date"
    | "email"
    | "uuid";
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
}

export interface ValidationSchema {
  [key: string]: ValidationRule | ValidationSchema;
}

// Common patterns
export const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  phone: /^\+?[1-9]\d{1,14}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
};

// Sanitization functions
export const sanitize = {
  string: (value: any): string => {
    if (typeof value !== "string") return "";
    // Remove control characters and trim
    return value.replace(/[\x00-\x1F\x7F]/g, "").trim();
  },

  email: (value: any): string => {
    return sanitize.string(value).toLowerCase();
  },

  html: (value: any): string => {
    if (typeof value !== "string") return "";
    // Basic HTML entity encoding
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  },

  sql: (value: any): string => {
    if (typeof value !== "string") return "";
    // Basic SQL injection prevention
    return value.replace(/['";\\]/g, "");
  },

  number: (value: any): number | null => {
    const num = parseFloat(value);
    return Number.isNaN(num) ? null : num;
  },

  boolean: (value: any): boolean => {
    return value === true || value === "true" || value === "1" || value === 1;
  },

  array: (value: any): any[] => {
    return Array.isArray(value) ? value : [];
  },

  object: (value: any): object => {
    return typeof value === "object" && value !== null ? value : {};
  },
};

// Validation function
export function validate(
  data: any,
  schema: ValidationSchema,
  path: string = ""
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  function validateField(
    value: any,
    rule: ValidationRule,
    fieldPath: string
  ): void {
    // Check required
    if (
      rule.required &&
      (value === undefined || value === null || value === "")
    ) {
      errors.push(`${fieldPath} es requerido`);
      return;
    }

    // Skip validation if value is not required and not provided
    if (!rule.required && (value === undefined || value === null)) {
      return;
    }

    // Type validation
    switch (rule.type) {
      case "string":
        if (typeof value !== "string") {
          errors.push(`${fieldPath} debe ser un string`);
          return;
        }
        if (rule.min && value.length < rule.min) {
          errors.push(
            `${fieldPath} debe tener al menos ${rule.min} caracteres`
          );
        }
        if (rule.max && value.length > rule.max) {
          errors.push(`${fieldPath} debe tener máximo ${rule.max} caracteres`);
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push(`${fieldPath} tiene un formato inválido`);
        }
        break;

      case "number":
        if (typeof value !== "number" || Number.isNaN(value)) {
          errors.push(`${fieldPath} debe ser un número`);
          return;
        }
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`${fieldPath} debe ser mayor o igual a ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`${fieldPath} debe ser menor o igual a ${rule.max}`);
        }
        break;

      case "boolean":
        if (typeof value !== "boolean") {
          errors.push(`${fieldPath} debe ser un booleano`);
        }
        break;

      case "array":
        if (!Array.isArray(value)) {
          errors.push(`${fieldPath} debe ser un array`);
          return;
        }
        if (rule.min && value.length < rule.min) {
          errors.push(`${fieldPath} debe tener al menos ${rule.min} elementos`);
        }
        if (rule.max && value.length > rule.max) {
          errors.push(`${fieldPath} debe tener máximo ${rule.max} elementos`);
        }
        break;

      case "object":
        if (
          typeof value !== "object" ||
          value === null ||
          Array.isArray(value)
        ) {
          errors.push(`${fieldPath} debe ser un objeto`);
        }
        break;

      case "date": {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
          errors.push(`${fieldPath} debe ser una fecha válida`);
        }
        break;
      }

      case "email":
        if (!PATTERNS.email.test(value)) {
          errors.push(`${fieldPath} debe ser un email válido`);
        }
        break;

      case "uuid":
        if (!PATTERNS.uuid.test(value)) {
          errors.push(`${fieldPath} debe ser un UUID válido`);
        }
        break;
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push(`${fieldPath} debe ser uno de: ${rule.enum.join(", ")}`);
    }

    // Custom validation
    if (rule.custom) {
      const result = rule.custom(value);
      if (typeof result === "string") {
        errors.push(result);
      } else if (!result) {
        errors.push(`${fieldPath} es inválido`);
      }
    }
  }

  function validateObject(
    obj: any,
    schema: ValidationSchema,
    currentPath: string
  ): void {
    for (const [key, rule] of Object.entries(schema)) {
      const fieldPath = currentPath ? `${currentPath}.${key}` : key;
      const value = obj?.[key];

      if ("type" in rule) {
        // It's a validation rule
        validateField(value, rule as ValidationRule, fieldPath);
      } else {
        // It's a nested schema
        if (value && typeof value === "object") {
          validateObject(value, rule as ValidationSchema, fieldPath);
        } else if ((rule as any).required) {
          errors.push(`${fieldPath} es requerido`);
        }
      }
    }
  }

  validateObject(data, schema, path);

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Validation middleware
export function validationMiddleware(
  schema: ValidationSchema,
  target: "body" | "query" | "params" = "body"
) {
  return async (c: Context, next: Next) => {
    let data: any;

    switch (target) {
      case "body":
        try {
          data = await c.req.json();
        } catch {
          throw new HTTPException(400, {
            message: "Invalid JSON body",
          });
        }
        break;
      case "query":
        data = Object.fromEntries(new URL(c.req.url).searchParams);
        break;
      case "params":
        data = c.req.param();
        break;
    }

    const { valid, errors } = validate(data, schema);

    if (!valid) {
      const logger = c.get("logger");
      logger?.warn("Validation failed", {
        path: c.req.path,
        method: c.req.method,
        errors,
        metadata: { target },
      });

      throw new HTTPException(400, {
        message: "Datos inválidos",
        res: c.json(
          {
            success: false,
            error: "VALIDATION_ERROR",
            message: "Datos inválidos",
            errors,
          },
          400
        ),
      });
    }

    // Store validated and sanitized data
    c.set("validatedData", data);

    await next();
  };
}

// Common validation schemas
export const schemas = {
  // User registration
  register: {
    email: { type: "email" as const, required: true },
    password: { type: "string" as const, required: true, min: 8, max: 100 },
    name: { type: "string" as const, required: true, min: 2, max: 100 },
  },

  // User profile update
  updateProfile: {
    name: { type: "string" as const, min: 2, max: 100 },
    profile: {
      goals: { type: "array" as const, max: 5 },
      experienceLevel: {
        type: "string" as const,
        enum: ["beginner", "intermediate", "advanced"],
      },
      availableDays: { type: "number" as const, min: 1, max: 7 },
      height: { type: "number" as const, min: 50, max: 300 },
      weight: { type: "number" as const, min: 20, max: 500 },
      age: { type: "number" as const, min: 13, max: 120 },
    },
  },

  // Generate routine
  generateRoutine: {
    goals: { type: "array" as const, required: true, min: 1, max: 5 },
    experienceLevel: {
      type: "string" as const,
      required: true,
      enum: ["beginner", "intermediate", "advanced"],
    },
    availableDays: { type: "number" as const, required: true, min: 1, max: 7 },
    sessionDuration: {
      type: "number" as const,
      required: true,
      min: 15,
      max: 180,
    },
    equipment: { type: "array" as const, required: true },
  },

  // Create workout session
  createWorkout: {
    routineId: { type: "string" as const, required: true },
    plannedExercises: { type: "array" as const, required: true, min: 1 },
  },

  // Log exercise set
  logSet: {
    reps: { type: "number" as const, required: true, min: 1, max: 999 },
    weight: { type: "number" as const, min: 0, max: 999 },
    rpe: { type: "number" as const, min: 1, max: 10 },
    notes: { type: "string" as const, max: 500 },
  },

  // Health sync
  healthSync: {
    dataType: {
      type: "string" as const,
      required: true,
      enum: ["metrics", "workouts", "sleep", "hrv"],
    },
    data: { type: "object" as const, required: true },
  },

  // Pagination
  pagination: {
    limit: { type: "number" as const, min: 1, max: 100 },
    offset: { type: "number" as const, min: 0 },
  },
};
