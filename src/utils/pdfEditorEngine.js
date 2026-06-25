import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Helper to convert File object to ArrayBuffer
const fileToArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
};

// Helper to convert hex color (#ffffff) to pdf-lib rgb
const hexToRgb = (hex) => {
  if (!hex) return rgb(0, 0, 0);
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
    const g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
    const b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
    return rgb(r, g, b);
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return rgb(r, g, b);
};

// Helper to decode base64 data URL to Uint8Array
const dataUrlToUint8Array = (dataUrl) => {
  const base64 = dataUrl.split(',')[1];
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

/**
 * Save edited PDF with overlaid drawings and native text elements
 * @param {File} originalFile
 * @param {Array<{ pageIndex: number, overlayImage: string|null, textObjects: Array<any> }>} pageEdits
 * @returns {Promise<Uint8Array>}
 */
export const saveEditedPDF = async (originalFile, pageEdits) => {
  const buffer = await fileToArrayBuffer(originalFile);
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  // Load standard fonts
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontHelveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontHelveticaBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
  const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);
  const fontTimesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontTimesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const getFont = (family, bold, italic) => {
    const fam = (family || 'helvetica').toLowerCase();
    if (fam.includes('courier') || fam.includes('mono')) {
      return fontCourier;
    } else if (fam.includes('times') || fam.includes('serif')) {
      return bold ? fontTimesRomanBold : fontTimesRoman;
    } else {
      // Helvetica/sans-serif default
      if (bold && italic) return fontHelveticaBoldOblique;
      if (bold) return fontHelveticaBold;
      if (italic) return fontHelveticaOblique;
      return fontHelvetica;
    }
  };

  // Process edits for each page
  for (const edit of pageEdits) {
    const { pageIndex, overlayImage, textObjects } = edit;
    if (pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const { width: pageW, height: pageH } = page.getSize();

    // 1. Draw transparent drawing/shape/signature overlay
    if (overlayImage) {
      try {
        const imageBytes = dataUrlToUint8Array(overlayImage);
        const embeddedImage = await pdfDoc.embedPng(imageBytes);
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: pageW,
          height: pageH,
        });
      } catch (err) {
        console.error(`Error embedding overlay image on page ${pageIndex}:`, err);
      }
    }

    // 2. Draw text boxes natively
    if (textObjects && textObjects.length > 0) {
      for (const textObj of textObjects) {
        try {
          const {
            text,
            left,
            top,
            height,
            fontSize,
            fontFamily,
            fontWeight,
            fontStyle,
            fill,
            lineHeight,
            canvasWidth,
            canvasHeight,
          } = textObj;

          if (!text) continue;

          // Compute scale matching between screen canvas and native PDF points
          const scaleX = pageW / canvasWidth;
          const scaleY = pageH / canvasHeight;

          const objH = height * scaleY;
          const objX = left * scaleX;
          const objY = pageH - (top * scaleY) - objH;

          const isBold = fontWeight === 'bold' || fontWeight === '700' || fontWeight === 700;
          const isItalic = fontStyle === 'italic';
          const font = getFont(fontFamily, isBold, isItalic);

          const nativeFontSize = (fontSize || 14) * scaleY;
          const nativeLineHeight = (lineHeight || 1.15) * nativeFontSize;

          const lines = text.split('\n');
          
          lines.forEach((line, index) => {
            // Draw line starting from the top-down
            // Shift down by font height for baseline adjustment
            const lineY = objY + objH - ((index + 1) * nativeLineHeight) + (nativeFontSize * 0.15);
            page.drawText(line, {
              x: objX,
              y: lineY,
              size: nativeFontSize,
              font: font,
              color: hexToRgb(fill),
            });
          });
        } catch (err) {
          console.error('Error drawing native text:', err);
        }
      }
    }
  }

  // Save and return bytes
  return await pdfDoc.save();
};
