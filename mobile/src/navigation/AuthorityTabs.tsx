import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import BudgetOptimizerScreen from '../screens/authority/BudgetOptimizerScreen';
import HotspotsScreen from '../screens/authority/HotspotsScreen';
import ProjectsScreen from '../screens/authority/ProjectsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TabBar from './components/TabBar';
import { AuthorityTabParamList } from './types';

const Tab = createBottomTabNavigator<AuthorityTabParamList>();

export default function AuthorityTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Hotspots" component={HotspotsScreen} options={{ title: 'Hotspots' }} />
      <Tab.Screen name="Projects" component={ProjectsScreen} options={{ title: 'Projects' }} />
      <Tab.Screen name="Budget" component={BudgetOptimizerScreen} options={{ title: 'Budget' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
