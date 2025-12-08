import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchSessions } from '../services/db';
import Svg, { Path, Circle } from 'react-native-svg';

const screenWidth = Dimensions.get('window').width - 40; 

export default function ReportScreen() {
  const [sessions, setSessions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const data = await fetchSessions();
    setSessions(data || []);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);


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


    const colors = ['#7C9D6B', '#C19A6B', '#8B9A7E', '#A8BF92', '#9C8F7A', '#B3C59F', '#8A7968'];
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

  // Modern Bar Chart Komponenti
  const renderModernBarChart = () => {
    if (!barData || barData.length === 0) {
      return <Text style={{ textAlign: 'center', color: '#94A3B8', marginTop: 12, fontSize: 14 }}>Gösterilecek veri yok.</Text>;
    }

    const maxValue = Math.max(...barData, 1);
    
    return (
      <View style={styles.modernChartContainer}>
        {barLabels.map((label, index) => {
          const value = barData[index];
          const heightPercentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          const barHeight = Math.max(heightPercentage * 1.5, 4); // Minimum görünürlük için 4px
          
          return (
            <View key={index} style={styles.barWrapper}>
              <View style={styles.barContainer}>
                <Text style={styles.barValue}>{value > 0 ? value : ''}</Text>
                <View style={styles.barTrack}>
                  <View 
                    style={[
                      styles.barFill, 
                      { 
                        height: `${heightPercentage}%`,
                        backgroundColor: value > 0 ? '#7C9D6B' : '#E2E8F0'
                      }
                    ]} 
                  />
                </View>
              </View>
              <Text style={styles.barLabel}>{label}</Text>
            </View>
          );
        })}
      </View>
    );
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
    
    // Pasta grafiği parametreleri
    const size = 240;
    const radius = 90;
    const centerX = size / 2;
    const centerY = size / 2;
    const innerRadius = 50; // Donut için iç boşluk
    
    // Her dilim için açı hesapla
    let cumulativeAngle = 0;
    const slices = pieChartData.map((item) => {
      const percentage = total > 0 ? (item.population / total) : 0;
      const angle = percentage * 360;
      const slice = {
        ...item,
        percentage: percentage * 100,
        startAngle: cumulativeAngle,
        sweepAngle: angle
      };
      cumulativeAngle += angle;
      return slice;
    });
    
    // Pasta dilimi için SVG path oluştur
    const createPieSlice = (startAngle, sweepAngle, outerRadius, innerRadius) => {
      const startAngleRad = (startAngle - 90) * Math.PI / 180;
      const endAngleRad = (startAngle + sweepAngle - 90) * Math.PI / 180;
      
      const x1 = centerX + outerRadius * Math.cos(startAngleRad);
      const y1 = centerY + outerRadius * Math.sin(startAngleRad);
      const x2 = centerX + outerRadius * Math.cos(endAngleRad);
      const y2 = centerY + outerRadius * Math.sin(endAngleRad);
      
      const x3 = centerX + innerRadius * Math.cos(endAngleRad);
      const y3 = centerY + innerRadius * Math.sin(endAngleRad);
      const x4 = centerX + innerRadius * Math.cos(startAngleRad);
      const y4 = centerY + innerRadius * Math.sin(startAngleRad);
      
      const largeArc = sweepAngle > 180 ? 1 : 0;
      
      return `
        M ${x1} ${y1}
        A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}
        L ${x3} ${y3}
        A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}
        Z
      `;
    };
    
    return (
      <View style={styles.pieChartContainer}>
        {/* Pasta Grafiği */}
        <View style={styles.pieChartWrapper}>
          <Svg width={size} height={size}>
            {slices.map((slice, index) => (
              <Path
                key={`slice-${index}`}
                d={createPieSlice(slice.startAngle, slice.sweepAngle, radius, innerRadius)}
                fill={slice.color}
                stroke="white"
                strokeWidth={2}
              />
            ))}
            {/* Merkez daire (isteğe bağlı dekorasyon) */}
            <Circle
              cx={centerX}
              cy={centerY}
              r={innerRadius - 2}
              fill="white"
              stroke="#E2E8F0"
              strokeWidth={1}
            />
          </Svg>
        </View>
        
        {/* Legend (Açıklama) */}
        <View style={styles.legendContainer}>
          {slices.map((slice, index) => (
            <View key={`legend-${index}`} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: slice.color }]} />
              <Text style={styles.legendText}>
                {slice.name}: {slice.population} dk ({slice.percentage.toFixed(0)}%)
              </Text>
            </View>
          ))}
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4338CA']}
            tintColor="#4338CA"
          />
        }
        ListEmptyComponent={<Text style={{textAlign:'center', marginTop: 40, color:'#64748B', fontSize: 16, fontWeight: '500'}}>Henüz kayıt bulunmuyor.</Text>}
        ListHeaderComponent={() => (
          <View>

            <View style={{ marginBottom: 20 }}>
              <Text style={styles.chartTitle}>Genel İstatistikler</Text>
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{generalStats.todayTotal}</Text>
                  <Text style={styles.statLabel}>Bugün Toplam Odaklanma Süresi (dk)</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{generalStats.allTimeTotal}</Text>
                  <Text style={styles.statLabel}>Tüm Zamanların Toplam Odaklanma Süresi (dk)</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{generalStats.totalDistractions}</Text>
                  <Text style={styles.statLabel}>Toplam Dikkat Dağınıklığı Sayısı</Text>
                </View>
              </View>
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={styles.chartTitle}>Son 7 Gün Odaklanma Süresi</Text>
              {renderModernBarChart()}
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
    backgroundColor: '#E0E7FF'
  },
  headerTitle: { 
    fontSize: 30, 
    fontWeight: '800', 
    padding: 20, 
    color: '#4338CA',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(67, 56, 202, 0.2)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6
  },
  chartTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 14, 
    marginLeft: 10, 
    color: '#1E293B',
    letterSpacing: 0.3
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { 
    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
    borderRadius: 24, 
    padding: 22, 
    marginBottom: 18, 
    borderWidth: 1, 
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
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
    height: 12, 
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
    backgroundColor: 'rgba(232, 239, 224, 0.95)', 
    padding: 20, 
    borderRadius: 24, 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(124, 157, 107, 0.3)',
    shadowColor: '#7C9D6B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    backdropFilter: 'blur(10px)'
  },
  statNumber: { 
    fontSize: 30, 
    fontWeight: '800', 
    color: '#7C9D6B', 
    marginBottom: 6,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(124, 157, 107, 0.3)',
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
  
  // Modern Bar Chart Styles
  modernChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 20,
    paddingTop: 30,
    borderRadius: 20,
    height: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.5)',
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
    paddingBottom: 8,
  },
  barValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B5B3D',
    marginBottom: 6,
    minHeight: 18,
  },
  barTrack: {
    width: '80%',
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    minHeight: 40,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  barFill: {
    width: '100%',
    borderRadius: 8,
    minHeight: 4,
    shadowColor: '#7C9D6B',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  
  // Pie Chart Styles
  pieChartContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.5)',
  },
  pieChartWrapper: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
  },
  legendContainer: {
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  legendColor: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  
});