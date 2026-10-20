import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import CartScreen from '@/app/(tabs)/cart';

import { mockServer, renderWithSession, SHOP_SESSION, signedIn } from './helpers';

const DIST = { id: 'd1', name: 'Andijon Savdo', logoUrl: null, categories: [], minOrder: 100_000, deliveryDays: [] };
const LINK = { linkId: 'l1', status: 'ACTIVE', distributor: DIST, debt: 0, overdueAmount: 0, overdueDays: 0, nextDue: null, creditLimit: 0, creditAvailable: 0, activeOrders: 0 };
const COLA = { id: 'p1', name: 'Coca-Cola 1,5 l', brand: 'Coca-Cola', category: 'Ichimliklar', unit: 'dona', packSize: 6, minOrderPacks: 1, inStock: true, marked: false, imageUrl: null, price: 12_000 };
const CATALOG = { distributor: { id: 'd1', name: 'Andijon Savdo', logoUrl: null, minOrder: 100_000 }, products: [COLA] };

const catalogRoutes = {
  'GET /api/shop/home': () => ({ body: { links: [LINK] } }),
  'GET /api/shop/catalog': () => ({ body: CATALOG }),
};

beforeEach(() => jest.clearAllMocks());

describe('buyurtma: savatdan distribyutorga', () => {
  it("buyurtma yuboradi, raqamini ko'rsatadi va savatni tozalaydi", async () => {
    await signedIn(SHOP_SESSION, { d1: { p1: 12 } });
    const server = mockServer({ ...catalogRoutes, 'POST /api/shop/orders': () => ({ body: { number: 42 } }) });
    await renderWithSession(<CartScreen />);

    await fireEvent.press(await screen.findByText("O'tkazma"));
    await fireEvent.press(screen.getByText('Buyurtma berish'));

    expect(await screen.findByText('Buyurtma yuborildi')).toBeOnTheScreen();
    expect(screen.getByText('№42. Distribyutor qabul qilganda xabar keladi.')).toBeOnTheScreen();
    const [order] = server.to('POST', '/api/shop/orders');
    expect(order.body).toEqual({ distributorId: 'd1', paymentType: 'TRANSFER', items: [{ productId: 'p1', qty: 12 }], clientKey: expect.any(String) });
    expect(order.headers.authorization).toBe('Bearer tok-shop');
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('shop|{}'));
    expect(await AsyncStorage.getItem('shop_cart')).toBe('{}');
  });

  it("minimal buyurtmaga yetmasa yuborilmaydi", async () => {
    await signedIn(SHOP_SESSION, { d1: { p1: 6 } });
    const server = mockServer(catalogRoutes);
    await renderWithSession(<CartScreen />);

    expect(await screen.findByText('Minimal buyurtmaga yetmagan')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Buyurtma berish'));
    expect(server.to('POST', '/api/shop/orders')).toHaveLength(0);
  });

  it("internet uzilsa savat saqlanadi, qayta yuborishda o'sha kalit ishlatiladi (buyurtma ikki marta yozilmaydi)", async () => {
    await signedIn(SHOP_SESSION, { d1: { p1: 12 } });
    let attempt = 0;
    const server = mockServer({
      ...catalogRoutes,
      'POST /api/shop/orders': () => (++attempt === 1 ? new TypeError('Network request failed') : { body: { number: 43 } }),
    });
    await renderWithSession(<CartScreen />);

    await fireEvent.press(await screen.findByText('Buyurtma berish'));
    expect(await screen.findByText("Server bilan aloqa yo'q. Internetni tekshiring")).toBeOnTheScreen();
    expect(screen.getByTestId('probe')).toHaveTextContent('shop|{"d1":{"p1":12}}');

    await fireEvent.press(screen.getByText('Buyurtma berish'));
    expect(await screen.findByText('Buyurtma yuborildi')).toBeOnTheScreen();
    const [first, second] = server.to('POST', '/api/shop/orders');
    expect((second.body as { clientKey: string }).clientKey).toBe((first.body as { clientKey: string }).clientKey);
  });

  it("distribyutor ulanishni yopgan bo'lsa, uning tovarlari savatdan olinadi", async () => {
    await signedIn(SHOP_SESSION, { d1: { p1: 12 } });
    mockServer({ 'GET /api/shop/home': () => ({ body: { links: [] } }) });
    await renderWithSession(<CartScreen />);

    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('shop|{}'));
    expect(screen.getByText("Savat bo'sh. Distribyutor katalogidan tovar qo'shing.")).toBeOnTheScreen();
  });
});
