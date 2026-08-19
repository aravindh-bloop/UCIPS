// USB debugging without shared wifi: run these before `npx expo start`
//   adb reverse tcp:8081 tcp:8081
//   adb reverse tcp:8010 tcp:8010
// (npm run dev:android does both, see package.json)
// On shared wifi instead, swap this to your machine's LAN IP, e.g. "http://192.168.1.23:8010".
export const API_BASE_URL = 'http://172.16.59.188:8010';
