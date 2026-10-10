import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import App from './App.jsx';
import { I18nProvider } from './i18n/index.jsx';
import { AuthProvider } from './auth.jsx';
import { CurrencyProvider } from './currency.jsx';
import { ProfileProvider } from './profile.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <AuthProvider>
        <ProfileProvider>
          <CurrencyProvider>
            <App />
          </CurrencyProvider>
        </ProfileProvider>
      </AuthProvider>
    </I18nProvider>
  </StrictMode>,
);
