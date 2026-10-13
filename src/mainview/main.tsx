import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { SettingsProvider } from './contexts/SettingsContext';
import { RPCProvider } from './contexts/RPCContext';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <RPCProvider>
            <SettingsProvider>
                <App />
            </SettingsProvider>
        </RPCProvider>
    </StrictMode>
);
