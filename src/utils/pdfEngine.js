import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt-lite';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDFJS Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Helper to convert File object to ArrayBuffer
export const fileToArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
};

// Helper to convert hex color (#ffffff) to pdf-lib rgb
const hexToRgb = (hex) => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return rgb(r, g, b);
};

/**
 * Merge multiple PDFs into one
 * @param {Array<File>} files
 * @returns {Promise<Uint8Array>}
 */
export const mergePDFs = async (files) => {
  const mergedPdf = await PDFDocument.create();
  
  for (const file of files) {
    const buffer = await fileToArrayBuffer(file);
    const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  
  return await mergedPdf.save();
};

/**
 * Split a PDF into parts
 * @param {File} file
 * @param {string} rangesText e.g. "1-3, 4, 5-8"
 * @param {string} splitMode 'ranges' | 'all'
 * @returns {Promise<Array<{ name: string, bytes: Uint8Array }>>}
 */
export const splitPDF = async (file, rangesText, splitMode) => {
  const buffer = await fileToArrayBuffer(file);
  const sourcePdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const totalPages = sourcePdf.getPageCount();
  const fileBaseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
  
  const results = [];

  if (splitMode === 'all') {
    // Extract every page individually
    for (let i = 0; i < totalPages; i++) {
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(sourcePdf, [i]);
      newPdf.addPage(copiedPage);
      const bytes = await newPdf.save();
      results.push({
        name: `${fileBaseName}_page_${i + 1}.pdf`,
        bytes
      });
    }
  } else {
    // Split by custom ranges
    // Parse range string (e.g. "1-3, 5, 7-10")
    const parts = rangesText.split(',').map(p => p.trim()).filter(Boolean);
    
    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      const pagesToCopy = [];
      
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        
        if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
          const maxEnd = Math.min(end, totalPages);
          for (let i = start - 1; i < maxEnd; i++) {
            pagesToCopy.push(i);
          }
        }
      } else {
        const pageNum = parseInt(part, 10);
        if (!isNaN(pageNum) && pageNum > 0 && pageNum <= totalPages) {
          pagesToCopy.push(pageNum - 1);
        }
      }
      
      if (pagesToCopy.length > 0) {
        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(sourcePdf, pagesToCopy);
        copiedPages.forEach(p => newPdf.addPage(p));
        const bytes = await newPdf.save();
        results.push({
          name: `${fileBaseName}_range_${part}.pdf`,
          bytes
        });
      }
    }
  }
  
  return results;
};

/**
 * Rotate pages of a PDF
 * @param {File} file
 * @param {Object} rotations - map of page index to degree adjustment (e.g., { 0: 90, 1: -90 })
 * @returns {Promise<Uint8Array>}
 */
export const rotatePDF = async (file, rotations) => {
  const buffer = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  
  Object.keys(rotations).forEach((idxStr) => {
    const idx = parseInt(idxStr, 10);
    const rotDegrees = rotations[idx];
    const page = pdfDoc.getPage(idx);
    const currentRotation = page.getRotation().angle;
    
    // Set new rotation angle (normalized to 0, 90, 180, 270)
    let newAngle = (currentRotation + rotDegrees) % 360;
    if (newAngle < 0) newAngle += 360;
    
    page.setRotation(degrees(newAngle));
  });
  
  return await pdfDoc.save();
};

/**
 * Protect a PDF with a password
 * @param {Uint8Array|ArrayBuffer} fileBytes
 * @param {string} password
 * @returns {Promise<Uint8Array>}
 */
export const protectPDF = async (fileBytes, password) => {
  // Use pdf-encrypt-lite to encrypt PDF bytes using RC4 128-bit
  const bytes = new Uint8Array(fileBytes);
  return await encryptPDF(bytes, password, password);
};

/**
 * Unlock password-protected PDF
 * @param {File} file
 * @param {string} password
 * @returns {Promise<Uint8Array>}
 */
export const unlockPDF = async (file, password) => {
  const buffer = await fileToArrayBuffer(file);
  // Loading with password decrypts it in-memory
  const pdfDoc = await PDFDocument.load(buffer, { password });
  // Saving writes out a fully decrypted PDF bytes
  return await pdfDoc.save();
};

/**
 * Add watermark to PDF
 * @param {File} file
 * @param {string} text
 * @param {Object} opts - size, opacity, rotation, color, position
 * @returns {Promise<Uint8Array>}
 */
export const addWatermark = async (file, text, opts) => {
  const buffer = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  
  const size = opts.size || 50;
  const opacity = opts.opacity !== undefined ? opts.opacity : 0.4;
  const angle = opts.rotation !== undefined ? opts.rotation : 45;
  const color = hexToRgb(opts.color || '#ff0000');
  const position = opts.position || 'center';
  
  const textWidth = font.widthOfTextAtSize(text, size);
  const textHeight = font.heightAtSize(size);
  
  pages.forEach((page) => {
    const { width, height } = page.getSize();
    let x = 0;
    let y = 0;
    
    switch (position) {
      case 'top-left':
        x = 50;
        y = height - 50 - textHeight;
        break;
      case 'top-right':
        x = width - 50 - textWidth;
        y = height - 50 - textHeight;
        break;
      case 'bottom-left':
        x = 50;
        y = 50;
        break;
      case 'bottom-right':
        x = width - 50 - textWidth;
        y = 50;
        break;
      case 'center':
      default:
        x = (width - textWidth) / 2;
        y = (height - textHeight) / 2;
        break;
    }
    
    page.drawText(text, {
      x,
      y,
      size,
      font,
      color,
      opacity,
      rotate: degrees(angle),
    });
  });
  
  return await pdfDoc.save();
};

