import { useAuth } from '../auth/AuthContext';
import AuthorityStack from './AuthorityStack';
import AuthStack from './AuthStack';
import CitizenStack from './CitizenStack';

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <AuthStack />;
  }

  if (user.role === 'authority') {
    return <AuthorityStack />;
  }

  return <CitizenStack />;
}
