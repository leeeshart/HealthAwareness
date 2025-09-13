// backend/controllers.js
import { getFirstAidInfo, getPreventionTips, getHelplines, logAlert, getOutbreakStats } from './services.js';

export async function helpController() {
  return `🏥 *HEALTH ALERT BOT - ODISHA*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 *AVAILABLE COMMANDS:*

• *HELP* - Show this menu
• *FIRSTAID* [condition] - First aid instructions
• *PREVENT* [disease] - Prevention guidelines  
• *ALERT* [disease] [location] - Report outbreak
• *STATS* - View outbreak statistics

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 *EXAMPLES:*
• FIRSTAID burns
• PREVENT malaria  
• ALERT cholera Bhubaneswar
• STATS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 *EMERGENCY HELPLINES:*
• Ambulance: *108*
• Police: *100*
• Fire Service: *101*  
• Women Helpline: *181*
• Child Helpline: *1098*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Stay healthy & stay safe! 💚`;
}

export async function firstAidController(condition) {
  if (!condition) {
    return "Please specify a condition. Example: FIRSTAID burns";
  }

  const info = await getFirstAidInfo(condition.toLowerCase());
  return info || `⚠️ First aid info for "${condition}" not found. Try: burns, cuts, fever, poisoning, fracture`;
}

export async function preventionController(disease) {
  if (!disease) {
    return "Please specify a disease. Example: PREVENT malaria";
  }

  const tips = await getPreventionTips(disease.toLowerCase());
  return tips || `⚠️ Prevention tips for "${disease}" not found. Try: malaria, dengue, cholera, typhoid`;
}

export async function alertController(input) {
  if (!input) {
    return `⚠️ *ALERT FORMAT ERROR*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please use: *ALERT [disease] [location]*

💡 *Example:* 
ALERT cholera Bhubaneswar

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  const parts = input.split(' ');
  const disease = parts[0];
  const location = parts.slice(1).join(' ');

  if (!disease || !location) {
    return `⚠️ *INCOMPLETE ALERT*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please provide both disease and location.

💡 *Example:* 
ALERT cholera Bhubaneswar

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  await logAlert(disease, location);

  return `🚨 *OUTBREAK ALERT LOGGED*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 *ALERT DETAILS:*
• Disease: *${disease.toUpperCase()}*
• Location: *${location}*  
• Time: ${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}
• Status: *REPORTED*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Alert recorded & authorities notified
🚨 Emergency? Call *108* immediately
📞 Health Helpline: *104*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Stay safe & follow health guidelines! 💚`;
}

export async function statsController() {
  try {
    const outbreaks = await getOutbreakStats();
    if (!outbreaks || outbreaks.length === 0) {
      return `📊 *Outbreak Statistics - Odisha*

✅ No recent outbreaks reported in your region.
Stay vigilant and maintain good hygiene practices.

📞 Report any health emergencies: 108`;
    }

    let statsText = `📊 *Recent Outbreak Statistics*\n\n`;
    outbreaks.forEach((outbreak, index) => {
      statsText += `${index + 1}. ${outbreak.disease.toUpperCase()}
📍 Location: ${outbreak.location}
👥 Cases: ${outbreak.cases}
📅 Date: ${new Date(outbreak.date).toLocaleDateString('en-IN')}
🚨 Severity: ${outbreak.severity}

`;
    });

    statsText += `⚠️ Stay alert and follow prevention guidelines.
📞 Emergency: 108 | Health Helpline: 104`;

    return statsText;
  } catch (error) {
    console.error('Error fetching stats:', error);
    return '⚠️ Unable to fetch outbreak statistics at the moment. Please try again later.';
  }
}