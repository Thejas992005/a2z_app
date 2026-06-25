import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { addWatermark } from '../../utils/pdfEngine';
import ToolHeader from './shared/ToolHeader';
import Dropzone from './shared/Dropzone';
import SuccessScreen from './shared/SuccessScreen';
import AdPlaceholder from '../AdPlaceholder';

export const Watermark = ({ onBack }) => {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [downloadData, setDownloadData] = useState(null);

  // Watermark parameters
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkSize, setWatermarkSize] = useState(50);
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.4);
  const [watermarkRotation, setWatermarkRotation] = useState(45);
  const [watermarkColor, setWatermarkColor] = useState('#ef4444');
  const [watermarkPosition, setWatermarkPosition] = useState('center');

  const handleFilesSelected = (newFiles) => {
    if (newFiles && newFiles.length > 0) {
      setFile(newFiles[0]);
    }
  };

  const executeWatermark = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(10);
    setError('');
    
    try {
      const outName = `${file.name.replace('.pdf', '')}_watermarked.pdf`;
      setProgress(40);
      const resultBytes = await addWatermark(file, watermarkText, {
        size: Number(watermarkSize),
        opacity: Number(watermarkOpacity),
        rotation: Number(watermarkRotation),
        color: watermarkColor,
        position: watermarkPosition
      });
      setProgress(90);
      setDownloadData({ name: outName, bytes: resultBytes });
      setProgress(100);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while adding the watermark.');
    } finally {
      setProcessing(false);
    }
  };

  const resetWorkspace = () => {
    setFile(null);
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
        toolId="watermark"
        downloadData={downloadData}
        onReset={resetWorkspace}
      />
    );
  }

  return (
    <div className="container">
      <ToolHeader title="Add Watermark" onBack={onBack} />

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
                    Ready for operation • {formatSize(file.size)}
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
                      <Loader2 className="animate-spin" size={14} /> Adding watermark to PDF...
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
                  <label className="form-label">Watermark Text</label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Font Size ({watermarkSize}px)</label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={watermarkSize}
                    onChange={(e) => setWatermarkSize(e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--primary-color)' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Opacity ({Math.round(watermarkOpacity * 100)}%)</label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--primary-color)' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Rotation Angle ({watermarkRotation}°)</label>
                  <input
                    type="range"
                    min="-90"
                    max="90"
                    value={watermarkRotation}
                    onChange={(e) => setWatermarkRotation(e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--primary-color)' }}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Color</label>
                    <input
                      type="color"
                      value={watermarkColor}
                      onChange={(e) => setWatermarkColor(e.target.value)}
                      className="form-input"
                      style={{ padding: '0.2rem', height: '38px', cursor: 'pointer' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Position</label>
                    <select
                      value={watermarkPosition}
                      onChange={(e) => setWatermarkPosition(e.target.value)}
                      className="form-input"
                    >
                      <option value="center">Center</option>
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                    </select>
                  </div>
                </div>

                <button 
                  onClick={executeWatermark} 
                  className="btn btn-primary"
                  disabled={processing}
                  style={{ width: '100%', marginTop: '1rem' }}
                  type="button"
                >
                  {processing ? (
                    <>
                      <Loader2 className="animate-spin" size={18} /> Processing...
                    </>
                  ) : (
                    'Add Watermark'
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

export default Watermark;
