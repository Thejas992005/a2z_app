import React from 'react';
import { Check, Download, FileText } from 'lucide-react';
import AdPlaceholder from '../../AdPlaceholder';

export const SuccessScreen = ({ toolId, downloadData, successImages = [], onReset }) => {
  const formatSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadBlob = (bytes, fileName, mimeType) => {
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const triggerDownload = (item) => {
    const data = item || downloadData;
    if (!data) return;
    
    if (Array.isArray(data)) {
      data.forEach((d) => {
        downloadBlob(d.bytes, d.name, 'application/pdf');
      });
    } else {
      downloadBlob(data.bytes, data.name, 'application/pdf');
    }
  };

  const downloadImage = (img) => {
    const link = document.createElement('a');
    link.href = img.dataUrl;
    link.download = img.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllImages = () => {
    successImages.forEach((img) => {
      downloadImage(img);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', padding: '3rem 0' }}>
      
      {/* Main Success Container */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '24px',
        padding: '3rem 2rem',
        width: '100%',
        maxWidth: '600px',
        textAlign: 'center',
        boxShadow: 'var(--shadow-glow), var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '2px solid var(--accent-emerald)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent-emerald)',
          marginBottom: '1.5rem'
        }}>
          <Check size={32} />
        </div>
        
        <h3 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Processing Complete!</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
          Your file has been processed successfully 100% in-browser. No files were uploaded to a server.
        </p>

        {/* Render download details based on return data */}
        {toolId === 'pdf-to-jpg' ? (
          <div style={{ width: '100%' }}>
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Extracted Pages ({successImages.length})
            </p>
            <div style={{ 
              maxHeight: '240px', 
              overflowY: 'auto', 
              background: 'rgba(0,0,0,0.2)', 
              borderRadius: '12px', 
              padding: '0.75rem', 
              marginBottom: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              {successImages.map((img) => (
                <div 
                  key={img.name} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '0.5rem 0.75rem', 
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img src={img.dataUrl} style={{ width: '32px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} alt="" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{img.name}</span>
                  </div>
                  <button 
                    onClick={() => downloadImage(img)}
                    className="back-button"
                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    type="button"
                  >
                    <Download size={12} /> Download
                  </button>
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
              <button 
                onClick={downloadAllImages} 
                className="btn btn-primary"
                style={{ flex: 1 }}
                type="button"
              >
                <Download size={18} style={{ marginRight: '0.5rem' }} /> Download All Images
              </button>
              <button onClick={onReset} className="btn btn-secondary" style={{ flex: 1 }} type="button">
                Process Another
              </button>
            </div>
          </div>
        ) : Array.isArray(downloadData) ? (
          /* SPLIT (multiple output files) */
          <div style={{ width: '100%' }}>
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Split PDF Packages ({downloadData.length})
            </p>
            <div style={{ 
              maxHeight: '240px', 
              overflowY: 'auto', 
              background: 'rgba(0,0,0,0.2)', 
              borderRadius: '12px', 
              padding: '0.75rem', 
              marginBottom: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              {downloadData.map((d, idx) => (
                <div 
                  key={`${d.name}-${idx}`} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '0.5rem 0.75rem', 
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px'
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                    {d.name}
                  </span>
                  <button 
                    onClick={() => triggerDownload(d)}
                    className="back-button"
                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    type="button"
                  >
                    <Download size={12} /> Download
                  </button>
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
              <button 
                onClick={() => triggerDownload()} 
                className="btn btn-primary"
                style={{ flex: 1 }}
                type="button"
              >
                <Download size={18} style={{ marginRight: '0.5rem' }} /> Download All Files
              </button>
              <button onClick={onReset} className="btn btn-secondary" style={{ flex: 1 }} type="button">
                Process Another
              </button>
            </div>
          </div>
        ) : (
          /* Single Output File (Merge, Rotate, Watermark, Numbers, Protect, Unlock, Image-to-PDF) */
          <div style={{ width: '100%' }}>
            <div style={{
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              width: '100%',
              textAlign: 'left'
            }}>
              <div style={{
                background: 'rgba(99, 102, 241, 0.1)',
                padding: '0.75rem',
                borderRadius: '8px',
                color: 'var(--primary-color)'
              }}>
                <FileText size={28} />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {downloadData?.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Size: {downloadData ? formatSize(downloadData.bytes?.length) : 'N/A'} • Ready
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
              <button 
                onClick={() => triggerDownload()} 
                className="btn btn-primary"
                style={{ flex: 1 }}
                type="button"
              >
                <Download size={18} style={{ marginRight: '0.5rem' }} /> Download PDF
              </button>
              <button onClick={onReset} className="btn btn-secondary" style={{ flex: 1 }} type="button">
                Process Another
              </button>
            </div>
          </div>
        )}
        
      </div>
      
      {/* Post-Action Leaderboard Ad Placement (strategic position) */}
      <AdPlaceholder type="leaderboard" />
      
    </div>
  );
};

export default SuccessScreen;
