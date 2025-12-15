import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Alert, LogBox } from 'react-native';
import HomeScreen from './screens/HomeScreen';
import ReportScreen from './screens/ReportScreen';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { initDB } from './services/db';
import { SessionProvider, useSession } from './contexts/SessionContext';

// Expo Go bildirim uyarısını gizle
LogBox.ignoreLogs([
  'expo-notifications',
  'functionality is not fully supported in Expo Go',
]);

const Tab = createBottomTabNavigator();

function TabNavigator() {
  const { sessionStarted } = useSession();

  const handleReportTabPress = (e, navigation) => {
    if (sessionStarted) {
      e.preventDefault();
      Alert.alert(
        'Dikkat!',
        'Çalışma seansı devam ediyor. Lütfen önce seansı tamamlayın veya sıfırlayın.',
        [{ text: 'Tamam' }]
      );
    }
  };

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderTopWidth: 0,
            elevation: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            height: 70,
            paddingBottom: 15,
            paddingTop: 8,
            borderRadius: 25,
            marginHorizontal: 20,
            marginBottom: 20,
            position: 'absolute'
          },
          tabBarLabelStyle: {
            fontSize: 16,
            fontWeight: '700',
            letterSpacing: 0.5,
            paddingBottom: 5
          },
          tabBarActiveTintColor: '#7C9D6B',
          tabBarInactiveTintColor: '#94A3B8'
        }}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeScreen}
          options={{
            tabBarLabel: 'Odaklan',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="timer" color={color} size={size ?? 22} />
            )
          }}
        />
        <Tab.Screen 
          name="Report" 
          component={ReportScreen}
          options={{
            tabBarLabel: 'Raporlar',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="chart-bar" color={color} size={size ?? 22} />
            )
          }}
          listeners={({ navigation }) => ({
            tabPress: (e) => handleReportTabPress(e, navigation)
          })}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  useEffect(() => {
    initDB();
  }, []);

  return (
    <SessionProvider>
      <TabNavigator />
    </SessionProvider>
  );
}