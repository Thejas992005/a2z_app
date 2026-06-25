import React, { useState, useRef } from 'react';
import { ChevronUp, ChevronDown, Plus, Loader2 } from 'lucide-react';
import { mergePDFs } from '../../utils/pdfEngine';
import ToolHeader from './shared/ToolHeader';
import Dropzone from './shared/Dropzone';

import SuccessScreen from './shared/SuccessScreen';
import AdPlaceholder from '../AdPlaceholder';

export const MergePDF = ({ onBack }) => {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [downloadData, setDownloadData] = useState(null);
  
  const fileInputRef = useRef(null);

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const deleteFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const moveFile = (index, direction) => {
    if (index === 0 && direction === -1) return;
    if (index === files.length - 1 && direction === 1) return;
    
    setFiles((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index + direction];
      updated[index + direction] = temp;
      return updated;
    });
  };

  const handleFilesSelected = (newFiles) => {
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const triggerUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const executeMerge = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(10);
    setError('');
    
    try {
      const outName = 'merged_document.pdf';
      setProgress(40);
      const resultBytes = await mergePDFs(files);
      setProgress(90);
      setDownloadData({ name: outName, bytes: resultBytes });
      setProgress(100);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while merging your PDF files.');
    } finally {
      setProcessing(false);
    }
  };

  const resetWorkspace = () => {
    setFiles([]);
    setSuccess(false);
    setDownloadData(null);
    setError('');
    setProgress(0);
  };

  if (success) {
    return (
      <SuccessScreen
        toolId="merge"
        downloadData={downloadData}
        onReset={resetWorkspace}
      />
    );
  }

  return (
    <div className="container">
      <ToolHeader title="Merge PDF" onBack={onBack} />

      <div className="workspace-container">
        <div className="workspace-main">
          {files.length === 0 ? (
            <Dropzone
              accept=".pdf"
              isMulti={true}
              onFilesSelected={handleFilesSelected}
              onError={setError}
              processing={processing}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <p style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Uploaded Files ({files.length})
                </p>
                <button onClick={triggerUploadClick} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} type="button">
                  <Plus size={14} style={{ marginRight: '0.25rem' }} /> Add Files
                </button>
                <input
                  type="file"
                  multiple={true}
                  accept=".pdf"
                  onChange={(e) => handleFilesSelected(Array.from(e.target.files))}
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                />
              </div>

              <div className="file-list">
                {files.map((file, idx) => (
                  <div key={`${file.name}-${idx}`} className="file-card file-card-pdf">
                    <div className="file-card-preview">
                      <span style={{ fontSize: '2rem' }}>📄</span>
                    </div>
                    <div className="file-card-name" title={file.name}>{file.name}</div>
                    <div className="file-card-size">{formatSize(file.size)}</div>
                    
                    <button onClick={() => deleteFile(idx)} className="file-card-delete" type="button">✕</button>
                    
                    <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}>
                      <button 
                        onClick={() => moveFile(idx, -1)} 
                        disabled={idx === 0}
                        className="back-button" 
                        style={{ padding: '0.25rem', borderRadius: '4px', opacity: idx === 0 ? 0.3 : 1 }}
                        type="button"
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button 
                        onClick={() => moveFile(idx, 1)} 
                        disabled={idx === files.length - 1}
                        className="back-button" 
                        style={{ padding: '0.25rem', borderRadius: '4px', opacity: idx === files.length - 1 ? 0.3 : 1 }}
                        type="button"
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                
                <div className="add-more-card" onClick={triggerUploadClick}>
                  <Plus className="add-more-icon" />
                  <span>Add Files</span>
                </div>
              </div>

              {processing && (
                <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Loader2 className="animate-spin" size={14} /> Merging PDF files...
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
            
            {files.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Upload files to configure options.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Use the arrow keys on the file cards to arrange the PDF files in the sequence they should be merged.
                  </p>
                </div>

                <button 
                  onClick={executeMerge} 
                  className="btn btn-primary"
                  disabled={processing || files.length < 2}
                  style={{ width: '100%', marginTop: '1rem' }}
                  type="button"
                >
                  {processing ? (
                    <>
                      <Loader2 className="animate-spin" size={18} /> Processing...
                    </>
                  ) : (
                    'Merge PDF'
                  )}
                </button>
                {files.length < 2 && (
                  <p style={{ color: 'var(--accent-rose)', fontSize: '0.75rem', marginTop: '0.25rem', textAlign: 'center' }}>
                    Please add at least 2 files to merge.
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

export default MergePDF;
