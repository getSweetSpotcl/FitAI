import { swaggerUI } from "@hono/swagger-ui";
import { Hono } from "hono";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const docs = new Hono();

// Swagger UI endpoint
docs.get("/", swaggerUI({ 
  url: "/api-docs/openapi.yaml" 
}));

// Serve OpenAPI spec
docs.get("/openapi.yaml", (c) => {
  try {
    // Read the OpenAPI spec file
    const openApiPath = join(__dirname, "../../openapi.yaml");
    const openApiContent = readFileSync(openApiPath, "utf8");
    
    c.header("Content-Type", "application/x-yaml");
    return c.body(openApiContent);
  } catch (error) {
    console.error("Error serving OpenAPI spec:", error);
    return c.json(
      { 
        error: "OpenAPI spec not found",
        message: "The OpenAPI specification file could not be loaded"
      }, 
      404
    );
  }
});

// Alternative JSON format
docs.get("/openapi.json", (c) => {
  try {
    const openApiPath = join(__dirname, "../../openapi.yaml");
    const openApiContent = readFileSync(openApiPath, "utf8");
    
    // For now, serve the YAML content with JSON content-type
    // In production, you might want to convert YAML to JSON
    c.header("Content-Type", "application/json");
    return c.json({
      message: "JSON format not implemented yet. Please use /api-docs/openapi.yaml",
      yamlUrl: "/api-docs/openapi.yaml"
    });
  } catch (error) {
    console.error("Error serving OpenAPI JSON:", error);
    return c.json(
      { 
        error: "OpenAPI spec not found",
        message: "The OpenAPI specification file could not be loaded"
      }, 
      404
    );
  }
});

// Documentation index with links
docs.get("/index", (c) => {
  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>FitAI API Documentation</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
          line-height: 1.6;
          color: #333;
        }
        h1 { color: #2563eb; margin-bottom: 30px; }
        .card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 24px;
          margin: 20px 0;
        }
        .card h2 {
          margin-top: 0;
          color: #1e293b;
        }
        a {
          color: #2563eb;
          text-decoration: none;
          font-weight: 500;
        }
        a:hover {
          text-decoration: underline;
        }
        .status {
          display: inline-block;
          padding: 4px 12px;
          background: #10b981;
          color: white;
          border-radius: 20px;
          font-size: 0.875rem;
          margin-left: 10px;
        }
        .feature-list {
          list-style: none;
          padding: 0;
        }
        .feature-list li {
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .feature-list li:last-child {
          border-bottom: none;
        }
        .feature-list li::before {
          content: "✓";
          color: #10b981;
          font-weight: bold;
          margin-right: 10px;
        }
      </style>
    </head>
    <body>
      <h1>FitAI API Documentation <span class="status">v1.0.0</span></h1>
      
      <div class="card">
        <h2>📚 Documentación Interactiva</h2>
        <p>Explora y prueba todos los endpoints de la API de manera interactiva:</p>
        <p><strong><a href="/api-docs/" target="_blank">🔗 Abrir Swagger UI</a></strong></p>
      </div>

      <div class="card">
        <h2>📋 Especificaciones</h2>
        <p>Descarga las especificaciones OpenAPI:</p>
        <ul>
          <li><a href="/api-docs/openapi.yaml" target="_blank">OpenAPI Spec (YAML)</a></li>
          <li><a href="/api-docs/openapi.json" target="_blank">OpenAPI Spec (JSON)</a></li>
        </ul>
      </div>

      <div class="card">
        <h2>🚀 Características de la API</h2>
        <ul class="feature-list">
          <li><strong>147 endpoints</strong> organizados por funcionalidad</li>
          <li><strong>Autenticación Clerk</strong> con tokens JWT</li>
          <li><strong>3 planes de suscripción</strong> (Free, Premium, Pro)</li>
          <li><strong>Rate limiting</strong> por plan de usuario</li>
          <li><strong>IA integrada</strong> con OpenAI GPT-4</li>
          <li><strong>Pagos</strong> con MercadoPago Chile</li>
          <li><strong>Integración HealthKit</strong> para datos de salud</li>
          <li><strong>Features sociales</strong> y comunidad</li>
          <li><strong>Analytics avanzado</strong> y reportes</li>
        </ul>
      </div>

      <div class="card">
        <h2>🔑 Autenticación</h2>
        <p>La mayoría de endpoints requieren autenticación con Clerk:</p>
        <pre style="background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 6px; overflow-x: auto;">Authorization: Bearer YOUR_CLERK_TOKEN</pre>
      </div>

      <div class="card">
        <h2>🏷️ Endpoints por Categoría</h2>
        <ul>
          <li><strong>Health</strong> - Estado de la API</li>
          <li><strong>Users</strong> - Gestión de usuarios y perfiles</li>
          <li><strong>Exercises</strong> - Catálogo de ejercicios (público)</li>
          <li><strong>Workouts</strong> - Sesiones de entrenamiento</li>
          <li><strong>Routines</strong> - Rutinas de entrenamiento</li>
          <li><strong>AI</strong> - Inteligencia artificial básica</li>
          <li><strong>Premium AI</strong> - IA avanzada (Premium/Pro)</li>
          <li><strong>Payments</strong> - Suscripciones con MercadoPago</li>
          <li><strong>Health Data</strong> - Integración HealthKit</li>
          <li><strong>Social</strong> - Funcionalidades sociales</li>
          <li><strong>Analytics</strong> - Métricas y reportes</li>
          <li><strong>Webhooks</strong> - Integraciones externas</li>
        </ul>
      </div>

      <div class="card">
        <h2>📞 Contacto</h2>
        <p>Para soporte técnico o consultas sobre la API:</p>
        <p>📧 Email: <a href="mailto:support@fitai.cl">support@fitai.cl</a></p>
        <p>🌐 Web: <a href="https://getfitia.com" target="_blank">getfitia.com</a></p>
      </div>
    </body>
    </html>
  `;
  
  return c.html(html);
});

export default docs;