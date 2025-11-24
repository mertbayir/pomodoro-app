import * as SQLite from 'expo-sqlite';

const DB_NAME = 'focusApp.db';

export const initDB = async () => {
  try {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    
    // Tablo ismini değiştirdik: sessions_detailed
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

      // Eğer eski bir tablo varsa ve distraction_count sütunu yoksa, ekle
      try {
        const cols = await db.getAllAsync("PRAGMA table_info('sessions_detailed')");
        const hasDistraction = cols.some(c => c.name === 'distraction_count');
        if (!hasDistraction) {
          await db.execAsync("ALTER TABLE sessions_detailed ADD COLUMN distraction_count INTEGER DEFAULT 0;");
          console.log('🔧 distraction_count sütunu eklendi.');
        }
      } catch (e) {
        // Eğer PRAGMA veya ALTER desteklenmezse sessizce devam et
        console.log('db migration kontrol hatası:', e);
      }
    console.log('✅ Detaylı tablo hazır.');
  } catch (error) {
    console.log('❌ Tablo hatası:', error);
  }
};

// Yeni Ekleme Fonksiyonu (Tüm detayları alıyor)
export const insertSession = async (category, target, actual, rate, status, distractionCount = 0) => {
  try {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    const date = new Date().toISOString();
    
    await db.runAsync(
      'INSERT INTO sessions_detailed (category, target_duration, actual_duration, success_rate, status, distraction_count, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [category, target, actual, rate, status, distractionCount, date]
    );
    console.log('✅ Kayıt Detaylı Eklendi:', category, '-', Math.floor(actual/60), 'dk -', rate, '% Başarı - Dikkat:', distractionCount);
    return true;
  } catch (error) {
    console.log('❌ Ekleme hatası:', error);
    return false;
  }
};

export const fetchSessions = async () => {
  try {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    const allRows = await db.getAllAsync('SELECT * FROM sessions_detailed ORDER BY id DESC');
    return allRows;
  } catch (error) {
    console.log('❌ Veri çekme hatası:', error);
    return [];
  }
};