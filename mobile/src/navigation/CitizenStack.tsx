import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ComplaintDetailScreen from '../screens/citizen/ComplaintDetailScreen';
import CitizenTabs from './CitizenTabs';
import { screenOptions, modalScreenOptions } from './screenOptions';
import { CitizenStackParamList } from './types';

import NotificationsScreen from '../screens/citizen/NotificationsScreen';
import MenuScreen from '../screens/citizen/MenuScreen';

const Stack = createNativeStackNavigator<CitizenStackParamList>();

export default function CitizenStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="CitizenTabs" component={CitizenTabs} options={{ headerShown: false }} />
      <Stack.Screen name="ComplaintDetail" component={ComplaintDetailScreen} options={{ ...modalScreenOptions, title: 'Complaint' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Menu" component={MenuScreen} options={{ ...modalScreenOptions, headerShown: false }} />
    </Stack.Navigator>

  );
}
