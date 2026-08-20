import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ComplaintDetailScreen from '../screens/citizen/ComplaintDetailScreen';
import HotspotDetailScreen from '../screens/authority/HotspotDetailScreen';
import BondsListScreen from '../screens/BondsListScreen';
import BondDetailScreen from '../screens/BondDetailScreen';
import AuthorityTabs from './AuthorityTabs';
import { modalScreenOptions, screenOptions } from './screenOptions';
import { AuthorityStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthorityStackParamList>();

export default function AuthorityStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="AuthorityTabs" component={AuthorityTabs} options={{ headerShown: false }} />
      <Stack.Screen name="HotspotDetail" component={HotspotDetailScreen} options={{ ...modalScreenOptions, title: 'Hotspot Complaints' }} />
      <Stack.Screen name="ComplaintDetail" component={ComplaintDetailScreen} options={{ ...modalScreenOptions, title: 'Report Detail' }} />
      <Stack.Screen name="BondsList" component={BondsListScreen} options={{ ...modalScreenOptions, headerShown: false }} />
      <Stack.Screen name="BondDetail" component={BondDetailScreen} options={{ ...modalScreenOptions, headerShown: false }} />
    </Stack.Navigator>
  );
}
