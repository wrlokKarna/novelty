import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import TimelineBottomDock from './TimelineBottomDock';
import Mentions from './Mentions';

function App() {
    return <Mentions />;
}

createRoot(document.getElementById('root')!).render(<App />);
