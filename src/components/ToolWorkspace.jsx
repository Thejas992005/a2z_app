import React from 'react';
import MergePDF from './tools/MergePDF';
import SplitPDF from './tools/SplitPDF';
import RotatePDF from './tools/RotatePDF';
import OrganizePDF from './tools/OrganizePDF';
import JpgToPdf from './tools/JpgToPdf';
import PdfToJpg from './tools/PdfToJpg';
import Watermark from './tools/Watermark';
import PageNumbers from './tools/PageNumbers';
import ProtectPDF from './tools/ProtectPDF';
import UnlockPDF from './tools/UnlockPDF';

export const ToolWorkspace = ({ toolId, onBack }) => {
  switch (toolId) {
    case 'merge':
      return <MergePDF onBack={onBack} />;
    case 'split':
      return <SplitPDF onBack={onBack} />;
    case 'rotate':
      return <RotatePDF onBack={onBack} />;
    case 'organize':
      return <OrganizePDF onBack={onBack} />;
    case 'jpg-to-pdf':
      return <JpgToPdf onBack={onBack} />;
    case 'pdf-to-jpg':
      return <PdfToJpg onBack={onBack} />;
    case 'watermark':
      return <Watermark onBack={onBack} />;
    case 'page-numbers':
      return <PageNumbers onBack={onBack} />;
    case 'protect':
      return <ProtectPDF onBack={onBack} />;
    case 'unlock':
      return <UnlockPDF onBack={onBack} />;
    default:
      return (
        <div className="container" style={{ padding: '2rem 0', textAlign: 'center' }}>
          <h3>Tool not found</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            The requested PDF utility is not configured.
          </p>
          <button onClick={onBack} className="btn btn-secondary" type="button">
            Back to Dashboard
          </button>
        </div>
      );
  }
};

export default ToolWorkspace;
