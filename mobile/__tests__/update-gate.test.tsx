import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { UpdateGate } from '@/components/update-gate';

import { mockServer } from './helpers';

// Shu build'ning versiyasi
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.1.0' } } }));
jest.mock('expo-updates', () => ({ isEnabled: false, checkForUpdateAsync: jest.fn(), fetchUpdateAsync: jest.fn() }));

const STORE = { ios: 'https://apps.apple.com/app/id6824516767', android: 'https://play.google.com/store/apps/details?id=uz.captar.app' };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
});

describe('majburiy yangilash', () => {
  it("server yangiroq versiyani talab qilsa, yopilmaydigan oyna do'kon sahifasini ochadi", async () => {
    mockServer({ 'GET /api/app/version': () => ({ body: { minVersion: '1.2.0', storeUrl: STORE } }) });
    await render(<UpdateGate />);

    expect(await screen.findByText('Yangi versiya chiqdi')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Yangilash'));
    expect(Linking.openURL).toHaveBeenCalledWith(STORE.ios);
  });

  it("versiya yetarli bo'lsa hech narsa ko'rsatmaydi", async () => {
    const server = mockServer({ 'GET /api/app/version': () => ({ body: { minVersion: '1.1.0', storeUrl: STORE } }) });
    await render(<UpdateGate />);

    await waitFor(() => expect(server.calls).toHaveLength(1));
    expect(screen.queryByText('Yangi versiya chiqdi')).toBeNull();
  });

  it("server javob bermasa ilova to'xtatilmaydi", async () => {
    const server = mockServer({ 'GET /api/app/version': () => new TypeError('Network request failed') });
    await render(<UpdateGate />);

    await waitFor(() => expect(server.calls).toHaveLength(1));
    expect(screen.queryByText('Yangi versiya chiqdi')).toBeNull();
  });
});
