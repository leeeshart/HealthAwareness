// backend/services.js
import { getFromSQLite, insertAlert } from '../database/db.js';
import { AlertLog, User, Outbreak } from '../database/models.js';

export async function getFirstAidInfo(condition) {
  try {
    const result = await getFromSQLite('first_aid', 'condition', condition);
    return result ? `🩹 *First Aid: ${condition.toUpperCase()}*\n\n${result.instructions}` : null;
  } catch (error) {
    console.error('Error fetching first aid:', error);
    return null;
  }
}

export async function getPreventionTips(disease) {
  try {
    const result = await getFromSQLite('prevention_tips', 'disease', disease);
    return result ? `🛡️ *Prevention: ${disease.toUpperCase()}*\n\n${result.tips}` : null;
  } catch (error) {
    console.error('Error fetching prevention tips:', error);
    return null;
  }
}

export async function getHelplines() {
  try {
    const results = await getFromSQLite('helplines');
    if (results && results.length > 0) {
      let helplineText = "📞 *Emergency Helplines - Odisha*\n\n";
      results.forEach(h => {
        helplineText += `${h.service}: ${h.number}\n`;
      });
      return helplineText;
    }
    return "📞 Emergency: 108 | Police: 100 | Fire: 101";
  } catch (error) {
    console.error('Error fetching helplines:', error);
    return "📞 Emergency: 108 | Police: 100 | Fire: 101";
  }
}

export async function logAlert(disease, location) {
  try {
    // Log to SQLite (offline-first)
    await insertAlert(disease, location);

    // Also log to MongoDB for analytics and regional tracking (if connected)
    try {
      const regionCode = getRegionCode(location);
      const alert = new AlertLog({
        disease: disease,
        region_code: regionCode,
        message: `${disease} outbreak reported in ${location}. Citizens advised to take precautions and seek medical help if symptoms appear.`,
        sentAt: new Date(),
        status: 'reported'
      });
      await alert.save();
      console.log(`✅ Alert logged to MongoDB for region ${regionCode}`);
    } catch (mongoError) {
      console.log('MongoDB not available, using SQLite only');
    }
  } catch (error) {
    console.error('Error logging alert:', error);
    throw error;
  }
}

export async function getOutbreakStats(region = null) {
  try {
    const query = region ? { region_code: region } : {};
    const outbreaks = await Outbreak.find(query).sort({ date: -1 }).limit(10);
    return outbreaks;
  } catch (error) {
    console.error('Error fetching outbreak stats:', error);
    return [];
  }
}

export async function registerUser(phone, regionCode, language = 'en') {
  try {
    const user = new User({
      phone: phone,
      region_code: regionCode,
      lang: language,
      subscribedAlerts: []
    });
    await user.save();
    return user;
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
}

function getRegionCode(location) {
  const locationMap = {
    'bhubaneswar': 'OD-01',
    'cuttack': 'OD-02', 
    'puri': 'OD-03',
    'berhampur': 'OD-04',
    'rourkela': 'OD-05',
    'odisha': 'OD',
    'imphal': 'MN-01',
    'manipur': 'MN'
  };

  const key = location.toLowerCase();
  return locationMap[key] || 'OD-99'; // Default to Odisha general if location not found
}