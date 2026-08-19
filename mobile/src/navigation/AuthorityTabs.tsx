import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AllComplaintsScreen from '../screens/authority/AllComplaintsScreen';
import BudgetOptimizerScreen from '../screens/authority/BudgetOptimizerScreen';
import HotspotsScreen from '../screens/authority/HotspotsScreen';
import ProjectsScreen from '../screens/authority/ProjectsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TabBar from './components/TabBar';
import { AuthorityTabParamList } from './types';
import { useLanguage } from '../i18n';

const Tab = createBottomTabNavigator<AuthorityTabParamList>();

export default function AuthorityTabs() {
  const { t } = useLanguage();

  return (
    <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Hotspots" component={HotspotsScreen} options={{ title: t('nav.hotspots') }} />
      <Tab.Screen name="Reports" component={AllComplaintsScreen} options={{ title: t('nav.reports') }} />
      <Tab.Screen name="Projects" component={ProjectsScreen} options={{ title: t('nav.projects') }} />
      <Tab.Screen name="Budget" component={BudgetOptimizerScreen} options={{ title: t('nav.budget') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t('nav.profile') }} />
    </Tab.Navigator>
  );
}
