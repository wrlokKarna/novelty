import { h3 } from 'framer-motion/client';
import Dialog from '../Dialog';
import { useEffect, useState } from 'react';

type Props = { open: boolean; onClose: () => void };
type chatSeqType = {
    name: string;
    type: 'Thinking' | 'Tool';
    timeOut: number;
}[];

function AiChatDialog({ open, onClose }: Props) {
    const [chatSeq, setChatSeq] = useState<chatSeqType>([]);
    const [resetSeq, setResetSeq] = useState(false);
    const MOCK_CHAT_DATA: chatSeqType = [
        { name: 'One', timeOut: 1, type: 'Thinking' },
        { name: 'Two', timeOut: 2, type: 'Thinking' },
        { name: 'Three', timeOut: 1, type: 'Thinking' },
        { name: 'Four', timeOut: 3, type: 'Thinking' },
        { name: 'Five', timeOut: 1, type: 'Thinking' },
    ];
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
            <div className="">
                <button onClick={() => setResetSeq(!resetSeq)}>Reset</button>
                {chatSeq.map((s) => (
                    <h5>
                        Step: {s.name} {s.type}
                    </h5>
                ))}
            </div>
        </Dialog>
    );
}

export default AiChatDialog;
