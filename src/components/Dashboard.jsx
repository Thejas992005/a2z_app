import React, { useState } from 'react';
import { 
  Merge, 
  Scissors, 
  RotateCw, 
  Lock, 
  Unlock, 
  Type, 
  Hash, 
  FileImage, 
  Image, 
  Layers, 
  Search,
  Edit
} from 'lucide-react';

const TOOLS = [
  {
    id: 'merge',
    title: 'Merge PDF',
    desc: 'Combine multiple PDF files into a single document in any order.',
    category: 'organize',
    icon: Merge,
    color: 'var(--primary-color)'
  },
  {
    id: 'split',
    title: 'Split PDF',
    desc: 'Extract page ranges or split each page into a separate PDF file.',
    category: 'organize',
    icon: Scissors,
    color: 'var(--accent-cyan)'
  },
  {
    id: 'rotate',
    title: 'Rotate PDF',
    desc: 'Rotate individual pages or all pages of your PDF document.',
    category: 'organize',
    icon: RotateCw,
    color: 'var(--accent-rose)'
  },
  {
    id: 'organize',
    title: 'Organize PDF',
    desc: 'Delete, reorder, or organize the pages of your PDF file visually.',
    category: 'organize',
    icon: Layers,
    color: '#f59e0b'
  },
  {
    id: 'jpg-to-pdf',
    title: 'JPG to PDF',
    desc: 'Convert JPG, JPEG, and PNG images into a clean PDF document.',
    category: 'convert',
    icon: Image,
    color: 'var(--accent-emerald)'
  },
  {
    id: 'pdf-to-jpg',
    title: 'PDF to JPG',
    desc: 'Render and download all pages of a PDF as high-quality JPG images.',
    category: 'convert',
    icon: FileImage,
    color: '#8b5cf6'
  },
  {
    id: 'edit',
    title: 'Edit PDF',
    desc: 'The most advanced PDF editor: draw, add shapes, redact, add images, text, and signatures client-side.',
    category: 'edit',
    icon: Edit,
    color: '#10b981'
  },
  {
    id: 'watermark',
    title: 'Add Watermark',
    desc: 'Add customizable text watermarks with control over rotation and opacity.',
    category: 'edit',
    icon: Type,
    color: '#d946ef'
  },
  {
    id: 'page-numbers',
    title: 'Page Numbers',
    desc: 'Embed page numbers in headers or footers with custom formatting.',
    category: 'edit',
    icon: Hash,
    color: '#06b6d4'
  },
  {
    id: 'protect',
    title: 'Protect PDF',
    desc: 'Encrypt your PDF document with a password to prevent unauthorized open.',
    category: 'security',
    icon: Lock,
    color: '#ef4444'
  },
  {
    id: 'unlock',
    title: 'Unlock PDF',
    desc: 'Remove password encryption from a PDF file to make it fully accessible.',
    category: 'security',
    icon: Unlock,
    color: '#84cc16'
  }
];

const CATEGORIES = [
  { id: 'all', label: 'All Tools' },
  { id: 'organize', label: 'Organize' },
  { id: 'convert', label: 'Convert' },
  { id: 'edit', label: 'Edit' },
  { id: 'security', label: 'Security' }
];

export const Dashboard = ({ onSelectTool }) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredTools = TOOLS.filter((tool) => {
    const matchesSearch = tool.title.toLowerCase().includes(search.toLowerCase()) || 
                          tool.desc.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'all' || tool.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      <header className="hero-section">
        <h1 className="hero-title">
          Every tool you need to <span className="gradient-text">Craft PDFs</span>
        </h1>
        <p className="hero-subtitle">
          Free, fast, and 100% private. All PDF files are processed client-side in your browser. Your files never leave your device.
        </p>

        {/* Search Bar */}
        <div style={{
          position: 'relative',
          maxWidth: '500px',
          margin: '0 auto 2.5rem',
        }}>
          <input
            type="text"
            placeholder="Search for tools... (e.g. merge, encrypt)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{
              paddingLeft: '2.75rem',
              borderRadius: '9999px',
              fontSize: '1rem',
              height: '48px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          />
          <Search style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            width: '1.25rem',
            height: '1.25rem'
          }} />
        </div>

        {/* Categories Navigation */}
        <div className="categories-tabs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {/* Tools Grid */}
      <main className="tools-grid">
        {filteredTools.map((tool) => {
          const IconComp = tool.icon;
          return (
            <div
              key={tool.id}
              onClick={() => onSelectTool(tool.id)}
              className="tool-card"
            >
              <div 
                className="tool-icon-wrapper"
                style={{ '--icon-color': tool.color }}
              >
                <IconComp className="tool-icon" style={{ stroke: tool.color }} />
              </div>
              <h3>{tool.title}</h3>
              <p>{tool.desc}</p>
            </div>
          );
        })}
      </main>
      
      {filteredTools.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: '1.1rem' }}>No tools matched your search criteria.</p>
          <button 
            onClick={() => { setSearch(''); setActiveCategory('all'); }} 
            className="btn btn-secondary" 
            style={{ marginTop: '1rem' }}
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
};
export default Dashboard;
