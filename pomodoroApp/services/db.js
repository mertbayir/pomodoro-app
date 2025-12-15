import * as SQLite from 'expo-sqlite';

const DB_NAME = 'focusApp.db';

let dbInstance = null;

const getDB = async () => {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbInstance;
};

export const initDB = async () => {
  try {
    const db = await getDB();
    
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS sessions_detailed (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category TEXT,
          target_duration INTEGER, -- Hedeflenen Süre (Saniye)
          actual_duration INTEGER, -- Gerçekleşen Süre (Saniye)
          success_rate INTEGER,    -- Başarı Yüzdesi (%)
          status TEXT,             -- 'TAMAMLANDI' veya 'YARIDA KALDI'
          distraction_count INTEGER DEFAULT 0,
          date TEXT
        );
      `);

      try {
        const cols = await db.getAllAsync("PRAGMA table_info('sessions_detailed')");
        const hasDistraction = cols.some(c => c.name === 'distraction_count');
        if (!hasDistraction) {
          await db.execAsync("ALTER TABLE sessions_detailed ADD COLUMN distraction_count INTEGER DEFAULT 0;");
        }
      } catch (e) {
      }
  } catch (error) {
  }
};

export const insertSession = async (category, target, actual, rate, status, distractionCount = 0) => {
  try {
    const db = await getDB();
    const date = new Date().toISOString();
    
    await db.runAsync(
      'INSERT INTO sessions_detailed (category, target_duration, actual_duration, success_rate, status, distraction_count, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [category, target, actual, rate, status, distractionCount, date]
    );
    
    await db.execAsync('PRAGMA wal_checkpoint(PASSIVE);');
    
    return true;
  } catch (error) {
    console.error('Insert session error:', error);
    return false;
  }
};

export const fetchSessions = async () => {
  try {
    const db = await getDB();
    
    await db.execAsync('PRAGMA wal_checkpoint(PASSIVE);');
    
    const allRows = await db.getAllAsync('SELECT * FROM sessions_detailed ORDER BY id DESC');
    return allRows || [];
  } catch (error) {
    console.error('Fetch sessions error:', error);
    return [];
  }
};