import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

export const Dropzone = ({ accept, isMulti, onFilesSelected, onError, processing }) => {
  const fileInputRef = useRef(null);

  const processFiles = (uploadedFiles) => {
    if (validFilesCount(uploadedFiles) === 0) {
      onError(`Please upload valid files of type: ${accept}`);
      return;
    }

    const acceptedExtensions = accept.split(',').map(e => e.trim());
    const validFiles = uploadedFiles.filter(file => {
      const name = file.name.toLowerCase();
      return acceptedExtensions.some(ext => {
        if (ext === '.pdf') return name.endsWith('.pdf');
        if (ext.startsWith('image/')) {
          if (ext === 'image/jpeg') return name.endsWith('.jpg') || name.endsWith('.jpeg');
          if (ext === 'image/png') return name.endsWith('.png');
          return file.type.startsWith('image/');
        }
        return false;
      });
    });

    onFilesSelected(validFiles);
  };

  const validFilesCount = (uploadedFiles) => {
    const acceptedExtensions = accept.split(',').map(e => e.trim());
    return uploadedFiles.filter(file => {
      const name = file.name.toLowerCase();
      return acceptedExtensions.some(ext => {
        if (ext === '.pdf') return name.endsWith('.pdf');
        if (ext.startsWith('image/')) {
          if (ext === 'image/jpeg') return name.endsWith('.jpg') || name.endsWith('.jpeg');
          if (ext === 'image/png') return name.endsWith('.png');
          return file.type.startsWith('image/');
        }
        return false;
      });
    }).length;
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    if (processing) return;
    const uploadedFiles = Array.from(e.dataTransfer.files);
    processFiles(uploadedFiles);
  };

  const handleFileSelect = (e) => {
    if (processing) return;
    const uploadedFiles = Array.from(e.target.files);
    processFiles(uploadedFiles);
  };

  const triggerUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div 
      className="dropzone"
      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('active'); }}
      onDragLeave={(e) => e.currentTarget.classList.remove('active')}
      onDrop={(e) => { e.currentTarget.classList.remove('active'); handleFileDrop(e); }}
      onClick={triggerUploadClick}
    >
      <input
        type="file"
        multiple={isMulti}
        accept={accept}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        ref={fileInputRef}
      />
      <Upload className="dropzone-icon" />
      <h3 className="dropzone-title">Drag & Drop files here</h3>
      <p className="dropzone-desc">or click to browse your local device</p>
      <button type="button" className="btn btn-secondary">Choose Files</button>
    </div>
  );
};

export default Dropzone;
