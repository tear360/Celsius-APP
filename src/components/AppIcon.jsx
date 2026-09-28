import React, { useState } from 'react';

export function AppIcon({ app, size = 'md' }) {
  const [failed, setFailed] = useState(false);
  const showImage = app.icon && !failed;
  return (
    <div
      className={`appicon appicon--${size}`}
      style={showImage ? undefined : { background: `hsl(${app.iconHue} 62% 42%)` }}
    >
      {showImage ? (
        <img src={app.icon} alt="" onError={() => setFailed(true)} draggable="false" />
      ) : (
        <span className="appicon__fallback" style={{ fontSize: size === 'xl' ? 34 : undefined }}>
          {app.iconFallback}
        </span>
      )}
    </div>
  );
}
