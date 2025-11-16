/**
 * Compress an image file to approximately 100KB using canvas API
 * @param file - The image file to compress
 * @param maxSizeKB - Maximum file size in KB (default 100)
 * @param maxWidth - Maximum width in pixels (default 1200)
 * @returns Promise<File> - Compressed image file
 */
export async function compressImage(
  file: File,
  maxSizeKB: number = 100,
  maxWidth: number = 1200
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Binary search for optimal quality
        let quality = 0.9;
        let minQuality = 0.1;
        let maxQuality = 0.95;
        let iterations = 0;
        const maxIterations = 10;

        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }

              const sizeKB = blob.size / 1024;

              // If we're within 10% of target or max iterations reached, accept it
              if (
                (sizeKB <= maxSizeKB * 1.1 && sizeKB >= maxSizeKB * 0.5) ||
                iterations >= maxIterations
              ) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                iterations++;

                if (sizeKB > maxSizeKB) {
                  maxQuality = quality;
                  quality = (minQuality + quality) / 2;
                } else {
                  minQuality = quality;
                  quality = (quality + maxQuality) / 2;
                }

                tryCompress();
              }
            },
            'image/jpeg',
            quality
          );
        };

        tryCompress();
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Validate image file
 * @param file - The file to validate
 * @param maxSizeMB - Maximum file size in MB (default 1)
 * @returns Error message if invalid, null if valid
 */
export function validateImageFile(file: File, maxSizeMB: number = 1): string | null {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];

  if (!allowedTypes.includes(file.type)) {
    return 'Invalid file type. Only JPEG, PNG, GIF, and SVG are allowed.';
  }

  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return `File is too large. Maximum size is ${maxSizeMB}MB.`;
  }

  return null;
}