/**
 * Add Page Numbers to PDF
 * @param {File} file
 * @param {Object} opts - format, position, fontSize, color
 * @returns {Promise<Uint8Array>}
 */
export const addPageNumbers = async (file, opts) => {
  const buffer = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  
  const fontSize = opts.fontSize || 10;
  const color = hexToRgb(opts.color || '#6b7280');
  const position = opts.position || 'bottom-center';
  const format = opts.format || 'Page X of Y'; // 'Page X' or 'Page X of Y'
  
  pages.forEach((page, index) => {
    const pageNum = index + 1;
    let text = format.replace('X', pageNum.toString()).replace('Y', totalPages.toString());
    
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);
    
    let x = 0;
    let y = 0;
    
    // Determine positioning coordinates with safe margins
    const margin = 30;
    
    if (position.startsWith('top-')) {
      y = height - margin - textHeight;
    } else {
      y = margin;
    }
    
    if (position.endsWith('-left')) {
      x = margin;
    } else if (position.endsWith('-right')) {
      x = width - margin - textWidth;
    } else { // center
      x = (width - textWidth) / 2;
    }
    
    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color,
    });
  });
  
  return await pdfDoc.save();
};

/**
 * Convert Image files to a single PDF
 * @param {Array<File>} files
 * @returns {Promise<Uint8Array>}
 */
export const convertImagesToPDF = async (files) => {
  const pdfDoc = await PDFDocument.create();
  
  for (const file of files) {
    const imgBuffer = await fileToArrayBuffer(file);
    let embeddedImg;
    
    if (file.type === 'image/png') {
      embeddedImg = await pdfDoc.embedPng(imgBuffer);
    } else { // Handle jpg/jpeg by default
      embeddedImg = await pdfDoc.embedJpg(imgBuffer);
    }
    
    const { width, height } = embeddedImg.scale(1);
    
    // Add page with same dimension as the image
    const page = pdfDoc.addPage([width, height]);
    
    // Draw the image filling the page
    page.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width,
      height,
    });
  }
  
  return await pdfDoc.save();
};

/**
 * Organize PDF: Delete or Reorder pages
 * @param {File} file
 * @param {Array<number>} pageIndicesOrder - array of 0-based page indices in the target order
 * @returns {Promise<Uint8Array>}
 */
export const organizePDF = async (file, pageIndicesOrder) => {
  const buffer = await fileToArrayBuffer(file);
  const sourcePdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const organizedPdf = await PDFDocument.create();
  
  const copiedPages = await organizedPdf.copyPages(sourcePdf, pageIndicesOrder);
  copiedPages.forEach((page) => organizedPdf.addPage(page));
  
  return await organizedPdf.save();
};

// Cache for loaded PDFJS Document promises, keyed by the source file bytes object
const pdfDocumentCache = new WeakMap();

const getCachedPDFDocument = (fileBytes) => {
  let pdfPromise = pdfDocumentCache.get(fileBytes);
  if (!pdfPromise) {
    const bytesCopy = fileBytes.slice(0);
    pdfPromise = pdfjsLib.getDocument({ data: bytesCopy }).promise;
    pdfDocumentCache.set(fileBytes, pdfPromise);
  }
  return pdfPromise;
};

/**
 * Extract all PDF pages as JPG images (rendered client-side)
 * @param {Uint8Array} fileBytes
 * @param {Function} onProgress - callback for rendering progress
 * @returns {Promise<Array<{ name: string, dataUrl: string }>>}
 */
export const convertPDFToImages = async (fileBytes, onProgress) => {
  const pdf = await getCachedPDFDocument(fileBytes);
  const totalPages = pdf.numPages;
  const images = [];
  
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 }); // High resolution render
    
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const context = canvas.getContext('2d');
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    images.push({
      name: `page_${i}.jpg`,
      dataUrl
    });
    
    if (onProgress) {
      onProgress(i, totalPages);
    }
  }
  
  return images;
};

/**
 * Render a single PDF page to a canvas for rendering in UI page previews
 * @param {Uint8Array} fileBytes
 * @param {number} pageNum (1-indexed)
 * @param {HTMLCanvasElement} canvas
 * @param {number} scale
 * @returns {Promise<void>}
 */
export const renderPageToCanvas = async (fileBytes, pageNum, canvas, scale = 0.5) => {
  const pdf = await getCachedPDFDocument(fileBytes);
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  const context = canvas.getContext('2d');
  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;
};

/**
 * Read the total number of pages in a PDF without rendering them
 * @param {Uint8Array} fileBytes
 * @returns {Promise<number>}
 */
export const getPDFPageCount = async (fileBytes) => {
  const pdf = await getCachedPDFDocument(fileBytes);
  return pdf.numPages;
};
