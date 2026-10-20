import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import PayScreen from '@/app/pay/[id]';
import { formatAmount } from '@/lib/money';

import { mockServer, renderWithSession, SHOP_SESSION, signedIn } from './helpers';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: false, assets: [{ uri: 'file:///chek.heic', width: 3000, height: 4000, mimeType: 'image/heic' }] })),
}));
// Rasmni kichraytirish native modul: testda shunchaki JPEG deb qaytadi
jest.mock('@/lib/shrink', () => ({ shrinkImage: jest.fn(async () => ({ uri: 'file:///chek.jpeg', mimeType: 'image/jpeg' })) }));

const DEBT = 250_000;
const OPTIONS = {
  distributor: { id: 'd1', name: 'Andijon Savdo' },
  transfer: [{ id: 'm1', type: 'CARD', number: '8600123412341234', holder: 'ALIJON VALIYEV', bankMfo: null, inn: null }],
  online: ['PAYME', 'CLICK'],
};
const LINK = { linkId: 'l1', distributor: { id: 'd1', name: 'Andijon Savdo', logoUrl: null, categories: [], minOrder: 0, deliveryDays: [] }, debt: DEBT };

const routes = {
  'GET /api/shop/payments': () => ({ body: OPTIONS }),
  'GET /api/shop/debts': () => ({ body: { links: [LINK], entries: [] } }),
};

beforeEach(async () => {
  jest.clearAllMocks();
  (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'd1' });
  await signedIn(SHOP_SESSION);
});

describe("to'lov: qarzni to'lash", () => {
  it("Payme: qarz summasi bilan to'lov sahifasini ochadi", async () => {
    const server = mockServer({ ...routes, 'POST /api/shop/payments/online': () => ({ body: { url: 'https://checkout.paycom.uz/abc' } }) });
    await renderWithSession(<PayScreen />);

    expect(await screen.findByDisplayValue(formatAmount(DEBT))).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Payme'));

    await waitFor(() => expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://checkout.paycom.uz/abc'));
    expect(server.to('POST', '/api/shop/payments/online')[0].body).toEqual({ distributorId: 'd1', amount: DEBT, provider: 'PAYME' });
    expect(await screen.findByText("To'lov tizimi tasdiqlagach, summa qarzingizdan ayiriladi. Qarzlarim sahifasida ko'rasiz.")).toBeOnTheScreen();
  });

  it("Click: foydalanuvchi o'zgartirgan summa bilan", async () => {
    const server = mockServer({ ...routes, 'POST /api/shop/payments/online': () => ({ body: { url: 'https://my.click.uz/x' } }) });
    await renderWithSession(<PayScreen />);

    await fireEvent.changeText(await screen.findByLabelText("To'lov summasi, so'm"), '100000');
    await fireEvent.press(screen.getByText('Click'));

    await waitFor(() => expect(server.to('POST', '/api/shop/payments/online')).toHaveLength(1));
    expect(server.to('POST', '/api/shop/payments/online')[0].body).toEqual({ distributorId: 'd1', amount: 100_000, provider: 'CLICK' });
  });

  it("summa bo'sh bo'lsa onlayn to'lov boshlanmaydi", async () => {
    const server = mockServer(routes);
    await renderWithSession(<PayScreen />);

    await fireEvent.changeText(await screen.findByLabelText("To'lov summasi, so'm"), '');
    await fireEvent.press(screen.getByText('Payme'));
    expect(server.to('POST', '/api/shop/payments/online')).toHaveLength(0);
  });

  it("server rad etsa xatoni ko'rsatadi, brauzer ochilmaydi", async () => {
    mockServer({ ...routes, 'POST /api/shop/payments/online': () => ({ status: 400, body: { error: "Summa qarzdan katta bo'lmasin" } }) });
    await renderWithSession(<PayScreen />);

    await fireEvent.press(await screen.findByText('Payme'));
    expect(await screen.findByText("Summa qarzdan katta bo'lmasin")).toBeOnTheScreen();
    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
  });

  it("o'tkazma: chek rasmini summa bilan yuboradi", async () => {
    const server = mockServer({ ...routes, 'POST /api/shop/payments': () => ({ body: { id: 'pay1' } }) });
    await renderWithSession(<PayScreen />);

    expect(await screen.findByText('8600 1234 1234 1234')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Galereyadan tanlash'));
    await fireEvent.press(await screen.findByText(`Yuborish · ${formatAmount(DEBT)} so'm`));

    expect(await screen.findByText('Chek yuborildi. Distribyutor tasdiqlagach, summa qarzingizdan ayiriladi.')).toBeOnTheScreen();
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    const [upload] = server.to('POST', '/api/shop/payments');
    const form = upload.body as FormData;
    expect(form.get('distributorId')).toBe('d1');
    expect(form.get('amount')).toBe(String(DEBT));
    expect(form.has('receipt')).toBe(true);
    // Fayl yuborishda content-type'ni fetch o'zi qo'yadi (multipart chegarasi bilan), JSON deb yozilmaydi
    expect(upload.headers['content-type']).toBeUndefined();
  });
});
