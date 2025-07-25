/**
 * Cloudflare Queue Handler
 * Processes background jobs from Cloudflare Queues
 */

import { BackgroundJobProcessor } from "./background-jobs";
import { createDatabaseClient } from "../db/database";
import { createRedisCache } from "./redis-cache";

/**
 * Queue handler for Cloudflare Workers
 */
export async function handleQueue(
  batch: MessageBatch,
  env: any
): Promise<void> {
  console.log(`🔄 Processing queue batch with ${batch.messages.length} messages`);

  // Initialize services
  const database = createDatabaseClient(env.DATABASE_URL);
  const redis = createRedisCache(env.UPSTASH_REDIS_URL, env.UPSTASH_REDIS_TOKEN);
  const jobProcessor = new BackgroundJobProcessor(database, env.FITAI_QUEUE, redis);

  const results = [];

  for (const message of batch.messages) {
    try {
      console.log(`Processing message ${message.id}`);
      
      // Parse job data
      const job = message.body;
      
      // Process the job
      const result = await jobProcessor.processJob(job);
      
      // Acknowledge successful processing
      message.ack();
      
      const jobData = job as any;
      results.push({
        messageId: message.id,
        jobId: jobData.id,
        jobType: jobData.type,
        success: result.success,
        duration: result.duration
      });

      console.log(`✅ Message ${message.id} processed successfully`);

    } catch (error) {
      console.error(`❌ Error processing message ${message.id}:`, error);
      
      // Retry logic
      if (message.attempts < 3) {
        console.log(`🔄 Retrying message ${message.id} (attempt ${message.attempts + 1})`);
        message.retry();
      } else {
        console.error(`💀 Message ${message.id} failed after 3 attempts, sending to DLQ`);
        // Send to dead letter queue or log for manual review
        await handleFailedJob(message, error, env);
        message.ack(); // Acknowledge to remove from queue
      }
    }
  }

  console.log(`✅ Queue batch processed: ${results.length} jobs completed`);
}

/**
 * Handle failed jobs that couldn't be processed
 */
async function handleFailedJob(message: any, error: any, env: any): Promise<void> {
  try {
    const database = createDatabaseClient(env.DATABASE_URL);
    
    // Log failed job to database for analysis
    await database`
      INSERT INTO failed_jobs (
        id, message_id, job_type, job_data, error_message, 
        failed_at, attempts, created_at
      ) VALUES (
        ${crypto.randomUUID()}, ${message.id}, ${message.body.type},
        ${JSON.stringify(message.body)}, ${error.toString()},
        NOW(), ${message.attempts}, NOW()
      )
    `;

    console.log(`💾 Failed job logged to database: ${message.id}`);
  } catch (logError) {
    console.error('Failed to log failed job:', logError);
  }
}

/**
 * Scheduled event handler for recurring jobs
 */
export async function handleScheduled(
  event: ScheduledEvent,
  env: any
): Promise<void> {
  console.log(`🕐 Scheduled event triggered: ${event.cron}`);

  const database = createDatabaseClient(env.DATABASE_URL);
  const redis = createRedisCache(env.UPSTASH_REDIS_URL, env.UPSTASH_REDIS_TOKEN);
  const jobProcessor = new BackgroundJobProcessor(database, env.FITAI_QUEUE, redis);

  try {
    switch (event.cron) {
      case '0 2 * * *': // Daily at 2 AM
        await handleDailyJobs(jobProcessor);
        break;
      
      case '0 3 * * 0': // Weekly on Sunday at 3 AM
        await handleWeeklyJobs(jobProcessor);
        break;
      
      case '0 4 1 * *': // Monthly on 1st at 4 AM
        await handleMonthlyJobs(jobProcessor);
        break;
      
      case '*/15 * * * *': // Every 15 minutes
        await handleFrequentJobs(jobProcessor);
        break;
      
      default:
        console.log(`Unknown cron pattern: ${event.cron}`);
    }
  } catch (error) {
    console.error('Scheduled job error:', error);
  }
}

/**
 * Daily scheduled jobs
 */
