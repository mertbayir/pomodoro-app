import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchSessions } from '../services/db';

// NOTE: This file uses `react-native-chart-kit` and `react-native-svg`.
// Install with:
// npm install react-native-chart-kit react-native-svg
// or
// yarn add react-native-chart-kit react-native-svg

import { BarChart } from 'react-native-chart-kit';
// PieChart removed - causing undefined color errors

const screenWidth = Dimensions.get('window').width - 40; // padding

export default function ReportScreen() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    const data = await fetchSessions();
    setSessions(data || []);
    setLoading(false);
  };

  // Prepare chart data: last 7 days totals (actual_duration) and category distribution + general stats
  const { barData, barLabels, pieData, generalStats } = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return { 
        barData: [0,0,0,0,0,0,0], 
        barLabels: [], 
        pieData: [],
        generalStats: { todayTotal: 0, allTimeTotal: 0, totalDistractions: 0 }
      };
    }

    // Helper: normalize date to YYYY-MM-DD
    const toDayKey = (iso) => {
      const d = new Date(iso);
      const y = d.getFullYear();
      const m = String(d.getMonth()+1).padStart(2,'0');
      const day = String(d.getDate()).padStart(2,'0');
      return `${y}-${m}-${day}`;
    };

    // Build last 7 day keys (from 6 days ago -> today)
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(toDayKey(d.toISOString()));
    }

    const dayTotals = Object.fromEntries(days.map(k => [k, 0]));

    // Category totals and general stats
    const catTotals = {};
    const today = toDayKey(new Date().toISOString());
    let todayTotal = 0;
    let allTimeTotal = 0;
    let totalDistractions = 0;

    sessions.forEach(s => {
      const key = toDayKey(s.date || s.date_created || s.created_at || new Date().toISOString());
      const actual = Number(s.actual_duration) || 0;
      const distractions = Number(s.distraction_count) || 0;
      
      if (key in dayTotals) dayTotals[key] += actual;

      const cat = s.category || 'Diğer';
      catTotals[cat] = (catTotals[cat] || 0) + actual;

      // General stats
      if (key === today) todayTotal += actual;
      allTimeTotal += actual;
      totalDistractions += distractions;
    });

    const barLabels = days.map(d => {
      const dt = new Date(d + 'T00:00:00');
      return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
    });

    const barData = days.map(d => Math.round((dayTotals[d] || 0) / 60)); // minutes

    // Pie data: convert category totals to chart format
    const colors = ['#4CAF50', '#FF9800', '#2196F3', '#9C27B0', '#F44336', '#FFEB3B', '#607D8B'];
    const pieData = Object.keys(catTotals).map((cat, idx) => ({
      name: cat,
      minutes: Math.round(catTotals[cat] / 60),
      color: colors[idx % colors.length],
      legendFontColor: '#333',
      legendFontSize: 12
    })).filter(p => p.minutes > 0);

    const generalStats = {
      todayTotal: Math.round(todayTotal / 60), // dakika
      allTimeTotal: Math.round(allTimeTotal / 60), // dakika
      totalDistractions
    };

    return { barData, barLabels, pieData, generalStats };
  }, [sessions]);

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

  // Custom pie chart replacement using simple bars/legend
  const renderCategoryChart = (pieChartData) => {
    if (!pieChartData || pieChartData.length === 0) {
      return <Text style={{ textAlign: 'center', color: '#999', marginTop: 10 }}>Gösterilecek kategori verisi yok.</Text>;
    }

    const total = pieChartData.reduce((sum, p) => sum + p.population, 0);
    
    return (
      <View style={{ padding: 15, backgroundColor: '#F9FAFB', borderRadius: 12 }}>
        {pieChartData.map((p, i) => {
          const percentage = total > 0 ? Math.round((p.population / total) * 100) : 0;
          return (
            <View key={i} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 16, height: 16, backgroundColor: p.color || '#BBB', marginRight: 8, borderRadius: 3 }} />
                  <Text style={{ color: '#333', fontWeight: '500' }}>{p.name}</Text>
                </View>
                <Text style={{ color: '#666', fontSize: 12 }}>{p.population} dk (%{percentage})</Text>
              </View>
              <View style={{ height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ 
                  width: `${percentage}%`, 
                  height: '100%', 
                  backgroundColor: p.color || '#BBB',
                  borderRadius: 3 
                }} />
              </View>
            </View>
          );
        })}
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
        ListHeaderComponent={() => (
          <View>
            {/* General Statistics */}
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.chartTitle}>Genel İstatistikler</Text>
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{generalStats.todayTotal}</Text>
                  <Text style={styles.statLabel}>Bugün Toplam (dk)</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{generalStats.allTimeTotal}</Text>
                  <Text style={styles.statLabel}>Tüm Zamanlar (dk)</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{generalStats.totalDistractions}</Text>
                  <Text style={styles.statLabel}>Toplam Dikkat Dağınıklığı</Text>
                </View>
              </View>
            </View>

            {/* Bar Chart - Last 7 days */}
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.chartTitle}>Son 7 Gün (Dakika)</Text>
              {barLabels && barLabels.length > 0 ? (
                <BarChart
                  data={{ labels: barLabels, datasets: [{ data: barData }] }}
                  width={screenWidth}
                  height={220}
                  fromZero
                  chartConfig={{
                    backgroundGradientFrom: '#fff',
                    backgroundGradientTo: '#fff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(0,122,255, ${opacity})`,
                    labelColor: () => '#444',
                  }}
                  style={{ borderRadius: 12 }}
                />
              ) : (
                <Text style={{ textAlign: 'center', color: '#999', marginTop: 10 }}>Gösterilecek veri yok.</Text>
              )}
            </View>

            {/* Pie Chart - Category distribution */}
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.chartTitle}>Kategori Dağılımı (Dakika)</Text>
              {pieData && pieData.length > 0 ? (
                  (() => {
                    // prepare safe pie data
                    const pieChartData = pieData.map((p, idx) => {
                      if (!p) return null;
                      return {
                        name: p.name || `Kategori ${idx+1}`,
                        population: Number(p.minutes) || 0,
                        color: p.color || '#BBBBBB',
                        legendFontColor: p.legendFontColor || '#333',
                        legendFontSize: p.legendFontSize || 12
                      };
                    }).filter(Boolean).filter(x => x.population > 0);

                    console.log('📈 pieChartData', pieChartData);

                    if (pieChartData.length === 0) {
                      return <Text style={{ textAlign: 'center', color: '#999', marginTop: 10 }}>Gösterilecek kategori verisi yok.</Text>;
                    }

                    return renderCategoryChart(pieChartData);
                  })()
                ) : (
                <Text style={{ textAlign: 'center', color: '#999', marginTop: 10 }}>Gösterilecek kategori verisi yok.</Text>
              )}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', padding: 20, color: '#333' },
  chartTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, marginLeft: 5, color: '#333' },
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
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  statCard: { 
    flex: 1, 
    backgroundColor: '#F0F8FF', 
    padding: 15, 
    borderRadius: 12, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E3F2FD'
  },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#1976D2', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#666', textAlign: 'center', fontWeight: '500' },
});