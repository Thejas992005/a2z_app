import React from 'react';

/**
 * AdPlaceholder component for Google AdSense integration
 * @param {string} type - 'leaderboard' (728x90) | 'sidebar' (300x250)
 * @param {string} className - extra CSS classes
 */
export const AdPlaceholder = ({ type = 'leaderboard', className = '' }) => {
  const isLeaderboard = type === 'leaderboard';
  const sizeClasses = isLeaderboard 
    ? 'ad-leaderboard' 
    : 'ad-sidebar';
  
  return (
    <div className={`ad-container ${sizeClasses} ${className}`} id={`ad-slot-${type}`}>
      <span className="ad-label">Advertisement</span>
      <div className="ad-mock-banner">
        {isLeaderboard ? (
          <div>
            <p style={{ fontWeight: 500 }}>Responsive Banner Ad Slot</p>
            <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>Ready for Google AdSense / Media.net code</p>
          </div>
        ) : (
          <div>
            <p style={{ fontWeight: 500 }}>Sidebar Square Ad Slot</p>
            <p style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '4px' }}>Ready for Google AdSense / Ezoic script</p>
            <div style={{
              margin: '12px auto 0',
              width: '80px',
              height: '80px',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.02)',
              display: 'flex',
              alignItems: 'center',
              justify: 'center'
            }}>
              <span style={{ fontSize: '1.5rem', opacity: 0.25 }}>💰</span>
            </div>
          </div>
        )}
      </div>
      
      {/* 
        DEVELOPER NOTE FOR USER:
        To activate real Google AdSense ads:
        1. Replace the mock content inside this div with your AdSense <ins> tag:
           <ins className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
                data-ad-slot="XXXXXXXXXX"
                data-ad-format="auto"
                data-full-width-responsive="true"></ins>
        2. Call (window.adsbygoogle = window.adsbygoogle || []).push({}); when this component mounts.
      */}
    </div>
  );
};
export default AdPlaceholder;
