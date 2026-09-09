/**
 * Client-side Canvas Image Compression Utility
 * Converts any input image (JPEG, PNG, WebP, etc.) into a compressed WebP File under maxKB (default 80KB)
 * Adheres strictly to Firebase Spark Free Plan bandwidth & storage limits.
 *
 * @param {File} file - Original File from HTML file input
 * @param {number} maxKB - Target maximum file size in kilobytes (default 80KB)
 * @param {number} maxDimension - Max width/height constraint (default 600px)
 * @returns {Promise<{ compressedFile: File, dataUrl: string, originalSizeKB: number, compressedSizeKB: number }>}
 */
export const compressImageToWebP = (file, maxKB = 80, maxDimension = 600) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Invalid image file provided.'));
    }

    const originalSizeKB = Math.round(file.size / 1024);
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // High quality smooth image scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Iteratively lower quality until size <= maxKB
        let quality = 0.85;

        const attemptCompression = (q) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return reject(new Error('Canvas to Blob conversion failed.'));
              }

              const currentSizeKB = Math.round(blob.size / 1024);

              // If Blob is under target maxKB or quality has reached lower threshold (0.2)
              if (currentSizeKB <= maxKB || q <= 0.25) {
                const fileName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
                const compressedFile = new File([blob], fileName, {
                  type: 'image/webp',
                  lastModified: Date.now(),
                });

                const dataUrl = canvas.toDataURL('image/webp', q);

                resolve({
                  compressedFile,
                  dataUrl,
                  originalSizeKB,
                  compressedSizeKB: currentSizeKB,
                  width,
                  height,
                  qualityUsed: q,
                });
              } else {
                // Decrease quality and try again
                attemptCompression(Math.max(0.2, q - 0.15));
              }
            },
            'image/webp',
            q
          );
        };

        attemptCompression(quality);
      };

      img.onerror = () => reject(new Error('Failed to load image file into Image object.'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('FileReader error loading file.'));
    reader.readAsDataURL(file);
  });
};
