import React, { useState, useEffect } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { fileToArrayBuffer, protectPDF } from '../../utils/pdfEngine';
import ToolHeader from './shared/ToolHeader';
import Dropzone from './shared/Dropzone';
import SuccessScreen from './shared/SuccessScreen';
import AdPlaceholder from '../AdPlaceholder';

export const ProtectPDF = ({ onBack }) => {
  const [file, setFile] = useState(null);
  const [fileBytes, setFileBytes] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [downloadData, setDownloadData] = useState(null);
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (file) {
      const loadBytes = async () => {
        try {
          setError('');
          const bytes = new Uint8Array(await fileToArrayBuffer(file));
          setFileBytes(bytes);
        } catch (err) {
          console.error(err);
          setError('Failed to read PDF file. Make sure it is not corrupted.');
        }
      };
      loadBytes();
    } else {
      setFileBytes(null);
    }
  }, [file]);

  const handleFilesSelected = (newFiles) => {
    if (newFiles && newFiles.length > 0) {
      setFile(newFiles[0]);
    }
  };

  const executeProtect = async () => {
    if (!fileBytes) return;
    if (!password) {
      setError('Please choose a password to encrypt this PDF.');
      return;
    }

    setProcessing(true);
    setProgress(10);
    setError('');
    
    try {
      setProgress(40);
      const outName = `${file.name.replace('.pdf', '')}_protected.pdf`;
      const resultBytes = await protectPDF(fileBytes, password);
      setProgress(90);
      setDownloadData({ name: outName, bytes: resultBytes });
      setProgress(100);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while encrypting the PDF.');
    } finally {
      setProcessing(false);
    }
  };

  const resetWorkspace = () => {
    setFile(null);
    setFileBytes(null);
    setPassword('');
    setSuccess(false);
    setDownloadData(null);
    setError('');
    setProgress(0);
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (success) {
    return (
      <SuccessScreen
        toolId="protect"
        downloadData={downloadData}
        onReset={resetWorkspace}
      />
    );
  }

  return (
    <div className="container">
      <ToolHeader title="Protect PDF" onBack={onBack} />

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
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', padding: '2.5rem', borderRadius: '16px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                  <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</span>
                  <h4 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', wordBreak: 'break-all' }}>{file.name}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    Ready for encryption • {formatSize(file.size)}
                  </p>
                  <button onClick={resetWorkspace} className="btn btn-secondary" style={{ width: '100%', fontSize: '0.9rem' }} type="button">
                    Change File
                  </button>
                </div>
              </div>

              {processing && (
                <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Loader2 className="animate-spin" size={14} /> Encrypting PDF document...
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
                <div className="form-group">
                  <label className="form-label">Choose Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      placeholder="Password to open this PDF"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '2.25rem' }}
                    />
                    <Lock size={14} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  </div>
                </div>

                <button 
                  onClick={executeProtect} 
                  className="btn btn-primary"
                  disabled={processing || !password}
                  style={{ width: '100%', marginTop: '1rem' }}
                  type="button"
                >
                  {processing ? (
                    <>
                      <Loader2 className="animate-spin" size={18} /> Processing...
                    </>
                  ) : (
                    'Protect PDF'
                  )}
                </button>
                
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

export default ProtectPDF;
