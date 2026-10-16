import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { fitWithin } from './net';

// Rasmni yuborishdan oldin kichraytirib, JPEG ga siqadi: zamonaviy kameraning asl surati serverning 4 MB chegarasidan
// katta bo'ladi (chek yuborilmay qolardi), iPhone'ning HEIC surati esa Android'da ochilmaydi
export async function shrinkImage(asset: { uri: string; width: number; height: number }): Promise<{ uri: string; mimeType: string }> {
  const context = ImageManipulator.manipulate(asset.uri);
  const size = fitWithin(asset.width, asset.height);
  if (size) context.resize(size);
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.75, format: SaveFormat.JPEG });
  return { uri: saved.uri, mimeType: 'image/jpeg' };
}
