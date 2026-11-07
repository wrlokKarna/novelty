import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import TimelineBottomDock from './TimelineBottomDock';

function App() {
    const [colHov, setColHov] = useState('');
    const [rowHov, setRowHov] = useState('');
    const gridItemsLength = 44;

    return (
        <>
            <div
                className="grid-cont"
                style={{
                    //display: 'grid',
                    /* Width per unit: 10px (left red) + 30px (content) + 10px (right red) = 50px */
                    gridTemplateColumns: 'repeat(auto-fill, 50px)',
                    gap: '8px', // optional spacing between items
                    display: 'none',
                }}
            >
                {Array.from({ length: gridItemsLength }).map((_gi, index) => (
                    <div
                        key={index}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '10px 1fr 10px',
                            gridTemplateRows: '10px 20px 10px',
                            alignItems: 'center',
                            justifyItems: 'center',
                        }}
                    >
                        {/* Top Green Bar */}
                        <div
                            style={{
                                gridColumn: '1 / -1',
                                gridRow: '1',
                                width: '100%',
                                height: '100%',
                                backgroundColor: 'green',
                            }}
                            onMouseEnter={() => setRowHov(`top-${index}`)}
                            onMouseLeave={() => setRowHov('')}
                        />

                        {/* Left Red Bar */}
                        <div
                            style={{
                                gridColumn: '1',
                                gridRow: '2',
                                width: '100%',
                                height: '100%',
                                backgroundColor: 'red',
                            }}
                            onMouseEnter={() => setColHov(`left-${index}`)}
                            onMouseLeave={() => setColHov('')}
                        />

                        {/* Center Item */}
                        <div
                            className="grid-item"
                            style={{
                                gridColumn: '2',
                                gridRow: '2',
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                            }}
                        >
                            {index}
                        </div>

                        {/* Right Red Bar */}
                        <div
                            style={{
                                gridColumn: '3',
                                gridRow: '2',
                                width: '100%',
                                height: '100%',
                                backgroundColor: 'red',
                            }}
                            onMouseEnter={() => setColHov(`right-${index}`)}
                            onMouseLeave={() => setColHov('')}
                        />

                        {/* Bottom Green Bar */}
                        <div
                            style={{
                                gridColumn: '1 / -1',
                                gridRow: '3',
                                width: '100%',
                                height: '100%',
                                backgroundColor: 'green',
                            }}
                            onMouseEnter={() => setRowHov(`bottom-${index}`)}
                            onMouseLeave={() => setRowHov('')}
                        />
                    </div>
                ))}
            </div>
            <div
                className="div"
                style={{
                    display: 'grid',
                    gridTemplateAreas:
                        "'r1c1 r1c2 r1c3' 'r2c1 r2c2 r2c3' 'r3c1 r3c2 r3c3'",
                    gridTemplateColumns: 'auto 1fr auto',
                    gridTemplateRows: '1fr 1fr 1fr',
                }}
            >
                <div
                    className=""
                    style={{
                        backgroundColor: 'blue',
                        width: '4px',
                        height: '100%',
                        gridArea: '1/1 / 4/1',
                    }}
                ></div>
                <div
                    className=""
                    style={{
                        backgroundColor: 'green',
                        width: '4px',
                        height: '100%',
                        gridArea: '1/3 / 4/3',
                    }}
                ></div>
                <div
                    className=""
                    style={{
                        backgroundColor: 'red',
                        width: '100%',
                        height: '4px',
                        gridArea: '1/1 / 1/4',
                    }}
                ></div>
                <div
                    className=""
                    style={{
                        backgroundColor: 'yellow',
                        width: '100%',
                        height: '4px',
                        gridArea: '3/1 / 3/4',
                    }}
                ></div>
            </div>

            <div>col: {colHov}</div>
            <div>row: {rowHov}</div>
            <TimelineBottomDock x="x" />
        </>
    );
}

createRoot(document.getElementById('root')!).render(<App />);
