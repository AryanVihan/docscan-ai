/**
 * Client-side image preprocessing utilities for OCR enhancement
 * Includes deskewing, denoising, contrast enhancement, and more
 */

export interface PreprocessingOptions {
  deskew?: boolean;
  denoise?: boolean;
  enhanceContrast?: boolean;
  sharpen?: boolean;
  grayscale?: boolean;
  threshold?: boolean;
  resize?: { maxWidth: number; maxHeight: number };
}

export interface PreprocessingResult {
  processedImage: Blob;
  appliedOperations: string[];
  originalSize: { width: number; height: number };
  processedSize: { width: number; height: number };
}

/**
 * Load an image file into an HTMLImageElement
 */
export const loadImage = (file: Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Create a canvas from an image
 */
const createCanvas = (img: HTMLImageElement, width?: number, height?: number): [HTMLCanvasElement, CanvasRenderingContext2D] => {
  const canvas = document.createElement('canvas');
  canvas.width = width || img.naturalWidth;
  canvas.height = height || img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  return [canvas, ctx];
};

/**
 * Convert image to grayscale for better OCR accuracy
 */
const applyGrayscale = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  
  ctx.putImageData(imageData, 0, 0);
};

/**
 * Enhance contrast using histogram stretching
 */
const enhanceContrast = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Find min and max values
  let min = 255;
  let max = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (gray < min) min = gray;
    if (gray > max) max = gray;
  }
  
  // Stretch histogram
  const range = max - min;
  if (range > 0) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = ((data[i] - min) / range) * 255;
      data[i + 1] = ((data[i + 1] - min) / range) * 255;
      data[i + 2] = ((data[i + 2] - min) / range) * 255;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
};

/**
 * Apply simple noise reduction using median filter approximation
 */
const applyDenoise = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const copy = new Uint8ClampedArray(data);
  
  // Simple box blur for noise reduction
  const kernel = 3;
  const half = Math.floor(kernel / 2);
  
  for (let y = half; y < height - half; y++) {
    for (let x = half; x < width - half; x++) {
      let r = 0, g = 0, b = 0, count = 0;
      
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          r += copy[idx];
          g += copy[idx + 1];
          b += copy[idx + 2];
          count++;
        }
      }
      
      const idx = (y * width + x) * 4;
      data[idx] = r / count;
      data[idx + 1] = g / count;
      data[idx + 2] = b / count;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
};

/**
 * Sharpen image using unsharp mask
 */
const applySharpen = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const copy = new Uint8ClampedArray(data);
  
  // Sharpening kernel
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0, g = 0, b = 0;
      let ki = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          r += copy[idx] * kernel[ki];
          g += copy[idx + 1] * kernel[ki];
          b += copy[idx + 2] * kernel[ki];
          ki++;
        }
      }
      
      const idx = (y * width + x) * 4;
      data[idx] = Math.min(255, Math.max(0, r));
      data[idx + 1] = Math.min(255, Math.max(0, g));
      data[idx + 2] = Math.min(255, Math.max(0, b));
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
};

/**
 * Apply adaptive thresholding for binarization
 */
const applyThreshold = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Calculate Otsu's threshold
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
    histogram[gray]++;
  }
  
  const total = width * height;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];
  
  let sumB = 0, wB = 0, wF = 0;
  let maxVariance = 0;
  let threshold = 128;
  
  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    wF = total - wB;
    if (wF === 0) break;
    
    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);
    
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }
  
  // Apply threshold
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const value = gray > threshold ? 255 : 0;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }
  
  ctx.putImageData(imageData, 0, 0);
};

/**
 * Simple deskew detection using projection profile
 */
const detectSkewAngle = (ctx: CanvasRenderingContext2D, width: number, height: number): number => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  let bestAngle = 0;
  let maxVariance = 0;
  
  // Test angles from -5 to 5 degrees
  for (let angle = -5; angle <= 5; angle += 0.5) {
    const radians = (angle * Math.PI) / 180;
    const profile = new Array(height).fill(0);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const newY = Math.round(y + x * Math.tan(radians));
        if (newY >= 0 && newY < height) {
          const idx = (y * width + x) * 4;
          const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          if (gray < 128) profile[newY]++;
        }
      }
    }
    
    // Calculate variance
    const mean = profile.reduce((a, b) => a + b, 0) / profile.length;
    const variance = profile.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / profile.length;
    
    if (variance > maxVariance) {
      maxVariance = variance;
      bestAngle = angle;
    }
  }
  
  return bestAngle;
};

/**
 * Apply deskewing to the image
 */
