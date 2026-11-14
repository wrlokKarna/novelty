import { createRoot } from 'react-dom/client';
import TabCont from './TabCont';
function App() {
    return <TabCont mock='TabCont'/>;
}

createRoot(document.getElementById('root')!).render(<App />);
