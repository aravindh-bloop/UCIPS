import AsyncStorage from '@react-native-async-storage/async-storage';
import { Token } from '../api/types';

const KEY = 'ucips.auth.token';

export async function saveToken(token: Token): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(token));
}

export async function loadToken(): Promise<Token | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as Token) : null;
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