const applyDeskew = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, width: number, height: number): void => {
  const angle = detectSkewAngle(ctx, width, height);
  
  if (Math.abs(angle) > 0.5) {
    const radians = (-angle * Math.PI) / 180;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(radians);
    ctx.drawImage(img, -width / 2, -height / 2, width, height);
    ctx.restore();
  }
};

/**
 * Main preprocessing function
 */
export const preprocessImage = async (
  file: Blob,
  options: PreprocessingOptions = {}
): Promise<PreprocessingResult> => {
  const img = await loadImage(file);
  const appliedOperations: string[] = [];
  
  let width = img.naturalWidth;
  let height = img.naturalHeight;
  const originalSize = { width, height };
  
  // Resize if needed
  if (options.resize) {
    const { maxWidth, maxHeight } = options.resize;
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
      appliedOperations.push('resize');
    }
  }
  
  const [canvas, ctx] = createCanvas(img, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  
  // Apply preprocessing operations in order
  if (options.grayscale) {
    applyGrayscale(ctx, width, height);
    appliedOperations.push('grayscale');
  }
  
  if (options.deskew) {
    applyDeskew(ctx, img, width, height);
    appliedOperations.push('deskew');
  }
  
  if (options.denoise) {
    applyDenoise(ctx, width, height);
    appliedOperations.push('denoise');
  }
  
  if (options.enhanceContrast) {
    enhanceContrast(ctx, width, height);
    appliedOperations.push('contrast_enhancement');
  }
  
  if (options.sharpen) {
    applySharpen(ctx, width, height);
    appliedOperations.push('sharpen');
  }
  
  if (options.threshold) {
    applyThreshold(ctx, width, height);
    appliedOperations.push('threshold');
  }
  
  // Convert canvas to blob
  const processedImage = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      'image/png',
      1.0
    );
  });
  
  // Clean up
  URL.revokeObjectURL(img.src);
  
  return {
    processedImage,
    appliedOperations,
    originalSize,
    processedSize: { width, height },
  };
};

/**
 * Analyze image quality for OCR suitability
 */
export const analyzeImageQuality = async (file: Blob): Promise<{
  quality: 'low' | 'medium' | 'high';
  metrics: {
    contrast: number;
    sharpness: number;
    noise: number;
  };
  recommendations: string[];
}> => {
  const img = await loadImage(file);
  const [canvas, ctx] = createCanvas(img);
  ctx.drawImage(img, 0, 0);
  
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Calculate contrast
  let min = 255, max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (gray < min) min = gray;
    if (gray > max) max = gray;
  }
  const contrast = (max - min) / 255;
  
  // Estimate sharpness using Laplacian variance
  let laplacianSum = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      const left = (data[idx - 4] + data[idx - 3] + data[idx - 2]) / 3;
      const right = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
      const top = (data[idx - width * 4] + data[idx - width * 4 + 1] + data[idx - width * 4 + 2]) / 3;
      const bottom = (data[idx + width * 4] + data[idx + width * 4 + 1] + data[idx + width * 4 + 2]) / 3;
      const laplacian = Math.abs(4 * center - left - right - top - bottom);
      laplacianSum += laplacian * laplacian;
    }
  }
  const sharpness = Math.min(1, Math.sqrt(laplacianSum / ((width - 2) * (height - 2))) / 100);
  
  // Estimate noise level
  let noiseSum = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      const neighbors: number[] = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nidx = ((y + dy) * width + (x + dx)) * 4;
          neighbors.push((data[nidx] + data[nidx + 1] + data[nidx + 2]) / 3);
        }
      }
      const mean = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
      noiseSum += Math.abs(gray - mean);
    }
  }
  const noise = 1 - Math.min(1, noiseSum / ((width - 2) * (height - 2)) / 30);
  
  // Determine quality
  const avgScore = (contrast + sharpness + noise) / 3;
  let quality: 'low' | 'medium' | 'high';
  if (avgScore > 0.7) quality = 'high';
  else if (avgScore > 0.4) quality = 'medium';
  else quality = 'low';
  
  // Generate recommendations
  const recommendations: string[] = [];
  if (contrast < 0.4) recommendations.push('Enable contrast enhancement');
  if (sharpness < 0.3) recommendations.push('Enable sharpening');
  if (noise < 0.5) recommendations.push('Enable denoising');
  if (width < 1000 || height < 1000) recommendations.push('Use higher resolution image if available');
  
  URL.revokeObjectURL(img.src);
  
  return {
    quality,
    metrics: { contrast, sharpness, noise },
    recommendations,
  };
};
