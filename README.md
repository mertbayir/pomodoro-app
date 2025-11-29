# 🍅 Pomodoro Odaklanma Uygulaması

Sakarya Üniversitesi Bilgisayar Mühendisliği Güz Dönemi Mobil Uygulama Geliştirme Dersi için geliştirildi. Modern ve şık tasarımlı Pomodoro tekniği uygulaması. Odaklanmanızı artırın, verimliliğinizi takip edin.

## ✨ Özellikler

### 🎯 Odak Zamanlayıcısı
- **Özelleştirilebilir süre**: Esnek ayarlanabilir süre ile tercihlerinizi yönetin
- **Kategori seçimi**: Kodlama, Ders Çalışma, Proje, Ödev, Kitap Okuma ve daha fazlası
- **Akıllı duraklatma**: Arka plana geçtiğinizde otomatik algılama
- **Dikkat dağınıklığı takibi**: Kaç kez odaktan çıktığınızı izleyin

### 📊 Detaylı Raporlama
- **Günlük/Haftalık istatistikler**: Performansınızı görselleştirin
- **Kategori analizi**: Hangi konularda daha çok çalıştığınızı keşfedin
- **Başarı oranları**: Hedeflerinize ne kadar ulaştığınızı ölçün
- **Interaktif grafikler**: Gelişiminizi takip edin

## 🚀 Kurulum

### Gereksinimler
- Node.js 16+
- Expo CLI
- React Native geliştirme ortamı

### Adımlar

1. **Projeyi klonlayın**
```bash
git clone https://github.com/mertbayir/pomodoro-app.git
cd pomodoro-app
```

2. **Bağımlılıkları yükleyin**
```bash
cd pomodoroApp
npm install
```

3. **Uygulamayı başlatın**
```bash
npm start
# veya
expo start
```

4. **Expo Go ile test edin**
   - Mobil cihazınıza Expo Go uygulamasını indirin
   - QR kodu tarayın veya emülatörde çalıştırın

## 📱 Kullanım

### 🎯 Pomodoro Seansı Başlatma
1. **Kategori seçin**: Çalışacağınız konuyu belirleyin
2. **Süre ayarlayın**: +/- butonları ile dakika ayarlayın (varsayılan: 25dk)
3. **Start'a basın**: Odaklanma zamanı başladı!
4. **Ara vermek için Pause**: Gerektiğinde duraklatabilirsiniz

### 📊 İlerlemenizi İzleyin
- **Raporlar** sekmesinden detaylı analizlere ulaşın
- Günlük, haftalık ve genel istatistikleri görüntüleyin
- Kategori bazında performansınızı inceleyin

## 🛠️ Teknoloji Stack

- **Frontend**: React Native + Expo
- **Navigation**: React Navigation v6
- **Database**: SQLite (expo-sqlite)
- **Charts**: react-native-chart-kit
- **Icons**: @expo/vector-icons
- **State Management**: React Hooks

## 📊 Proje Yapısı

```
pomodoroApp/
├── App.js                 # Ana uygulama ve navigasyon
├── screens/
│   ├── HomeScreen.js     # Pomodoro zamanlayıcısı ekranı
│   └── ReportScreen.js   # Raporlama ve analiz ekranı
├── services/
│   └── db.js            # SQLite veritabanı işlemleri
├── assets/              # Görseller ve kaynaklar
└── package.json         # Proje bağımlılıkları
```

## 🎨 Özellikler Detay

### Akıllı Takip Sistemi
- **Otomatik session kaydı**: Her çalışma seansınız otomatik kaydedilir
- **Başarı oranı hesaplama**: Hedeflenen süreye ne kadar ulaştığınız
- **Dikkat dağınıklığı metrikleri**: Uygulamadan kaç kez çıktığınız
- **Zaman dilimi analizi**: Hangi saatlerde daha verimli olduğunuz

### Veri Güvenliği
- **Lokal depolama**: Tüm veriler cihazınızda güvenle saklanır
- **Offline çalışma**: İnternet bağlantısı gerektirmez
- **Veri kaybı koruması**: SQLite ile güvenilir veri saklama

## 🤝 Katkıda Bulunma

1. Bu projeyi fork edin
2. Feature branch oluşturun (`git checkout -b feature/AmazingFeature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add some AmazingFeature'`)
4. Branch'inizi push edin (`git push origin feature/AmazingFeature`)
5. Pull Request oluşturun

## 👨‍💻 Geliştirici

**Mert Bayır**
- GitHub: [@mertbayir](https://github.com/mertbayir)

---

⭐ Bu projeyi beğendiyseniz yıldız vermeyi unutmayın!

---

🍅 **Happy Focusing!** - Pomodoro tekniği ile verimliliğinizi artırın!
