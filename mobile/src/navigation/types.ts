import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

/** Citizen: tabs live inside a stack so detail screens push full-screen over the tab bar. */
export type CitizenStackParamList = {
  CitizenTabs: undefined;
  ComplaintDetail: { complaintId: number };
};

export type CitizenTabParamList = {
  Home: undefined;
  Report: undefined;
  Nearby: undefined;
  Profile: undefined;
};

export type AuthorityStackParamList = {
  AuthorityTabs: undefined;
  HotspotDetail: { clusterId: number };
  ComplaintDetail: { complaintId: number };
};

export type AuthorityTabParamList = {
  Hotspots: undefined;
  Reports: undefined;
  Projects: undefined;
  Budget: undefined;
  Profile: undefined;
};

/**
 * Composite props for tab screens that also need to push onto the parent stack
 * (e.g. Home -> ComplaintDetail, Hotspots -> HotspotDetail).
 */
export type CitizenTabScreenProps<T extends keyof CitizenTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<CitizenTabParamList, T>,
  NativeStackScreenProps<CitizenStackParamList>
>;

export type AuthorityTabScreenProps<T extends keyof AuthorityTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<AuthorityTabParamList, T>,
  NativeStackScreenProps<AuthorityStackParamList>
>;
