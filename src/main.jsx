import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import App from './App.jsx';
import { CurrencyProvider } from './currency.jsx';
import { I18nProvider } from './i18n/index.jsx';
import { SessionProvider } from './session.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SessionProvider>
      <I18nProvider>
        <CurrencyProvider>
          <App />
        </CurrencyProvider>
      </I18nProvider>
    </SessionProvider>
  </StrictMode>,
);
