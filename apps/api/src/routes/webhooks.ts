import { Hono } from 'hono';
import { Webhook } from 'svix';
import { MercadoPagoService } from '../lib/mercadopago';

// Types for webhook events
interface ClerkUser {
  id: string;
  email_addresses: Array<{ email_address: string }>;
  first_name: string | null;
  last_name: string | null;
  public_metadata: Record<string, any>;
  private_metadata: Record<string, any>;
  created_at: number;
  updated_at: number;
}

interface WebhookEvent {
  type: string;
  data: ClerkUser;
}

// Environment bindings
interface WebhookBindings {
  CLERK_WEBHOOK_SECRET: string;
  MERCADOPAGO_ACCESS_TOKEN: string;
  DATABASE_URL: string;
}

const app = new Hono<{ Bindings: WebhookBindings }>();

// Database connection helper
async function createDatabaseClient(databaseUrl: string) {
  const { neon } = await import('@neondatabase/serverless');
  return neon(databaseUrl);
}

/**
 * Create user record from Clerk webhook
 */
async function createUserFromClerk(clerkUser: ClerkUser, sql: any) {
  try {
    const email = clerkUser.email_addresses[0]?.email_address || '';
    const name = `${clerkUser.first_name || ''} ${clerkUser.last_name || ''}`.trim() || null;
    const userRole = clerkUser.public_metadata?.role || clerkUser.private_metadata?.role || 'user';
    const subscriptionPlan = clerkUser.public_metadata?.plan || clerkUser.private_metadata?.plan || 'free';

    console.log('Creating user from Clerk:', { 
      clerkId: clerkUser.id, 
      email, 
      name, 
      role: userRole,
      plan: subscriptionPlan 
    });

    const result = await sql`
      INSERT INTO users (
        clerk_user_id,
        email,
        name,
        user_role,
        subscription_plan,
        created_at
      ) VALUES (
        ${clerkUser.id},
        ${email},
        ${name},
        ${userRole},
        ${subscriptionPlan},
        NOW()
      )
      ON CONFLICT (clerk_user_id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        user_role = EXCLUDED.user_role,
        subscription_plan = EXCLUDED.subscription_plan,
        updated_at = NOW()
      RETURNING id, clerk_user_id, email;
    `;

    console.log('User created/updated successfully:', result[0]);
    return result[0];

  } catch (error) {
    console.error('Error creating user from Clerk:', error);
    throw error;
  }
}

/**
 * Update user record from Clerk webhook
 */
async function updateUserFromClerk(clerkUser: ClerkUser, sql: any) {
  try {
    const email = clerkUser.email_addresses[0]?.email_address || '';
    const name = `${clerkUser.first_name || ''} ${clerkUser.last_name || ''}`.trim() || null;
    const userRole = clerkUser.public_metadata?.role || clerkUser.private_metadata?.role || 'user';
    const subscriptionPlan = clerkUser.public_metadata?.plan || clerkUser.private_metadata?.plan || 'free';

    console.log('Updating user from Clerk:', { 
      clerkId: clerkUser.id, 
      email, 
      name, 
      role: userRole,
      plan: subscriptionPlan 
    });

    const result = await sql`
      UPDATE users SET
        email = ${email},
        name = ${name},
        user_role = ${userRole},
        subscription_plan = ${subscriptionPlan},
        updated_at = NOW()
      WHERE clerk_user_id = ${clerkUser.id}
      RETURNING id, clerk_user_id, email;
    `;

    if (result.length === 0) {
      console.log('User not found, creating new record');
      return await createUserFromClerk(clerkUser, sql);
    }

    console.log('User updated successfully:', result[0]);
    return result[0];

  } catch (error) {
    console.error('Error updating user from Clerk:', error);
    throw error;
  }
}

/**
 * Soft delete user record
 */
async function softDeleteUser(clerkUserId: string, sql: any) {
  try {
    console.log('Soft deleting user:', clerkUserId);

    const result = await sql`
      UPDATE users SET
        deleted_at = NOW(),
        updated_at = NOW()
      WHERE clerk_user_id = ${clerkUserId}
      RETURNING id, clerk_user_id, email;
    `;

    console.log('User soft deleted:', result[0]);
    return result[0];

  } catch (error) {
    console.error('Error soft deleting user:', error);
    throw error;
  }
}

/**
 * Clerk webhook handler
 * Handles user.created, user.updated, and user.deleted events
 */
