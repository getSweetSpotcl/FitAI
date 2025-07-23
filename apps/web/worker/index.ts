/**
 * Cloudflare Workers adapter for Next.js
 * This file serves as the entry point for deploying Next.js to Cloudflare Workers
 */

import { createRequestHandler } from '@cloudflare/next-on-pages';

// Export the fetch handler for Cloudflare Workers
export default {
  async fetch(request: Request, env: any, ctx: any) {
    // Create the Next.js request handler
    const handler = createRequestHandler({
      build: await import('../.next/standalone/server.js'),
      mode: env.ENVIRONMENT === 'production' ? 'static' : 'development',
    });

    try {
      // Handle the request with Next.js
      return await handler(request, env, ctx);
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal Server Error', { 
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }
  },
} satisfies ExportedHandler;