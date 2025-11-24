import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, AppState } from 'react-native';

// VERİTABANI BAĞLANTISI (Burayı ekledik)
import { insertSession } from '../services/db';

export default function HomeScreen() {

  const categories = [
    "Kodlama", 
    "Ders Çalışma", 
    "Proje", 
    "Ödev Yapma", 
    "Kitap Okuma", 
    "Yazı Hazırlama",
    "Diğer"
  ];

  // --- STATE VARIABLES ---
  const [targetMinutes, setTargetMinutes] = useState(25); 
  const [timer, setTimer] = useState(25 * 60); 
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  
  // Session tracking için yeni state'ler
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [initialTimer, setInitialTimer] = useState(25 * 60);
  const [distractionCount, setDistractionCount] = useState(0);
  const [currentAppState, setCurrentAppState] = useState(AppState.currentState);
  // refs to avoid stale closures inside AppState listener
  const isRunningRef = useRef(isRunning);
  const sessionStartedRef = useRef(sessionStarted);
  const prevAppStateRef = useRef(AppState.currentState);

  // targetMinutes değiştiğinde initialTimer'ı da güncelle
  useEffect(() => {
    if (!sessionStarted) {
      setInitialTimer(targetMinutes * 60);
    }
  }, [targetMinutes, sessionStarted]);

  // --- EFFECTS (GÜNCELLENEN KISIM) ---
  useEffect(() => {
    let interval = null;

    if (isRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else if (timer === 0 && isRunning) {
      // SÜRE BİTTİĞİNDE BURASI ÇALIŞIR
      handleSessionComplete(true); // Başarıyla tamamlandı
    }

    return () => clearInterval(interval);
  }, [isRunning, timer]);

  // AppState listener - dikkat dağınıklığı takibi
  useEffect(() => {
    // keep refs in sync with state to avoid stale closures in listener
    isRunningRef.current = isRunning;
    sessionStartedRef.current = sessionStarted;

    // single, stable AppState listener — register once
    const handleAppStateChange = (nextAppState) => {
      const prev = prevAppStateRef.current;
      console.log('🔄 AppState değişti:', prev, '→', nextAppState);
      prevAppStateRef.current = nextAppState;

      // Eğer session başlamış ve timer çalışıyorsa, active -> background geçişi dikkat dağınıklığıdır
      if (sessionStartedRef.current && isRunningRef.current) {
        if (prev === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
          console.log('⚠️ DİKKAT DAĞINIKLIĞI TESPİT EDİLDİ (ref listener)');
          setDistractionCount(prevCount => {
            const newCount = prevCount + 1;
            console.log('📊 Dikkat sayısı:', prevCount, '→', newCount);
            return newCount;
          });
          setIsRunning(false);
        }
      }

      // Eğer session başladı ama timer duruyorsa ve kullanıcı uygulamaya geri döndüyse, devam etmek isteyip istemediğini sor
      if (sessionStartedRef.current && !isRunningRef.current) {
        if ((prev === 'background' || prev === 'inactive') && nextAppState === 'active') {
          setTimeout(() => {
            Alert.alert(
              'Tekrar Hoşgeldiniz!',
              'Timer duraklatılmıştı. Devam etmek ister misiniz?',
              [
                { text: 'Hayır', style: 'cancel' },
                { text: 'Devam Et', onPress: () => setIsRunning(true) }
              ]
            );
          }, 200);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isRunning, sessionStarted]);

  // --- FUNCTIONS ---

  // Session'ı kaydetme fonksiyonu
  const handleSessionComplete = async (isCompleted) => {
    if (!sessionStarted) return;

    const actualDuration = initialTimer - timer; // Kaç saniye çalışıldı
    const successRate = Math.round((actualDuration / initialTimer) * 100);
    const status = isCompleted ? 'TAMAMLANDI' : 'YARIDA KALDI';

    console.log('📊 Session Detayları:');
    console.log('- Hedef süre:', initialTimer, 'saniye (', Math.floor(initialTimer/60), 'dk)');
    console.log('- Kalan süre:', timer, 'saniye');
    console.log('- Çalışılan süre:', actualDuration, 'saniye (', Math.floor(actualDuration/60), 'dk)');
    console.log('- Başarı oranı:', successRate, '%');
    console.log('- Durum:', status);

    try {
      await insertSession(
        selectedCategory, 
        initialTimer,      // hedef süre
        actualDuration,    // gerçekleşen süre
        successRate,       // başarı oranı
        status,            // durum
        distractionCount   // dikkat dağınıklığı sayısı
      );
      
      const message = isCompleted 
        ? `Tebrikler! ${Math.floor(actualDuration/60)} dakika odaklandınız. ☕️`
        : `Session kaydedildi. ${Math.floor(actualDuration/60)} dakika çalıştınız (Başarı: %${successRate})`;
        
      Alert.alert("Session Tamamlandı", message);
      
    } catch (error) {
      console.log("Kayıt hatası:", error);
      Alert.alert("Hata", "Session kaydedilemedi!");
    }

    // Session state'lerini resetle
    setSessionStarted(false);
    setSessionStartTime(null);
    setDistractionCount(0);
    setIsRunning(false);
    setCurrentAppState(AppState.currentState);
  };

  const adjustTime = (amount) => {
    if (isRunning || sessionStarted) return; 
    
    const newTime = targetMinutes + amount;
    if (newTime < 1) return;

    setTargetMinutes(newTime);
    setTimer(newTime * 60);
    // initialTimer artık useEffect ile otomatik güncelleniyor
  };

  const toggleTimer = () => {
    if (!isRunning && !sessionStarted) {
      // İlk kez başlatılıyor
      console.log('🚀 Session başlıyor - Timer değeri:', timer, 'saniye');
      setSessionStarted(true);
      setSessionStartTime(new Date());
      setInitialTimer(timer); // Mevcut timer değerini başlangıç olarak kaydet
      setDistractionCount(0);
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    if (sessionStarted) {
      // Eğer session başlamışsa, kullanıcıya kaydetmek isteyip istemediğini sor
      Alert.alert(
        "Session'ı Kaydet?", 
        "Çalışma seansı henüz bitmedi. Mevcut ilerlemeyi kaydetmek ister misiniz?",
        [
          {
            text: "Kaydetme",
            style: "cancel",
            onPress: () => {
              // Session'ı kaydetmeden resetle
              setSessionStarted(false);
              setSessionStartTime(null);
              setDistractionCount(0);
              setIsRunning(false);
              setTimer(targetMinutes * 60);
              setCurrentAppState(AppState.currentState);
              // initialTimer useEffect ile otomatik güncellenir
            }
          },
          {
            text: "Kaydet",
            onPress: () => {
              handleSessionComplete(false); // Yarım kalmış olarak kaydet
              setTimer(targetMinutes * 60);
              // initialTimer useEffect ile otomatik güncellenir
            }
          }
        ]
      );
    } else {
      // Normal reset
      setIsRunning(false);
      setTimer(targetMinutes * 60);
      // initialTimer useEffect ile otomatik güncellenir
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes < 10 ? '0' : ''}${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  return (
    <View style={styles.container}>
      
      <Text style={styles.headerTitle}>Focus Timer</Text>

      {/* 1. Category Selection */}
      <View style={styles.categoryWrapper}>
        <Text style={styles.sectionLabel}>Kategori Seç:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollArea}>
          {categories.map((category, index) => (
            <TouchableOpacity 
              key={index} 
              style={[
                styles.categoryButton, 
                selectedCategory === category ? styles.categoryButtonActive : null
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text 
                style={[
                  styles.categoryText, 
                  selectedCategory === category ? styles.categoryTextActive : null
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 2. Time Adjuster */}
      <View style={styles.adjusterContainer}>
        <Text style={styles.sectionLabel}>Süre Ayarla (Dk):</Text>
        <View style={styles.adjusterControls}>
          <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustTime(-5)} disabled={isRunning}>
            <Text style={styles.adjustBtnText}>-5</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustTime(-1)} disabled={isRunning}>
            <Text style={styles.adjustBtnText}>-1</Text>
          </TouchableOpacity>

          <View style={styles.timeDisplayBox}>
            <Text style={styles.timeDisplayText}>{targetMinutes}</Text>
          </View>

          <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustTime(1)} disabled={isRunning}>
            <Text style={styles.adjustBtnText}>+1</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustTime(5)} disabled={isRunning}>
            <Text style={styles.adjustBtnText}>+5</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Main Countdown Display */}
      <View style={styles.timerContainer}>
        <Text style={styles.counterText}>{formatTime(timer)}</Text>
        <Text style={styles.currentTaskText}>
          {isRunning ? `${selectedCategory} yapılıyor...` : sessionStarted ? 'Duraklatıldı' : 'Hazır mısın?'}
        </Text>
        {sessionStarted && (
          <Text style={styles.distractionText}>
            Dikkat Dağınıklığı: {distractionCount} kez
          </Text>
        )}
      </View>

      {/* 4. Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.button, styles.btnReset]} onPress={resetTimer}>
          <Text style={styles.btnText}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, isRunning ? styles.btnPause : styles.btnStart]} 
          onPress={toggleTimer}
        >
          <Text style={styles.btnText}>
            {isRunning ? 'Pause' : sessionStarted ? 'Devam' : 'Start'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, backgroundColor: '#fff', alignItems: 'center', },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 20, },
  sectionLabel: { fontSize: 14, color: '#888', marginBottom: 5, marginLeft: 10, alignSelf: 'flex-start' },
  categoryWrapper: { height: 80, width: '100%', },
  scrollArea: { paddingLeft: 10, },
  categoryButton: { backgroundColor: '#f0f0f0', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 8, height: 36, justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  categoryButtonActive: { backgroundColor: '#E3F2FD', borderColor: '#007AFF', },
  categoryText: { color: '#555', fontWeight: '500', fontSize: 13, },
  categoryTextActive: { color: '#007AFF', fontWeight: '700', },
  adjusterContainer: { width: '90%', marginVertical: 10, padding: 10, backgroundColor: '#F9FAFB', borderRadius: 15, },
  adjusterControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', },
  adjustBtn: { backgroundColor: '#fff', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, elevation: 2, },
  adjustBtnText: { fontSize: 16, fontWeight: 'bold', color: '#555', },
  timeDisplayBox: { paddingHorizontal: 15, },
  timeDisplayText: { fontSize: 24, fontWeight: 'bold', color: '#333', },
  timerContainer: { alignItems: 'center', marginVertical: 30, },
  counterText: { fontSize: 72, fontWeight: 'bold', color: '#222', fontVariant: ['tabular-nums'], },
  currentTaskText: { fontSize: 16, color: '#666', marginTop: 5, },
  buttonRow: { flexDirection: 'row', gap: 20, marginTop: 10, },
  button: { paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, minWidth: 120, alignItems: 'center', },
  btnStart: { backgroundColor: '#007AFF' }, 
  btnPause: { backgroundColor: '#FF9800' }, 
  btnReset: { backgroundColor: '#CFD8DC' }, 
  btnText: { color: 'white', fontSize: 18, fontWeight: 'bold', },
  distractionText: { fontSize: 14, color: '#FF5722', marginTop: 5, fontWeight: '600' },
});