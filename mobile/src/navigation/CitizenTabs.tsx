import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CitizenHomeScreen from '../screens/citizen/CitizenHomeScreen';
import NearbyHotspotsScreen from '../screens/citizen/NearbyHotspotsScreen';
import NewComplaintScreen from '../screens/citizen/NewComplaintScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TabBar from './components/TabBar';
import { CitizenTabParamList } from './types';
import { useLanguage } from '../i18n';

const Tab = createBottomTabNavigator<CitizenTabParamList>();

export default function CitizenTabs() {
  const { t } = useLanguage();

  return (
    <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={CitizenHomeScreen} options={{ title: t('nav.home') }} />
      <Tab.Screen name="Report" component={NewComplaintScreen} options={{ title: t('nav.report') }} />
      <Tab.Screen name="Nearby" component={NearbyHotspotsScreen} options={{ title: t('nav.nearby') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t('nav.profile') }} />
    </Tab.Navigator>
  );
}
