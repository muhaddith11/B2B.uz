import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import LoginScreen from '@/app/login';

import { mockServer, renderWithSession, savedSession, signedIn } from './helpers';

const SHOP = { kind: 'shop', title: "Baraka do'koni", subtitle: 'Chilonzor', imageUrl: null, token: 'tok-shop' };
const AGENT = { kind: 'staff', role: 'AGENT', title: 'Andijon Savdo', subtitle: 'Agent', imageUrl: null, token: 'tok-staff' };

beforeEach(async () => {
  jest.clearAllMocks();
  await signedIn(null);
});

async function enterPhoneAndCode(code = '123456') {
  await fireEvent.changeText(await screen.findByLabelText('Telefon raqamingiz'), '+998 90 123 45 67');
  await fireEvent.press(screen.getByText('Kod olish'));
  await fireEvent.changeText(await screen.findByLabelText('SMS kod'), code);
  await fireEvent.press(screen.getByText('Kirish'));
}

describe('kirish: telefon raqami va SMS kod', () => {
  it("hisob bitta bo'lsa darhol kiradi va sessiya telefonda saqlanadi", async () => {
    const server = mockServer({
      'POST /api/auth/otp/request': () => ({ body: { phone: '+998901234567' } }),
      'POST /api/auth/otp/verify': () => ({ body: { phoneToken: 'pt', accounts: [SHOP] } }),
    });
    await renderWithSession(<LoginScreen />);
    await enterPhoneAndCode();

    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('shop|{}'));
    expect(server.to('POST', '/api/auth/otp/request')[0].body).toEqual({ phone: '+998 90 123 45 67' });
    expect(server.to('POST', '/api/auth/otp/verify')[0].body).toEqual({ phone: '+998 90 123 45 67', code: '123456' });
    expect(savedSession()).toMatchObject({ token: 'tok-shop', kind: 'shop' });
  });

  it("raqam bir nechta hisobga bog'langan bo'lsa tanlatadi", async () => {
    mockServer({
      'POST /api/auth/otp/request': () => ({ body: {} }),
      'POST /api/auth/otp/verify': () => ({ body: { phoneToken: 'pt', accounts: [SHOP, AGENT] } }),
    });
    await renderWithSession(<LoginScreen />);
    await enterPhoneAndCode();

    await fireEvent.press(await screen.findByText('Andijon Savdo'));
    await waitFor(() => expect(savedSession()).toMatchObject({ token: 'tok-staff', kind: 'staff', role: 'AGENT' }));
  });

  it("hisobi yo'q raqam ro'yxatdan o'tishga yuboriladi", async () => {
    mockServer({
      'POST /api/auth/otp/request': () => ({ body: {} }),
      'POST /api/auth/otp/verify': () => ({ body: { phoneToken: 'pt', accounts: [] } }),
    });
    await renderWithSession(<LoginScreen />);
    await enterPhoneAndCode();

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/register'));
    expect(savedSession()).toBeNull();
  });

  it("noto'g'ri kodda server xatosini ko'rsatadi va kirmaydi", async () => {
    mockServer({
      'POST /api/auth/otp/request': () => ({ body: {} }),
      'POST /api/auth/otp/verify': () => ({ status: 400, body: { error: "Kod noto'g'ri yoki eskirgan" } }),
    });
    await renderWithSession(<LoginScreen />);
    await enterPhoneAndCode('000000');

    expect(await screen.findByText("Kod noto'g'ri yoki eskirgan")).toBeOnTheScreen();
    expect(screen.getByTestId('probe')).toHaveTextContent('none|{}');
    expect(savedSession()).toBeNull();
  });

  it("6 xonali kod kiritilmaguncha tasdiqlash so'rovi ketmaydi", async () => {
    const server = mockServer({ 'POST /api/auth/otp/request': () => ({ body: {} }) });
    await renderWithSession(<LoginScreen />);
    await enterPhoneAndCode('123');

    expect(server.to('POST', '/api/auth/otp/verify')).toHaveLength(0);
  });
});
