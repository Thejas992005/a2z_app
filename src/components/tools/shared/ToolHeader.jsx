import React from 'react';
import { ArrowLeft } from 'lucide-react';

export const ToolHeader = ({ title, onBack }) => {
  return (
    <div className="workspace-header">
      <button onClick={onBack} className="back-button" title="Back to Dashboard" type="button">
        <ArrowLeft size={18} />
      </button>
      <h2 className="workspace-title">{title}</h2>
    </div>
  );
};

export default ToolHeader;
