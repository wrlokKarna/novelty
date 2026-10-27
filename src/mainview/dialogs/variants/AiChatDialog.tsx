import Dialog from '../Dialog';
import { useEffect, useState } from 'react';
import AiChatDialogTarun from './AiChatDialog.tarun';
import AiChatDialogChakri from './AiChatDialog.chakri';
import { chatSeqType, MOCK_CHAT_DATA } from './AiChatDialog.common';

import styles from './AiChatDialog.module.css';

type Props = { open: boolean; onClose: () => void };

function AiChatDialog({ open, onClose }: Props) {
    const [chatSeq, setChatSeq] = useState<chatSeqType>([]);
    const [resetSeq, setResetSeq] = useState(false);
    const [activeView, setActiveView] = useState<'tarun' | 'chakri'>('tarun');
    useEffect(() => {
        if (resetSeq || MOCK_CHAT_DATA.length === chatSeq.length) {
            setChatSeq([]);
            setResetSeq(false);
        }
        let currentIndex = 0;
        let timerId: NodeJS.Timeout;
        const loadNextItem = () => {
            if (currentIndex < MOCK_CHAT_DATA.length) {
                const currentItem = MOCK_CHAT_DATA[currentIndex];
                const delay = currentItem.timeOut * 1000;
                timerId = setTimeout(() => {
                    setChatSeq((prev) => [...prev, currentItem]);
                    currentIndex++;
                    loadNextItem();
                }, delay);
            }
        };
        loadNextItem();
        return () => clearTimeout(timerId);
    }, [resetSeq]);
    return (
        <Dialog
            open={open}
            onClose={() => onClose()}
            title={`Aichat rework`}
            large
        >
            <div>
                <button onClick={() => setResetSeq(!resetSeq)}>Reset</button>
                <button
                    onClick={() =>
                        setActiveView(
                            activeView === 'tarun' ? 'chakri' : 'tarun'
                        )
                    }
                >
                    view
                </button>
            </div>
            <div>
                {activeView === 'tarun' ? (
                    <AiChatDialogTarun
                        activeView={activeView}
                        chatSeq={chatSeq}
                    />
                ) : (
                    <AiChatDialogChakri
                        activeView={activeView}
                        setChatSeq={(s) => setChatSeq(s)}
                        resetSeq={resetSeq}
                        chatSeq={chatSeq}
                    />
                )}
            </div>
        </Dialog>
    );
}

export default AiChatDialog;
