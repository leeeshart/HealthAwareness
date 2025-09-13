// database/db.js
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

let db;

export async function initSQLite() {
  try {
    db = await open({
      filename: './health.db',
      driver: sqlite3.Database
    });

    // Create tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS first_aid (
        id INTEGER PRIMARY KEY,
        condition TEXT UNIQUE,
        instructions TEXT
      );

      CREATE TABLE IF NOT EXISTS prevention_tips (
        id INTEGER PRIMARY KEY,
        disease TEXT UNIQUE,
        tips TEXT
      );

      CREATE TABLE IF NOT EXISTS helplines (
        id INTEGER PRIMARY KEY,
        service TEXT,
        number TEXT
      );

      CREATE TABLE IF NOT EXISTS daily_tips (
        id INTEGER PRIMARY KEY,
        tip TEXT
      );

      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY,
        disease TEXT,
        location TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS voice_logs (
        id INTEGER PRIMARY KEY,
        user_id TEXT,
        transcription TEXT,
        response TEXT,
        language TEXT,
        duration REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS regional_preferences (
        id INTEGER PRIMARY KEY,
        region TEXT,
        language_preference TEXT DEFAULT 'en',
        notification_enabled INTEGER DEFAULT 1,
        contact_method TEXT DEFAULT 'sms'
      );
    `);

    // Seed data if tables are empty
    await seedData();
    console.log('✅ SQLite database initialized');
    return db;
  } catch (error) {
    console.error('❌ SQLite initialization failed:', error);
    throw error;
  }
}

export async function getFromSQLite(table, column = null, value = null) {
  if (!db) await initSQLite();

  try {
    if (column && value) {
      return await db.get(`SELECT * FROM ${table} WHERE ${column} = ?`, [value]);
    } else {
      return await db.all(`SELECT * FROM ${table}`);
    }
  } catch (error) {
    console.error(`Error querying ${table}:`, error);
    return null;
  }
}

export async function insertAlert(disease, location) {
  if (!db) await initSQLite();

  try {
    return await db.run(
      'INSERT INTO alerts (disease, location) VALUES (?, ?)',
      [disease, location]
    );
  } catch (error) {
    console.error('Error inserting alert:', error);
    throw error;
  }
}

export async function insertVoiceLog(userId, transcription, response, language, duration) {
  if (!db) await initSQLite();

  try {
    return await db.run(
      'INSERT INTO voice_logs (user_id, transcription, response, language, duration) VALUES (?, ?, ?, ?, ?)',
      [userId, transcription, response, language, duration]
    );
  } catch (error) {
    console.error('Error inserting voice log:', error);
    throw error;
  }
}

export async function getRegionalPreference(region) {
  if (!db) await initSQLite();

  try {
    return await db.get(
      'SELECT * FROM regional_preferences WHERE region = ?',
      [region]
    );
  } catch (error) {
    console.error('Error getting regional preference:', error);
    return null;
  }
}

export async function upsertRegionalPreference(region, languagePreference, notificationEnabled, contactMethod) {
  if (!db) await initSQLite();

  try {
    return await db.run(
      `INSERT INTO regional_preferences (region, language_preference, notification_enabled, contact_method) 
       VALUES (?, ?, ?, ?) 
       ON CONFLICT(region) DO UPDATE SET 
       language_preference = excluded.language_preference,
       notification_enabled = excluded.notification_enabled,
       contact_method = excluded.contact_method`,
      [region, languagePreference, notificationEnabled ? 1 : 0, contactMethod]
    );
  } catch (error) {
    console.error('Error upserting regional preference:', error);
    throw error;
  }
}

async function seedData() {
  try {
    // Check if data already exists
    const firstAidCount = await db.get('SELECT COUNT(*) as count FROM first_aid');
    if (firstAidCount.count > 0) return;

    // First Aid Data
    const firstAidData = [
      {
        condition: 'burns',
        instructions: `🔥 *FIRST AID: BURNS*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ *IMMEDIATE STEPS:*

1️⃣ Cool with cold water (10-20 minutes)
2️⃣ Remove jewelry before swelling  
3️⃣ Cover with sterile gauze (not cotton)
4️⃣ Take pain relievers if needed
5️⃣ Seek medical help for severe burns

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ *DO NOT:*
• Apply ice, butter, or toothpaste
• Break blisters
• Use cotton on wounds

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 *CALL 108 IF:*
• Burn is large or deep
• Person is in shock
• Signs of infection appear

Stay safe! 💚`
      },
      {
        condition: 'cuts',
        instructions: `✂️ *FIRST AID: CUTS*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ *STEP BY STEP:*

1️⃣ Clean your hands first
2️⃣ Stop bleeding with direct pressure
3️⃣ Clean wound gently with water
4️⃣ Apply antibiotic ointment  
5️⃣ Cover with sterile bandage
6️⃣ Change bandage daily

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 *SEEK HELP IF:*
• Cut is deep or gaping
• Bleeding won't stop  
• Signs of infection appear
• Tetanus shot needed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Emergency: *108* 📞`
      },
      {
        condition: 'fever',
        instructions: `🌡️ *FIRST AID: FEVER*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ *CARE STEPS:*

1️⃣ Rest and stay hydrated
2️⃣ Take paracetamol/ibuprofen as directed
3️⃣ Use cool, damp cloths on forehead
4️⃣ Wear light clothing
5️⃣ Monitor temperature regularly

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 *URGENT - CALL 108 IF:*
• Temperature above 103°F (39.4°C)
• Severe headache or neck stiffness  
• Difficulty breathing
• Persistent vomiting
• Signs of dehydration

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Stay hydrated! 💚`
      }
    ];

    for (const item of firstAidData) {
      await db.run(
        'INSERT INTO first_aid (condition, instructions) VALUES (?, ?)',
        [item.condition, item.instructions]
      );
    }

    // Prevention Tips Data
    const preventionData = [
      {
        disease: 'malaria',
        tips: `🦟 *MALARIA PREVENTION*

1. Use mosquito nets while sleeping
2. Apply mosquito repellent (DEET-based)
3. Wear long sleeves & pants after sunset
4. Remove stagnant water around home
5. Use window screens if possible

🏥 *Symptoms to watch:*
• High fever with chills
• Severe headache
• Body aches

💊 Take antimalarial medicine if prescribed by doctor`
      },
      {
        disease: 'dengue',
        tips: `🦟 *DENGUE PREVENTION*

1. Eliminate standing water sources
2. Clean water storage containers weekly
3. Use mosquito repellents
4. Wear protective clothing
5. Use bed nets and screens

⚠️ *Warning Signs:*
• High fever for 2-7 days
• Severe headache
• Pain behind eyes
• Muscle/joint pain
• Skin rash

🚨 Seek immediate medical care for severe symptoms`
      }
    ];

    for (const item of preventionData) {
      await db.run(
        'INSERT INTO prevention_tips (disease, tips) VALUES (?, ?)',
        [item.disease, item.tips]
      );
    }

    // Helplines Data
    const helplines = [
      { service: 'Ambulance', number: '108' },
      { service: 'Police', number: '100' },
      { service: 'Fire Service', number: '101' },
      { service: 'Women Helpline', number: '181' },
      { service: 'Child Helpline', number: '1098' },
      { service: 'Disaster Management', number: '1070' }
    ];

    for (const helpline of helplines) {
      await db.run(
        'INSERT INTO helplines (service, number) VALUES (?, ?)',
        [helpline.service, helpline.number]
      );
    }

    // Daily Tips Data
    const dailyTips = [
      { tip: '💧 Drink at least 8 glasses of water daily to stay hydrated and healthy.' },
      { tip: '🧼 Wash your hands frequently with soap for 20 seconds to prevent infections.' },
      { tip: '🥗 Eat fresh fruits and vegetables daily for better immunity.' },
      { tip: '😴 Get 7-8 hours of sleep daily for better health and immunity.' },
      { tip: '🚶‍♂️ Walk for 30 minutes daily to maintain good health.' }
    ];

    for (const tip of dailyTips) {
      await db.run('INSERT INTO daily_tips (tip) VALUES (?)', [tip.tip]);
    }

    console.log('✅ Database seeded with Odisha health data');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