async function handleDailyJobs(jobProcessor: BackgroundJobProcessor): Promise<void> {
  console.log('🌅 Running daily jobs...');

  // Daily analytics calculations
  await jobProcessor.enqueue({
    type: 'analytics_calculation',
    data: {
      timeframe: '7',
      metrics: ['progress', 'strength'],
      scope: 'all_active_users'
    },
    priority: 'low'
  });

  // Update daily leaderboards
  await jobProcessor.enqueue({
    type: 'leaderboard_update',
    data: {
      category: 'all',
      period: 'daily'
    },
    priority: 'normal'
  });

  // Cache warming for popular data
  await jobProcessor.enqueue({
    type: 'cache_preloading',
    data: {
      keys: [
        'exercises:popular',
        'exercises:categories',
        'exercises:muscle_groups',
        'leaderboard:volume:daily',
        'leaderboard:workouts:daily'
      ]
    },
    priority: 'low'
  });

  console.log('✅ Daily jobs scheduled');
}

/**
 * Weekly scheduled jobs
 */
async function handleWeeklyJobs(jobProcessor: BackgroundJobProcessor): Promise<void> {
  console.log('📅 Running weekly jobs...');

  // Weekly progress reports for premium users
  await jobProcessor.enqueue({
    type: 'progress_report_generation',
    data: {
      scope: 'premium_users',
      timeframe: '7',
      format: 'email'
    },
    priority: 'normal'
  });

  // Update weekly leaderboards
  await jobProcessor.enqueue({
    type: 'leaderboard_update',
    data: {
      category: 'all',
      period: 'weekly'
    },
    priority: 'normal'
  });

  console.log('✅ Weekly jobs scheduled');
}

/**
 * Monthly scheduled jobs
 */
async function handleMonthlyJobs(jobProcessor: BackgroundJobProcessor): Promise<void> {
  console.log('🗓️ Running monthly jobs...');

  // Monthly comprehensive reports
  await jobProcessor.enqueue({
    type: 'progress_report_generation',
    data: {
      scope: 'all_users',
      timeframe: '30',
      format: 'comprehensive'
    },
    priority: 'low'
  });

  // Database maintenance and optimization
  await jobProcessor.enqueue({
    type: 'analytics_calculation',
    data: {
      type: 'maintenance',
      operations: ['cleanup', 'vacuum', 'reindex']
    },
    priority: 'low'
  });

  console.log('✅ Monthly jobs scheduled');
}

/**
 * Frequent scheduled jobs (every 15 minutes)
 */
async function handleFrequentJobs(jobProcessor: BackgroundJobProcessor): Promise<void> {
  console.log('⚡ Running frequent jobs...');

  // Achievement checks for recent activity
  await jobProcessor.enqueue({
    type: 'achievement_check',
    data: {
      scope: 'recent_activity',
      timeframe: '15' // Last 15 minutes
    },
    priority: 'high'
  });

  // Update real-time social feeds
  await jobProcessor.enqueue({
    type: 'social_feed_update',
    data: {
      scope: 'recent_activities',
      timeframe: '15'
    },
    priority: 'normal'
  });

  console.log('✅ Frequent jobs scheduled');
}

/**
 * Manual job trigger endpoint
 */
export async function triggerManualJob(
  jobType: string,
  data: any,
  env: any
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const database = createDatabaseClient(env.DATABASE_URL);
    const redis = createRedisCache(env.UPSTASH_REDIS_URL, env.UPSTASH_REDIS_TOKEN);
    const jobProcessor = new BackgroundJobProcessor(database, env.FITAI_QUEUE, redis);

    const jobId = await jobProcessor.enqueue({
      type: jobType as any,
      data,
      priority: 'high'
    });

    return {
      success: true,
      jobId
    };
  } catch (error) {
    console.error('Manual job trigger error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Job status checker
 */
export async function getJobStatus(
  jobId: string,
  env: any
): Promise<{ status: string; result?: any; error?: string }> {
  try {
    const database = createDatabaseClient(env.DATABASE_URL);

    // Check if job is in failed jobs table
    const failedJob = await database`
      SELECT * FROM failed_jobs
      WHERE id = ${jobId}
      LIMIT 1
    `;

    if ((failedJob as any[]).length > 0) {
      return {
        status: 'failed',
        error: (failedJob as any[])[0].error_message
      };
    }

    // For now, we'll implement a simple status check
    // In a real system, you'd track job states in a database
    return {
      status: 'completed',
      result: { message: 'Job status tracking to be implemented' }
    };
  } catch (error) {
    console.error('Job status check error:', error);
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}