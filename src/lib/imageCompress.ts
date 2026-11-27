/**
 * Compresses/resizes an image File to a lightweight Data URL (< ~150KB)
 * so it saves reliably in Firestore (1MB doc limit) and localStorage.
 */
export function compressImageToDataUrl(
  file: File,
  maxDimension = 800,
  quality = 0.78
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("फाइल वाचता आली नाही"));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          const isPng = file.type === "image/png";
          if (!isPng) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, width, height);
          }
          ctx.drawImage(img, 0, 0, width, height);

          let out = canvas.toDataURL(isPng ? "image/png" : "image/jpeg", quality);
          // If PNG is still large (> 350KB), convert to JPEG with white background
          if (isPng && out.length > 350 * 1024) {
            const jpgCanvas = document.createElement("canvas");
            jpgCanvas.width = width;
            jpgCanvas.height = height;
            const jCtx = jpgCanvas.getContext("2d");
            if (jCtx) {
              jCtx.fillStyle = "#ffffff";
              jCtx.fillRect(0, 0, width, height);
              jCtx.drawImage(img, 0, 0, width, height);
              out = jpgCanvas.toDataURL("image/jpeg", quality);
            }
          }
          resolve(out);
        } catch {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
