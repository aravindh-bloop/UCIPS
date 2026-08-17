import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CitizenHomeScreen from '../screens/citizen/CitizenHomeScreen';
import NearbyHotspotsScreen from '../screens/citizen/NearbyHotspotsScreen';
import NewComplaintScreen from '../screens/citizen/NewComplaintScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TabBar from './components/TabBar';
import { CitizenTabParamList } from './types';

const Tab = createBottomTabNavigator<CitizenTabParamList>();

export default function CitizenTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={CitizenHomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Report" component={NewComplaintScreen} options={{ title: 'Report' }} />
      <Tab.Screen name="Nearby" component={NearbyHotspotsScreen} options={{ title: 'Nearby' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
