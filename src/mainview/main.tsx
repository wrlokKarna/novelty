import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { RPCProvider } from './contexts/RPCContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './theme/theme.css';
import ProjectProvider from '@/mainview/contexts/ProjectContext';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <RPCProvider>
            <SettingsProvider>
                <ThemeProvider>
                    <ProjectProvider>
                        <App />
                    </ProjectProvider>
                </ThemeProvider>
            </SettingsProvider>
        </RPCProvider>
    </StrictMode>
);
