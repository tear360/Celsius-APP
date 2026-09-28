import { useEffect, useState } from 'react';
import { CelsiusMark } from './Icons.jsx';

export function Splash() {
  const [out, setOut] = useState(false);
  const [gone, setGone] = useState(false);
  const [message, setMessage] = useState('Demarrage de Celsius…');

  useEffect(() => {
    const t1 = setTimeout(() => setOut(true), 250);
    const t2 = setTimeout(() => setGone(true), 700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    const handler = (e) => setMessage(e.detail);
    window.addEventListener('celsius:status', handler);
    return () => window.removeEventListener('celsius:status', handler);
  }, []);

  if (gone) return null;
  return (
    <div className={`splash ${out ? 'splash--out' : ''}`}>
      <div className="splash__inner">
        <div className="splash__logo">
          <CelsiusMark size={52} />
        </div>
        <div className="splash__name">Celsius</div>
        <div className="splash__bar">
          <div className="bar bar--indeterminate">
            <div className="bar__fill" />
          </div>
        </div>
        <div className="splash__msg">{message}</div>
      </div>
    </div>
  );
}
