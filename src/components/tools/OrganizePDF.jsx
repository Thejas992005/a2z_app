import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { fileToArrayBuffer, getPDFPageCount, renderPageToCanvas, organizePDF } from '../../utils/pdfEngine';
import ToolHeader from './shared/ToolHeader';
import Dropzone from './shared/Dropzone';
import SuccessScreen from './shared/SuccessScreen';
import AdPlaceholder from '../AdPlaceholder';

const PagePreview = ({ fileBytes, pageNum, onDelete, onMoveLeft, onMoveRight }) => {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const render = async () => {
      if (!canvasRef.current || !fileBytes) return;
      try {
        setLoading(true);
        await renderPageToCanvas(fileBytes, pageNum, canvasRef.current, 0.25);
        if (active) setLoading(false);
      } catch (err) {
        console.error('Error rendering page:', err);
        if (active) setLoading(false);
      }
    };
    render();
    return () => {
      active = false;
    };
  }, [fileBytes, pageNum]);

  return (
    <div className="page-preview-card">
      <div className="page-thumbnail-container" style={{ position: 'relative' }}>
        {loading && (
          <div className="animate-pulse" style={{ 
            color: 'var(--text-muted)', 
            fontSize: '0.8rem',
            position: 'absolute'
          }}>
            Loading...
          </div>
        )}
        <canvas 
          ref={canvasRef} 
          className="page-thumbnail-canvas" 
          style={{ 
            display: loading ? 'none' : 'block' 
          }} 
        />
      </div>
      <div className="page-number-badge">Page {pageNum}</div>
      
      <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}>
        {onMoveLeft && (
          <button 
            onClick={onMoveLeft} 
            className="back-button" 
            style={{ padding: '0.25rem', borderRadius: '4px' }}
            title="Move left"
            type="button"
          >
            ←
          </button>
        )}
        {onDelete && (
          <button 
            onClick={onDelete} 
            className="back-button" 
            style={{ padding: '0.25rem', borderRadius: '4px', color: 'var(--accent-rose)' }}
            title="Delete page"
            type="button"
          >
            ✕
          </button>
        )}
        {onMoveRight && (
          <button 
            onClick={onMoveRight} 
            className="back-button" 
            style={{ padding: '0.25rem', borderRadius: '4px' }}
            title="Move right"
            type="button"
          >
            →
          </button>
        )}
      </div>
    </div>
  );
};

export const OrganizePDF = ({ onBack }) => {
  const [file, setFile] = useState(null);
  const [fileBytes, setFileBytes] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [downloadData, setDownloadData] = useState(null);
  const [pagesList, setPagesList] = useState([]);

  useEffect(() => {
    if (file) {
      const loadBytes = async () => {
        try {
          setError('');
          const bytes = new Uint8Array(await fileToArrayBuffer(file));
          setFileBytes(bytes);
          
          const count = await getPDFPageCount(bytes);
          const initialPages = Array.from({ length: count }, (_, i) => ({
            originalPageNum: i + 1,
            pageNum: i + 1
          }));
          setPagesList(initialPages);
        } catch (err) {
          console.error(err);
          setError('Failed to read PDF file. Make sure it is not corrupted or password-locked.');
        }
      };
      loadBytes();
    } else {
      setFileBytes(null);
      setPagesList([]);
    }
  }, [file]);

  const handleFilesSelected = (newFiles) => {
    if (newFiles && newFiles.length > 0) {
      setFile(newFiles[0]);
    }
  };

  const deleteOrganizePage = (index) => {
    setPagesList((prev) => prev.filter((_, i) => i !== index));
  };

  const moveOrganizePage = (index, direction) => {
    if (index === 0 && direction === -1) return;
    if (index === pagesList.length - 1 && direction === 1) return;
    
    setPagesList((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index + direction];
      updated[index + direction] = temp;
      return updated;
    });
  };

  const executeOrganize = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(10);
    setError('');
    
    try {
      setProgress(40);
      const pageIndices = pagesList.map(p => p.originalPageNum - 1);
      const outName = `${file.name.replace('.pdf', '')}_organized.pdf`;
      const resultBytes = await organizePDF(file, pageIndices);
      setProgress(90);
      setDownloadData({ name: outName, bytes: resultBytes });
      setProgress(100);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while organizing the PDF.');
    } finally {
      setProcessing(false);
    }
  };

  const resetWorkspace = () => {
    setFile(null);
    setFileBytes(null);
    setPagesList([]);
    setSuccess(false);
    setDownloadData(null);
    setError('');
    setProgress(0);
  };

  if (success) {
    return (
      <SuccessScreen
        toolId="organize"
        downloadData={downloadData}
        onReset={resetWorkspace}
      />
    );
  }

  return (
    <div className="container">
      <ToolHeader title="Organize PDF" onBack={onBack} />

      <div className="workspace-container">
        <div className="workspace-main">
          {!file ? (
            <Dropzone
              accept=".pdf"
              isMulti={false}
              onFilesSelected={handleFilesSelected}
              onError={setError}
              processing={processing}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <p style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Pages inside document ({pagesList.length})
                </p>
              </div>
              
              <div className="pages-grid">
                {pagesList.map((page, idx) => (
                  <PagePreview
                    key={`${page.originalPageNum}-${idx}`}
                    fileBytes={fileBytes}
                    pageNum={page.originalPageNum}
                    onDelete={() => deleteOrganizePage(idx)}
                    onMoveLeft={idx > 0 ? () => moveOrganizePage(idx, -1) : null}
                    onMoveRight={idx < pagesList.length - 1 ? () => moveOrganizePage(idx, 1) : null}
                  />
                ))}
              </div>

              {processing && (
                <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Loader2 className="animate-spin" size={14} /> Organizing PDF pages...
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="status-banner status-banner-error" style={{ marginTop: '1.5rem' }}>
                  <span>⚠️ {error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="workspace-sidebar">
          <div className="sidebar-panel">
            <h3 className="panel-title">Configuration</h3>
            
            {!file ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Upload a file to configure options.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Rearrange pages using the arrows (← and →) and remove unwanted pages by clicking the ✕ overlay.
                  </p>
                </div>

                <button 
                  onClick={executeOrganize} 
                  className="btn btn-primary"
                  disabled={processing || pagesList.length === 0}
                  style={{ width: '100%', marginTop: '1rem' }}
                  type="button"
                >
                  {processing ? (
                    <>
                      <Loader2 className="animate-spin" size={18} /> Processing...
                    </>
                  ) : (
                    'Organize PDF'
                  )}
                </button>
                {pagesList.length === 0 && (
                  <p style={{ color: 'var(--accent-rose)', fontSize: '0.75rem', marginTop: '0.25rem', textAlign: 'center' }}>
                    Cannot export an empty PDF document.
                  </p>
                )}
                
                <button 
                  onClick={resetWorkspace} 
                  className="btn btn-secondary"
                  disabled={processing}
                  style={{ width: '100%' }}
                  type="button"
                >
                  Clear Files
                </button>
              </div>
            )}
          </div>
          
          <AdPlaceholder type="sidebar" />
        </div>
      </div>
    </div>
  );
};

export default OrganizePDF;
