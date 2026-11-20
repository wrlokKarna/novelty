import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { RPCProvider } from './contexts/RPCContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './theme/theme.css';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <RPCProvider>
            <SettingsProvider>
                <ThemeProvider>
                    <App />
                </ThemeProvider>
            </SettingsProvider>
        </RPCProvider>
    </StrictMode>
);