app.post('/clerk', async (c) => {
  try {
    // Get webhook signature and payload
    const signature = c.req.header('svix-signature');
    const timestamp = c.req.header('svix-timestamp');
    const webhookId = c.req.header('svix-id');
    
    if (!signature || !timestamp || !webhookId) {
      console.error('Missing webhook headers');
      return c.json({ error: 'Missing webhook headers' }, 400);
    }

    const payload = await c.req.text();
    
    if (!payload) {
      console.error('Empty webhook payload');
      return c.json({ error: 'Empty payload' }, 400);
    }

    // Verify webhook signature using Svix
    const webhook = new Webhook(c.env.CLERK_WEBHOOK_SECRET);
    
    let webhookData: WebhookEvent;
    try {
      webhookData = webhook.verify(payload, {
        'svix-id': webhookId,
        'svix-timestamp': timestamp,
        'svix-signature': signature,
      }) as WebhookEvent;
    } catch (verifyError) {
      console.error('Webhook verification failed:', verifyError);
      return c.json({ error: 'Webhook verification failed' }, 400);
    }

    console.log('Webhook received:', webhookData.type, webhookData.data.id);

    // Connect to database
    const sql = await createDatabaseClient(c.env.DATABASE_URL);

    // Handle different webhook events
    let result;
    switch (webhookData.type) {
      case 'user.created':
        result = await createUserFromClerk(webhookData.data, sql);
        break;

      case 'user.updated':
        result = await updateUserFromClerk(webhookData.data, sql);
        break;

      case 'user.deleted':
        result = await softDeleteUser(webhookData.data.id, sql);
        break;

      default:
        console.log('Unhandled webhook type:', webhookData.type);
        return c.json({ message: `Unhandled event type: ${webhookData.type}` }, 200);
    }

    console.log('Webhook processed successfully:', result);

    return c.json({ 
      success: true, 
      event: webhookData.type,
      userId: webhookData.data.id,
      result 
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return c.json({ 
      error: 'Webhook processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * MercadoPago webhook handler
 * Handles payment notifications from MercadoPago
 */
app.post('/mercadopago', async (c) => {
  try {
    const webhookData = await c.req.json();
    
    console.log('MercadoPago Webhook received:', JSON.stringify(webhookData, null, 2));

    const mercadoPagoService = new MercadoPagoService(c.env.MERCADOPAGO_ACCESS_TOKEN);
    const webhookResult = await mercadoPagoService.processWebhook(webhookData);

    if (!webhookResult.success) {
      console.error('MercadoPago webhook processing failed:', webhookResult.error);
      return c.json({ status: 'error', message: webhookResult.error }, 400);
    }

    if (webhookResult.action && webhookResult.userId && webhookResult.planId) {
      const sql = await createDatabaseClient(c.env.DATABASE_URL);

      switch (webhookResult.action) {
        case 'subscription_activated':
          // Update user plan
          await sql`
            UPDATE users 
            SET plan = ${webhookResult.planId}, updated_at = NOW()
            WHERE id = ${webhookResult.userId}
          `;

          // Create subscription record
          await sql`
            INSERT INTO payment_subscriptions (
              id, user_id, plan_id, status, amount, billing_cycle,
              started_at, created_at
            ) VALUES (
              ${`sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`},
              ${webhookResult.userId}, ${webhookResult.planId}, 'active', 
              ${webhookResult.planId === 'premium' ? 7990 : 14990}, 'monthly',
              NOW(), NOW()
            )
            ON CONFLICT (user_id) DO UPDATE SET
              plan_id = EXCLUDED.plan_id,
              status = 'active',
              amount = EXCLUDED.amount,
              started_at = NOW(),
              updated_at = NOW()
          `;

          // Update subscription intent to completed
          await sql`
            UPDATE subscription_intents 
            SET status = 'completed', updated_at = NOW()
            WHERE user_id = ${webhookResult.userId} AND status = 'pending'
          `;

          console.log(`Subscription activated for user ${webhookResult.userId}, plan ${webhookResult.planId}`);
          break;

        case 'payment_failed':
          // Update subscription intent as failed
          await sql`
            UPDATE subscription_intents 
            SET status = 'failed', updated_at = NOW()
            WHERE user_id = ${webhookResult.userId} AND status = 'pending'
          `;

          console.log(`Payment failed for user ${webhookResult.userId}`);
          break;

        case 'subscription_cancelled':
          // Update user plan to free
          await sql`
            UPDATE users 
            SET plan = 'free', updated_at = NOW()
            WHERE id = ${webhookResult.userId}
          `;

          // Update subscription status
          await sql`
            UPDATE payment_subscriptions 
            SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
            WHERE user_id = ${webhookResult.userId} AND status = 'active'
          `;

          console.log(`Subscription cancelled for user ${webhookResult.userId}`);
          break;
      }
    }

    return c.json({ 
      status: 'ok', 
      message: 'Webhook processed successfully',
      action: webhookResult.action 
    });

  } catch (error) {
    console.error('MercadoPago webhook processing error:', error);
    return c.json({ 
      status: 'error', 
      message: 'Webhook processing failed' 
    }, 500);
  }
});

export default app;