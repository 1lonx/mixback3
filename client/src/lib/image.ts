import { MAX_COVER_BYTES } from './schemas';

/** Обложка рисуется в 16:9; больше 1280 px в каталоге не нужно. */
const MAX_SIDE = 1280;

/** Сжимает картинку до JPEG ≤ MAX_COVER_BYTES: понижает качество, затем размер. */
export async function compressImage(file: Blob): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Не удалось открыть картинку. Возможно, файл повреждён.');
  }
  try {
    let scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 6; attempt++) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const quality = attempt < 2 ? 0.85 : 0.7;
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', quality),
      );
      if (blob && blob.size <= MAX_COVER_BYTES) return blob;
      scale *= 0.75;
    }
  } finally {
    bitmap.close();
  }
  throw new Error('Не удалось сжать картинку. Выберите другую.');
}
