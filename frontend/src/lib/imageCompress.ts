const DEFAULT_MAX_EDGE = 960;
const DEFAULT_QUALITY = 0.72;

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load image'));
    image.src = dataUrl;
  });
}

export async function fileToCompressedDataUrl(
  file: File,
  options?: { maxEdge?: number; quality?: number },
): Promise<{ dataUrl: string; fileName: string; mimeType: string }> {
  const maxEdge = options?.maxEdge ?? DEFAULT_MAX_EDGE;
  const quality = options?.quality ?? DEFAULT_QUALITY;

  if (!file.type.startsWith('image/')) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Unable to read file'));
      reader.readAsDataURL(file);
    });
    return {
      dataUrl,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
    };
  }

  const originalDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read image'));
    reader.readAsDataURL(file);
  });

  const image = await loadImage(originalDataUrl);
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    return {
      dataUrl: originalDataUrl,
      fileName: file.name,
      mimeType: file.type || 'image/jpeg',
    };
  }

  context.drawImage(image, 0, 0, width, height);
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';

  return {
    dataUrl,
    fileName: `${baseName}.jpg`,
    mimeType: 'image/jpeg',
  };
}
