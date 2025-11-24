import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchSessions } from '../services/db';

export default function ReportScreen() {
  const [sessions, setSessions] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const data = await fetchSessions();
    setSessions(data);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const formatMinSec = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}dk ${s}sn`;
  };

  const renderItem = ({ item }) => {
    // Başarı oranına göre renk belirleyelim
    let statusColor = '#4CAF50'; // Yeşil (Yüksek başarı)
    if (item.success_rate < 50) statusColor = '#F44336'; // Kırmızı (Düşük)
    else if (item.success_rate < 80) statusColor = '#FF9800'; // Turuncu (Orta)

    return (
      <View style={styles.card}>
        {/* Üst Kısım: Kategori ve Tarih */}
        <View style={styles.cardHeader}>
          <Text style={styles.categoryTitle}>{item.category}</Text>
          <Text style={styles.dateText}>{formatDate(item.date)}</Text>
        </View>

        {/* Orta Kısım: İstatistikler */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Hedef</Text>
            <Text style={styles.statValue}>{formatMinSec(item.target_duration)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Yapılan</Text>
            <Text style={styles.statValue}>{formatMinSec(item.actual_duration)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Dikkat</Text>
            <Text style={styles.statValue}>{item.distraction_count ?? item.distractionCount ?? 0} kez</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Durum</Text>
            <Text style={[styles.statValue, { fontSize: 12 }]}>{item.status}</Text>
          </View>
        </View>

        {/* Alt Kısım: Başarı Çubuğu */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${item.success_rate}%`, backgroundColor: statusColor }]} />
          </View>
          <Text style={[styles.rateText, { color: statusColor }]}>%{item.success_rate}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Text style={styles.headerTitle}>Performans Raporu</Text>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={{textAlign:'center', marginTop: 20, color:'#999'}}>Kayıt yok.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', padding: 20, color: '#333' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#eee' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  categoryTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  dateText: { fontSize: 12, color: '#999' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  statBox: { alignItems: 'center' },
  statLabel: { fontSize: 11, color: '#888' },
  statValue: { fontSize: 14, fontWeight: '600', color: '#444' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBarBackground: { flex: 1, height: 8, backgroundColor: '#e0e0e0', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  rateText: { fontSize: 14, fontWeight: 'bold', width: 40, textAlign: 'right' },
});