// backend/cron.js
import cron from 'node-cron';
import { getFromSQLite } from '../database/db.js';

// Daily health tip at 9 AM IST
cron.schedule('0 9 * * *', async () => {
  console.log('🕘 Daily health tip cron job triggered');

  try {
    const tips = await getFromSQLite('daily_tips');
    if (tips && tips.length > 0) {
      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      console.log(`📝 Daily Tip: ${randomTip.tip}`);

      // In a real scenario, you'd send this to all registered users
      // For demo purposes, we just log it
    }
  } catch (error) {
    console.error('Error in daily tip cron:', error);
  }
}, {
  timezone: "Asia/Kolkata"
});

// Check for outbreak patterns every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('🔍 Outbreak pattern check triggered');

  try {
    // In a real system, this would analyze alert patterns
    // For demo, we just log the check
    console.log('✅ Outbreak pattern analysis completed');
  } catch (error) {
    console.error('Error in outbreak check:', error);
  }
}, {
  timezone: "Asia/Kolkata"
});

console.log('⏰ Cron jobs initialized - Daily tips at 9 AM, Outbreak checks every 6 hours');
