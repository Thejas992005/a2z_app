import fs from 'fs';
import { PDFDocument } from 'pdf-lib';

async function create() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 400]);
  page.drawText('Dummy PDF for Testing', { x: 50, y: 350 });
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('dummy.pdf', pdfBytes);
  console.log('Created dummy.pdf');
}

create().catch(console.error);
