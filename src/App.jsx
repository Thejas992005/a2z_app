import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import ToolWorkspace from './components/ToolWorkspace';
import PDFEditor from './components/PDFEditor';
import './App.css';

function App() {
  const [currentTool, setCurrentTool] = useState('home');
  const [search, setSearch] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('pdfcraft-theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pdfcraft-theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleSelectTool = (toolId) => {
    setCurrentTool(toolId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoHome = () => {
    setCurrentTool('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Navigation Header */}
      <Navbar currentView={currentTool} onGoHome={handleGoHome} search={search} onSearchChange={setSearch} theme={theme} onToggleTheme={handleToggleTheme} />

      {/* Main Workspace Section */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem 0' }}>
        {currentTool === 'home' ? (
            <Dashboard onSelectTool={handleSelectTool} search={search} />
        ) : currentTool === 'edit' ? (
          /* Advanced Editor Interface */
          <PDFEditor onBack={handleGoHome} />
        ) : (
          /* Individual Tool Interface */
          <ToolWorkspace toolId={currentTool} onBack={handleGoHome} />
        )}
      </main>

      {/* Footer Section */}
      <footer className="footer">
        <div className="container footer-content">
          <div>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>PDFCraft</p>
            <p>100% Client-Side PDF Tools. Your files never leave your computer.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            <div className="footer-links">
              <a href="#" onClick={(e) => { e.preventDefault(); handleGoHome(); }} className="footer-link">Home</a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="footer-link">Source Code</a>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              &copy; {new Date().getFullYear()} PDFCraft. Developed for fast, secure in-browser utility.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

export default App;
