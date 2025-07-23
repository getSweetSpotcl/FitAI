/**
 * Cloudflare Workers entry point for Next.js
 * Using @cloudflare/next-on-pages for proper Next.js 15 support
 */

import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

// This is the standard Workers fetch handler
export default {
  async fetch(
    request: Request,
    env: {
      __STATIC_CONTENT: KVNamespace;
      ENVIRONMENT?: string;
      NEXT_PUBLIC_API_URL?: string;
    },
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      // First, try to serve static assets from KV
      try {
        const assetResponse = await getAssetFromKV(
          {
            request,
            waitUntil: ctx.waitUntil.bind(ctx),
          } as any,
          {
            ASSET_NAMESPACE: env.__STATIC_CONTENT,
            ASSET_MANIFEST: JSON.stringify({}),
          }
        );
        
        return assetResponse;
      } catch (e) {
        // Asset not found, continue to Next.js handler
      }

      // If not a static asset, handle as Next.js page
      // For now, return a simple HTML page until full Next.js integration is complete
      return new Response(
        `<!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>FitAI - Tu entrenador personal con IA</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 40px 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container {
              text-align: center;
              max-width: 600px;
            }
            h1 {
              font-size: 3rem;
              margin-bottom: 1rem;
              font-weight: 700;
            }
            p {
              font-size: 1.2rem;
              margin-bottom: 2rem;
              opacity: 0.9;
            }
            .status {
              background: rgba(255,255,255,0.1);
              padding: 20px;
              border-radius: 12px;
              margin: 20px 0;
            }
            .api-link {
              color: #ffd700;
              text-decoration: none;
              font-weight: bold;
            }
            .api-link:hover {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚀 FitAI</h1>
            <p>Tu entrenador personal con inteligencia artificial</p>
            
            <div class="status">
              <h3>✅ Deployment Exitoso</h3>
              <p>El sitio web está funcionando en Cloudflare Workers</p>
              <p>Environment: ${env.ENVIRONMENT || 'production'}</p>
            </div>

            <div class="status">
              <h3>🔗 API Status</h3>
              <p>API disponible en: <a href="${env.NEXT_PUBLIC_API_URL || 'https://api.getfitia.com'}" class="api-link" target="_blank">${env.NEXT_PUBLIC_API_URL || 'https://api.getfitia.com'}</a></p>
            </div>

            <div class="status">
              <h3>🔧 En Desarrollo</h3>
              <p>Dashboard web próximamente disponible</p>
            </div>
          </div>
        </body>
        </html>`,
        {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        }
      );
    } catch (error) {
      console.error('Worker error:', error);
      
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Error - FitAI</title>
          <style>body { font-family: sans-serif; padding: 40px; text-align: center; }</style>
        </head>
        <body>
          <h1>🚧 Error Temporal</h1>
          <p>Estamos trabajando para resolver este problema.</p>
          <p>Por favor, intenta nuevamente en unos minutos.</p>
        </body>
        </html>`,
        {
          status: 500,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
        }
      );
    }
  },
} satisfies ExportedHandler;