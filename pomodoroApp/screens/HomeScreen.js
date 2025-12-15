import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, AppState, Modal, TextInput, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';


import { insertSession } from '../services/db';
import { useSession } from '../contexts/SessionContext';

// Bildirim yapılandırması
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function HomeScreen() {

  const { sessionStarted, setSessionStarted } = useSession();

  const defaultCategories = [
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

  const [categories, setCategories] = useState(defaultCategories);
  const [targetMinutes, setTargetMinutes] = useState(25); 
  const [timer, setTimer] = useState(25 * 60); 
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(defaultCategories[0]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [initialTimer, setInitialTimer] = useState(25 * 60);
  const [distractionCount, setDistractionCount] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  const isRunningRef = useRef(isRunning);
  const sessionStartedRef = useRef(sessionStarted);
  const prevAppStateRef = useRef(AppState.currentState);

  // Bildirim izni isteme
  useEffect(() => {
    (async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Bildirim izni verilmedi!');
      }
    })();
  }, []);

  // Bildirim gönderme fonksiyonu
  const sendNotification = async (title, body) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        sound: true,
      },
      trigger: null, // Hemen gönder
    });
  };

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('categories');
        if (saved) {
          const parsed = JSON.parse(saved);
          setCategories(parsed);
          if (parsed.length && !parsed.includes(selectedCategory)) setSelectedCategory(parsed[0]);
        }
      } catch (e) {}
    })();
  }, []);

  const saveCategories = async (cats) => {
    try { await AsyncStorage.setItem('categories', JSON.stringify(cats)); } catch (e) {}
  };

  const addCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return Alert.alert('Hata', 'Lütfen bir kategori adı girin!');
    if (categories.includes(name)) return Alert.alert('Hata', 'Bu kategori zaten mevcut!');
    const newCats = [...categories, name];
    setCategories(newCats);
    saveCategories(newCats);
    setNewCategoryName('');
    setShowAddCategory(false);
    Alert.alert('Başarılı', `"${name}" kategorisi eklendi!`);
  };

  const confirmDeleteCategory = (cat) => {
    if (defaultCategories.includes(cat)) return Alert.alert('Hata', 'Varsayılan kategoriler silinemez!');
    setCategoryToDelete(cat);
  };

  const deleteCategory = () => {
    if (!categoryToDelete) return;
    const newCats = categories.filter(c => c !== categoryToDelete);
    setCategories(newCats);
    saveCategories(newCats);
    if (selectedCategory === categoryToDelete) setSelectedCategory(newCats[0] || defaultCategories[0]);
    setCategoryToDelete(null);
    Alert.alert('Başarılı', `"${categoryToDelete}" kategorisi silindi!`);
  };

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
    const actualDuration = initialTimer - timer;
    const successRate = Math.round((actualDuration / initialTimer) * 100);
    const status = isCompleted ? 'TAMAMLANDI' : 'YARIDA KALDI';
    
    // Bildirim gönder
    if (isCompleted) {
      await sendNotification(
        '🎉 Tebrikler!',
        `${selectedCategory} çalışmanızı başarıyla tamamladınız! Harika iş çıkardınız! 🌟`
      );
    } else {
      await sendNotification(
        '📝 Çalışma Duraklatıldı',
        `${selectedCategory} çalışmanız yarıda kaldı. Tekrar bekliyorum, devam edebilirsiniz! 💪`
      );
    }
    
    setSummaryData({ category: selectedCategory, duration: actualDuration, distractionCount, isCompleted, successRate, status });
    setShowSummary(true);
    try {
      await insertSession(selectedCategory, initialTimer, actualDuration, successRate, status, distractionCount);
    } catch (e) {
      Alert.alert("Hata", "Session kaydedilemedi!");
    }
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
      Alert.alert("Çalışma Verileri Kaydedilsin mi?", "Çalışma programınızı henüz bitirmediniz. Mevcut ilerlemeyi kaydetmek ister misiniz?", [
        { text: "Kaydetme", style: "cancel", onPress: () => { setSessionStarted(false); setDistractionCount(0); setIsRunning(false); setTimer(targetMinutes * 60); }},
        { text: "Kaydet", onPress: () => { handleSessionComplete(false); setTimer(targetMinutes * 60); }}
      ]);
    } else {
      setIsRunning(false);
      setTimer(targetMinutes * 60);
    }
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const closeSummary = () => {
    setShowSummary(false);
    setSummaryData(null);
    setTimer(targetMinutes * 60);
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
              onLongPress={() => !sessionStarted && confirmDeleteCategory(category)}
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
          
          {/* Kategori Ekle Butonu */}
          <TouchableOpacity 
            style={[styles.categoryButton, styles.addCategoryButton]}
            onPress={() => !sessionStarted && setShowAddCategory(true)}
            disabled={sessionStarted}
          >
            <Text style={styles.addCategoryText}>+ Ekle</Text>
          </TouchableOpacity>
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

      {/* Session Summary Modal */}
      <Modal
        visible={showSummary}
        transparent={true}
        animationType="fade"
        onRequestClose={closeSummary}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>
              {summaryData?.isCompleted ? '🎉 Tebrikler!' : '📊 Seans Özeti'}
            </Text>
            
            <View style={styles.summaryContent}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Kategori:</Text>
                <Text style={styles.summaryValue}>{summaryData?.category}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Süre:</Text>
                <Text style={styles.summaryValue}>
                  {Math.floor((summaryData?.duration || 0) / 60)} dakika {(summaryData?.duration || 0) % 60} saniye
                </Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Dikkat Dağınıklığı:</Text>
                <Text style={[styles.summaryValue, styles.distractionValue]}>
                  {summaryData?.distractionCount} kez
                </Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Başarı Oranı:</Text>
                <Text style={styles.summaryValue}>%{summaryData?.successRate}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Durum:</Text>
                <Text style={[
                  styles.summaryValue, 
                  summaryData?.isCompleted ? styles.statusCompleted : styles.statusIncomplete
                ]}>
                  {summaryData?.status}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={closeSummary}
            >
              <Text style={styles.closeButtonText}>Tamam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Kategori Ekleme Modalı */}
      <Modal
        visible={showAddCategory}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddCategory(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.inputModalContainer}>
            <Text style={styles.inputModalTitle}>Yeni Kategori Ekle</Text>
            
            <TextInput
              style={styles.categoryInput}
              placeholder="Kategori adı..."
              placeholderTextColor="#94A3B8"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              maxLength={20}
              autoFocus={true}
            />
            
            <View style={styles.modalButtonRow}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setShowAddCategory(false);
                  setNewCategoryName('');
                }}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]} 
                onPress={addCategory}
              >
                <Text style={styles.confirmButtonText}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Kategori Silme Modalı */}
      <Modal
        visible={categoryToDelete !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCategoryToDelete(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.inputModalContainer}>
            <Text style={styles.inputModalTitle}>Kategori Sil</Text>
            <Text style={styles.deleteWarningText}>
              "{categoryToDelete}" kategorisini silmek istediğinizden emin misiniz?
            </Text>
            
            <View style={styles.modalButtonRow}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setCategoryToDelete(null)}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.deleteButton]} 
                onPress={deleteCategory}
              >
                <Text style={styles.confirmButtonText}>Sil</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, paddingBottom: 20, backgroundColor: '#F5F1E8', alignItems: 'center' },
  headerTitle: { fontSize: 30, fontWeight: '800', color: '#6B5B3D', marginBottom: 20, letterSpacing: 0.8, textShadowColor: 'rgba(107, 91, 61, 0.2)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 6 },
  sectionLabel: { fontSize: 15, color: '#475569', marginBottom: 8, marginLeft: 12, alignSelf: 'flex-start', fontWeight: '600', letterSpacing: 0.3 },
  categoryWrapper: { height: 90, width: '100%', backgroundColor: '#E8EFE0', borderRadius: 20, marginVertical: 8, paddingVertical: 10, shadowColor: '#7C9D6B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6 },
  scrollArea: { paddingLeft: 10 },
  categoryButton: { backgroundColor: '#F1F5F9', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 8, height: 42, justifyContent: 'center', borderWidth: 2, borderColor: 'transparent', shadowColor: '#64748B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  categoryButtonActive: { backgroundColor: '#F0F5EB', borderColor: '#7C9D6B', borderWidth: 2, shadowColor: '#7C9D6B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 6 },
  categoryText: { color: '#64748B', fontWeight: '600', fontSize: 14, letterSpacing: 0.2 },
  categoryTextActive: { color: '#7C9D6B', fontWeight: '700', textShadowColor: 'rgba(124, 157, 107, 0.18)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  activeIndicator: { marginTop: 6, width: '60%', height: 3, backgroundColor: '#7C9D6B', borderRadius: 3, alignSelf: 'center' },
  categoryButtonDisabled: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', opacity: 0.6 },
  categoryTextDisabled: { color: '#94A3B8' },
  adjusterContainer: { width: '90%', marginVertical: 10, padding: 18, backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 20, backdropFilter: 'blur(20px)', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  adjusterControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  adjustBtn: { backgroundColor: '#FFFFFF', width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#D4E3C8', shadowColor: '#7C9D6B', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 8 },
  adjustBtnText: { fontSize: 18, fontWeight: '700', color: '#475569' },
  timeDisplayBox: { paddingHorizontal: 15 },
  timeDisplayText: { fontSize: 32, fontWeight: '800', color: '#1E293B', textShadowColor: 'rgba(0,0,0,0.1)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4, letterSpacing: 1 },
  timerContainer: { alignItems: 'center', marginVertical: 20, backgroundColor: 'rgba(255, 255, 255, 0.95)', paddingVertical: 28, paddingHorizontal: 40, borderRadius: 32, shadowColor: '#7C9D6B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 12, borderWidth: 2, borderColor: 'rgba(124, 157, 107, 0.1)' },
  counterText: { fontSize: 76, fontWeight: '900', color: '#0F172A', fontVariant: ['tabular-nums'], textShadowColor: 'rgba(0,0,0,0.1)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 6, letterSpacing: 2 },
  currentTaskText: { fontSize: 18, color: '#64748B', marginTop: 8, fontWeight: '500', letterSpacing: 0.3 },
  buttonRow: { flexDirection: 'row', gap: 20, marginTop: 15, marginBottom: 30 },
  button: { paddingVertical: 20, paddingHorizontal: 38, borderRadius: 32, minWidth: 150, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 10 },
  btnStart: { backgroundColor: '#7C9D6B', shadowColor: '#7C9D6B' },
  btnPause: { backgroundColor: '#C19A6B', shadowColor: '#C19A6B' },
  btnReset: { backgroundColor: '#8B9A7E', shadowColor: '#8B9A7E' },
  btnText: { color: 'white', fontSize: 16, fontWeight: '700', letterSpacing: 0.5, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  distractionText: { fontSize: 15, color: '#DC2626', marginTop: 8, fontWeight: '700', letterSpacing: 0.2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' },
  summaryContainer: { width: '85%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 15 },
  summaryTitle: { fontSize: 26, fontWeight: '800', color: '#6B5B3D', textAlign: 'center', marginBottom: 24, letterSpacing: 0.5 },
  summaryContent: { marginBottom: 24 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  summaryLabel: { fontSize: 16, fontWeight: '600', color: '#64748B', flex: 1 },
  summaryValue: { fontSize: 16, fontWeight: '700', color: '#1E293B', flex: 1, textAlign: 'right' },
  distractionValue: { color: '#DC2626' },
  statusCompleted: { color: '#7C9D6B' },
  statusIncomplete: { color: '#C19A6B' },
  closeButton: { backgroundColor: '#7C9D6B', borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: '#7C9D6B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  closeButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  addCategoryButton: { backgroundColor: '#7C9D6B', borderColor: '#7C9D6B', borderWidth: 2 },
  addCategoryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, letterSpacing: 0.3 },
  inputModalContainer: { width: '85%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 15 },
  inputModalTitle: { fontSize: 24, fontWeight: '800', color: '#6B5B3D', textAlign: 'center', marginBottom: 20, letterSpacing: 0.5 },
  categoryInput: { backgroundColor: '#F1F5F9', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, color: '#1E293B', borderWidth: 2, borderColor: '#E2E8F0', marginBottom: 20 },
  deleteWarningText: { fontSize: 16, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 24 },
  modalButtonRow: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  cancelButton: { backgroundColor: '#F1F5F9', borderWidth: 2, borderColor: '#E2E8F0' },
  confirmButton: { backgroundColor: '#7C9D6B' },
  deleteButton: { backgroundColor: '#DC2626' },
  cancelButtonText: { color: '#64748B', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  confirmButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
