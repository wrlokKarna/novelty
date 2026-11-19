import { createRoot } from 'react-dom/client';
import './main.css';
import { useState } from 'react';

type TabObj = {
    label: string;
    preview: string;
};
function App() {
    const [tabs, setTabs] = useState(1);

    function newTab(i: number) {
        return <div>tab {Number(i + 1)}</div>;
    }
    return (
        <div className="tabsCont">
            <div className="tabsRow">
                {Array.from({ length: tabs }).map((_i, index) => newTab(index))}
                <button onClick={() => setTabs(tabs + 1)}>add tab</button>
            </div>
            <div className="spliArea">
                <div className="left"></div>
                <div className="right"></div>
            </div>
        </div>
    );
}

createRoot(document.getElementById('root')!).render(<App />);
