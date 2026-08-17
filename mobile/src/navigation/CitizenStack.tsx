import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ComplaintDetailScreen from '../screens/citizen/ComplaintDetailScreen';
import CitizenTabs from './CitizenTabs';
import { screenOptions, modalScreenOptions } from './screenOptions';
import { CitizenStackParamList } from './types';

const Stack = createNativeStackNavigator<CitizenStackParamList>();

export default function CitizenStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="CitizenTabs" component={CitizenTabs} options={{ headerShown: false }} />
      <Stack.Screen name="ComplaintDetail" component={ComplaintDetailScreen} options={{ ...modalScreenOptions, title: 'Complaint' }} />
    </Stack.Navigator>
  );
}
