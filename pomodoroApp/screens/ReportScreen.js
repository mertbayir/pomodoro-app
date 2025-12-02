import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchSessions } from '../services/db';

import { BarChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width - 40; 

export default function ReportScreen() {
  const [sessions, setSessions] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const data = await fetchSessions();
    setSessions(data || []);
  }


  const { barData, barLabels, pieData, generalStats } = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return { 
        barData: [0,0,0,0,0,0,0], 
        barLabels: [], 
        pieData: [],
        generalStats: { todayTotal: 0, allTimeTotal: 0, totalDistractions: 0 }
      };
    }


    const toDayKey = (iso) => {
      const d = new Date(iso);
      const y = d.getFullYear();
      const m = String(d.getMonth()+1).padStart(2,'0');
      const day = String(d.getDate()).padStart(2,'0');
      return `${y}-${m}-${day}`;
    };


    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(toDayKey(d.toISOString()));
    }

    const dayTotals = Object.fromEntries(days.map(k => [k, 0]));


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


      if (key === today) todayTotal += actual;
      allTimeTotal += actual;
      totalDistractions += distractions;
    });

    const barLabels = days.map(d => {
      const dt = new Date(d + 'T00:00:00');
      return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
    });

    const barData = days.map(d => Math.round((dayTotals[d] || 0) / 60));


    const colors = ['#4CAF50', '#FF9800', '#2196F3', '#9C27B0', '#F44336', '#FFEB3B', '#607D8B'];
    const pieData = Object.keys(catTotals).map((cat, idx) => ({
      name: cat,
      minutes: Math.round(catTotals[cat] / 60),
      color: colors[idx % colors.length],
      legendFontColor: '#333',
      legendFontSize: 12
    })).filter(p => p.minutes > 0);

    const generalStats = {
      todayTotal: Math.round(todayTotal / 60),
      allTimeTotal: Math.round(allTimeTotal / 60),
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
    return `${m}dk ${seconds % 60}sn`;
  };

  const renderItem = ({ item }) => {
    let statusColor = '#4CAF50';
    if (item.success_rate < 50) statusColor = '#F44336';
    else if (item.success_rate < 80) statusColor = '#FF9800';

    return (
      <View style={styles.card}>

        <View style={styles.cardHeader}>
          <Text style={styles.categoryTitle}>{item.category}</Text>
          <Text style={styles.dateText}>{formatDate(item.date)}</Text>
        </View>


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


        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${item.success_rate}%`, backgroundColor: statusColor }]} />
          </View>
          <Text style={[styles.rateText, { color: statusColor }]}>%{item.success_rate}</Text>
        </View>
      </View>
    );
  };


  const renderCategoryChart = (pieChartData) => {
    if (!pieChartData || pieChartData.length === 0) {
      return <Text style={{ textAlign: 'center', color: '#94A3B8', marginTop: 12, fontSize: 14, fontWeight: '500' }}>Gösterilecek kategori verisi yok.</Text>;
    }

    const total = pieChartData.reduce((sum, p) => sum + p.population, 0);
    
    return (
      <View style={{ 
        padding: 20, 
        backgroundColor: 'rgba(255, 255, 255, 0.9)', 
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(226, 232, 240, 0.5)'
      }}>
        {pieChartData.map((p, i) => {
          const percentage = total > 0 ? Math.round((p.population / total) * 100) : 0;
          return (
            <View key={i} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ 
                    width: 20, 
                    height: 20, 
                    backgroundColor: p.color || '#94A3B8', 
                    marginRight: 12, 
                    borderRadius: 6,
                    shadowColor: p.color || '#94A3B8',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 3
                  }} />
                  <Text style={{ color: '#1E293B', fontWeight: '600', fontSize: 15, letterSpacing: 0.2 }}>{p.name}</Text>
                </View>
                <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '600' }}>{p.population} dk (%{percentage})</Text>
              </View>
              <View style={{ height: 8, backgroundColor: '#E2E8F0', borderRadius: 6, overflow: 'hidden' }}>
                <View style={{ 
                  width: `${percentage}%`, 
                  height: '100%', 
                  backgroundColor: p.color || '#94A3B8',
                  borderRadius: 6,
                  shadowColor: p.color || '#94A3B8',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.4,
                  shadowRadius: 2
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
        ListEmptyComponent={<Text style={{textAlign:'center', marginTop: 40, color:'#64748B', fontSize: 16, fontWeight: '500'}}>Henüz kayıt bulunmuyor.</Text>}
        ListHeaderComponent={() => (
          <View>

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
  container: { 
    flex: 1, 
    backgroundColor: '#bcd3fdff'
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: '700', 
    padding: 20, 
    color: '#1E293B',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  chartTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 12, 
    marginLeft: 8, 
    color: '#1E293B',
    letterSpacing: 0.3
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { 
    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
    borderRadius: 20, 
    padding: 20, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
    backdropFilter: 'blur(20px)'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  categoryTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1E293B',
    letterSpacing: 0.3
  },
  dateText: { 
    fontSize: 13, 
    color: '#64748B',
    fontWeight: '500'
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  statBox: { alignItems: 'center' },
  statLabel: { 
    fontSize: 12, 
    color: '#64748B',
    fontWeight: '600',
    letterSpacing: 0.2
  },
  statValue: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#1E293B',
    letterSpacing: 0.2
  },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBarBackground: { 
    flex: 1, 
    height: 10, 
    backgroundColor: '#E2E8F0', 
    borderRadius: 6, 
    overflow: 'hidden'
  },
  progressBarFill: { 
    height: '100%', 
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4
  },
  rateText: { 
    fontSize: 15, 
    fontWeight: '800', 
    width: 45, 
    textAlign: 'right',
    letterSpacing: 0.3
  },
  statsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    gap: 12
  },
  statCard: { 
    flex: 1, 
    backgroundColor: 'rgba(238, 242, 255, 0.8)', 
    padding: 18, 
    borderRadius: 20, 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    backdropFilter: 'blur(10px)'
  },
  statNumber: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#6366F1', 
    marginBottom: 6,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(99, 102, 241, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  statLabel: { 
    fontSize: 12, 
    color: '#64748B', 
    textAlign: 'center', 
    fontWeight: '600',
    letterSpacing: 0.3
  },
  
});