import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { StoreProvider } from './data/store';
import { ToastProvider } from './components/Toast';
import './styles/global.css';

// Prototype panel (right edge): loads only when running locally with `npm run dev`.
// Production builds leave it out entirely. See src/prototype/.
const PrototypePanel = import.meta.env.DEV ? lazy(() => import('./prototype/ViewRail')) : null;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <ToastProvider>
          <App />
          {PrototypePanel && <Suspense fallback={null}><PrototypePanel /></Suspense>}
        </ToastProvider>
      </StoreProvider>
    </BrowserRouter>
  </StrictMode>,
);
