#!/usr/bin/env node
/**
 * Scheduled Task: Send Renewal Notifications
 * 
 * This task runs daily to check for subscriptions that are expiring soon
 * and sends renewal notifications to restaurant owners.
 * 
 * Usage:
 * - Runs automatically via Manus scheduled task system
 * - Can also be run manually: node send-renewal-notifications.mjs
 */

import fetch from 'node-fetch';

const ENDPOINT_BASE = process.env.SCHEDULED_TASK_ENDPOINT_BASE;
const COOKIE = process.env.SCHEDULED_TASK_COOKIE;

if (!ENDPOINT_BASE || !COOKIE) {
  console.error('❌ Missing required environment variables:');
  console.error('   SCHEDULED_TASK_ENDPOINT_BASE:', ENDPOINT_BASE ? '✓' : '✗');
  console.error('   SCHEDULED_TASK_COOKIE:', COOKIE ? '✓' : '✗');
  process.exit(1);
}

/**
 * Send renewal notifications to restaurants with expiring subscriptions
 */
async function sendRenewalNotifications() {
  try {
    console.log('🔔 Starting renewal notification task...');
    console.log(`📍 Endpoint: ${ENDPOINT_BASE}`);
    
    // Call the API endpoint to send renewal notifications
    const response = await fetch(`${ENDPOINT_BASE}/api/scheduled/renewal-notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `app_session_id=${COOKIE}`,
      },
      body: JSON.stringify({
        daysBeforeExpiry: 7, // Send notifications 7 days before expiry
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API returned ${response.status}: ${error}`);
    }

    const result = await response.json();
    
    console.log('✅ Renewal notification task completed successfully!');
    console.log(`📊 Results:`, result);
    
    return result;
  } catch (error) {
    console.error('❌ Error sending renewal notifications:', error.message);
    process.exit(1);
  }
}

// Run the task
sendRenewalNotifications().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
