import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/globals.css';
import WhotApp from '../components/WhotApp.tsx';

// Invite links look like /join/ABCDE; the server falls back to index.html for any non-file path.
const m = window.location.pathname.match(/^\/join\/([A-Za-z0-9]+)\/?$/);

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <WhotApp initialCode={m ? m[1] : undefined} />
  </StrictMode>,
);
