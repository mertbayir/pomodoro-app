import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, AppState } from 'react-native';


import { insertSession } from '../services/db';

export default function HomeScreen() {

  const categories = [
    "Kodlama", 
    "Ders Çalışma", 
    "Proje", 
    "Ödev Yapma", 
    "Kitap Okuma", 
    "Yazı Hazırlama",
    "Günlük Planlama",
    "Egzersiz",
    "Meditasyon",
    "Diğer"
  ];


  const [targetMinutes, setTargetMinutes] = useState(25); 
  const [timer, setTimer] = useState(25 * 60); 
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  

  const [sessionStarted, setSessionStarted] = useState(false);
  const [initialTimer, setInitialTimer] = useState(25 * 60);
  const [distractionCount, setDistractionCount] = useState(0);

  const isRunningRef = useRef(isRunning);
  const sessionStartedRef = useRef(sessionStarted);
  const prevAppStateRef = useRef(AppState.currentState);


  useEffect(() => {
    if (!sessionStarted) {
      setInitialTimer(targetMinutes * 60);
    }
  }, [targetMinutes, sessionStarted]);


  useEffect(() => {
    let interval = null;

    if (isRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else if (timer === 0 && isRunning) {

      handleSessionComplete(true);
    }

    return () => clearInterval(interval);
  }, [isRunning, timer]);


  useEffect(() => {

    isRunningRef.current = isRunning;
    sessionStartedRef.current = sessionStarted;


    const handleAppStateChange = (nextAppState) => {
      const prev = prevAppStateRef.current;
      prevAppStateRef.current = nextAppState;


      if (sessionStartedRef.current && isRunningRef.current) {
        if (prev === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
          setDistractionCount(prevCount => prevCount + 1);
          setIsRunning(false);
        }
      }


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




  const handleSessionComplete = async (isCompleted) => {
    if (!sessionStarted) return;

    const actualDuration = initialTimer - timer; // Kaç saniye çalışıldı
    const successRate = Math.round((actualDuration / initialTimer) * 100);
    const status = isCompleted ? 'TAMAMLANDI' : 'YARIDA KALDI';



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
        ? `🎉 Tebrikler! ${Math.floor(actualDuration/60)} dakika odaklandınız!`
        : `Session kaydedildi. ${Math.floor(actualDuration/60)} dakika çalıştınız (Başarı: %${successRate})`;
        
      Alert.alert("Session Tamamlandı", message);
      
    } catch (error) {
      Alert.alert("Hata", "Session kaydedilemedi!");
    }

    // Session state'lerini resetle
    setSessionStarted(false);
    setDistractionCount(0);
    setIsRunning(false);
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

      setSessionStarted(true);
      setInitialTimer(timer);
      setDistractionCount(0);
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    if (sessionStarted) {
      // Eğer session başlamışsa, kullanıcıya kaydetmek isteyip istemediğini sor
      Alert.alert(
        "Çalışma Verileri Kaydedilsin mi?", 
        "Çalışma programınızı henüz bitirmediniz. Mevcut ilerlemeyi kaydetmek ister misiniz?",
        [
          {
            text: "Kaydetme",
            style: "cancel",
            onPress: () => {
              setSessionStarted(false);
              setDistractionCount(0);
              setIsRunning(false);
              setTimer(targetMinutes * 60);
              // initialTimer useEffect ile otomatik güncellenir
            }
          },
          {
            text: "Kaydet",
            onPress: () => {
              handleSessionComplete(false);
              setTimer(targetMinutes * 60);
            }
          }
        ]
      );
    } else {
      setIsRunning(false);
      setTimer(targetMinutes * 60);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Pomodoro Uygulaması</Text>

      {/* 1. Category Selection */}
      <View style={styles.categoryWrapper}>
        <Text style={styles.sectionLabel}>Kategori Seç:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollArea}>
          {categories.map((category, index) => (
            <TouchableOpacity 
              key={index} 
              style={[
                styles.categoryButton, 
                selectedCategory === category ? styles.categoryButtonActive : null,
                sessionStarted ? styles.categoryButtonDisabled : null
              ]}
              onPress={() => !sessionStarted && setSelectedCategory(category)}
              disabled={sessionStarted}
            >
              <Text 
                style={[
                  styles.categoryText, 
                  selectedCategory === category ? styles.categoryTextActive : null,
                  sessionStarted ? styles.categoryTextDisabled : null
                ]}
              >
                {category}
              </Text>
              {selectedCategory === category && (
                <View style={styles.activeIndicator} />
              )}
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
          <Text style={styles.btnText}>Sıfırla</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, isRunning ? styles.btnPause : styles.btnStart]} 
          onPress={toggleTimer}
        >
          <Text style={styles.btnText}>
            {isRunning ? 'Duraklat' : sessionStarted ? 'Devam' : 'Başla'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingTop: 50, 
    backgroundColor: '#bcd3fdff',
    alignItems: 'center'
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: '#1E293B', 
    marginBottom: 25,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  sectionLabel: { 
    fontSize: 15, 
    color: '#64748B', 
    marginBottom: 8, 
    marginLeft: 12, 
    alignSelf: 'flex-start',
    fontWeight: '600',
    letterSpacing: 0.3
  },
  categoryWrapper: { 
    height: 100, 
    width: '100%',
    backgroundColor: '#fdf8e0ff',
    borderRadius: 20,
    marginVertical: 10,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6
  },
  scrollArea: { paddingLeft: 10, },
  categoryButton: { 
    backgroundColor: '#F1F5F9', 
    paddingVertical: 10, 
    paddingHorizontal: 18, 
    borderRadius: 25, 
    marginRight: 10, 
    height: 42, 
    justifyContent: 'center', 
    borderWidth: 2, 
    borderColor: 'transparent',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  categoryButtonActive: { 
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
    borderWidth: 2,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6
  },
  categoryText: { 
    color: '#64748B', 
    fontWeight: '600', 
    fontSize: 14,
    letterSpacing: 0.2
  },
  categoryTextActive: { 
    color: '#4F46E5', 
    fontWeight: '700',
    textShadowColor: 'rgba(99, 102, 241, 0.18)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },

  activeIndicator: {
    marginTop: 8,
    width: '60%',
    height: 4,
    backgroundColor: '#4F46E5',
    borderRadius: 4,
    alignSelf: 'center'
  },
  categoryButtonDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    opacity: 0.6
  },
  categoryTextDisabled: {
    color: '#94A3B8'
  },
  adjusterContainer: { 
    width: '90%', 
    marginVertical: 15, 
    padding: 20, 
    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
    borderRadius: 24,
    backdropFilter: 'blur(20px)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  adjusterControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', },
  adjustBtn: { 
    backgroundColor: '#FFFFFF', 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: '#E2E8F0', 
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6
  },
  adjustBtnText: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#475569'
  },
  timeDisplayBox: { paddingHorizontal: 15, },
  timeDisplayText: { 
    fontSize: 32, 
    fontWeight: '800', 
    color: '#1E293B',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1
  },
  timerContainer: { 
    alignItems: 'center', 
    marginVertical: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 30,
    paddingHorizontal: 40,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)'
  },
  counterText: { 
    fontSize: 84, 
    fontWeight: '900', 
    color: '#0F172A', 
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 2
  },
  currentTaskText: { 
    fontSize: 18, 
    color: '#64748B', 
    marginTop: 8,
    fontWeight: '500',
    letterSpacing: 0.3
  },
  buttonRow: { 
    flexDirection: 'row', 
    gap: 24, 
    marginTop: 20,
    marginBottom: 20
  },
  button: { 
    paddingVertical: 18, 
    paddingHorizontal: 32, 
    borderRadius: 28, 
    minWidth: 140, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8
  },
  btnStart: { 
    backgroundColor: '#10B981',
    shadowColor: '#10B981'
  }, 
  btnPause: { 
    backgroundColor: '#F59E0B',
    shadowColor: '#F59E0B'
  }, 
  btnReset: { 
    backgroundColor: '#94A3B8',
    shadowColor: '#94A3B8'
  }, 
  btnText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: '700',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  distractionText: { 
    fontSize: 15, 
    color: '#EF4444', 
    marginTop: 8, 
    fontWeight: '700',
    letterSpacing: 0.2
  },
  
});