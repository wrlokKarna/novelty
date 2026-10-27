import Dialog from '../Dialog';
import { useEffect, useState } from 'react';
import styles from './AiChatDialog.module.css';

const MOCK_CHAT_DATA: chatSeqType = [
    {
        name: 'One',
        timeOut: 1,
        type: 'Thinking',
        content:
            'Lorem ipsum dolor sit amet consectetur adipiscing elit ipsum occaecat et at eu labore exercitation deserunt odio ex eos ipsum nisi non elit amet at',
    },
    {
        name: 'Two',
        timeOut: 2,
        type: 'Tool',
        content:
            'Lorem ipsum dolor sit amet consectetur adipiscing elit ipsum occaecat et at eu labore exercitation deserunt odio',
    },
    {
        name: 'Three',
        timeOut: 1,
        type: 'Thinking',
        content:
            'Lorem ipsum dolor sit amet consectetur adipiscing elit ipsum occaecat et at eu labore exercitation deserunt odio ex eos ipsum nisi non elit amet atLorem ipsum dolor sit amet consectetur adipiscing elit ipsum occaecat et at eu labore exercitation deserunt odio ex eos ipsum nisi non elit amet at',
    },
    {
        name: 'Four',
        timeOut: 3,
        type: 'Tool',
        content:
            'Lorem Lorem ipsum dolor sit amet consectetur adipiscing elit ipsum occaecat et at eu labore exercitation deserunt odio ex eos ipsum nisi non elit amet atLorem ipsum dolor sit amet consectetur adipiscing elit ipsum occaecat et at eu labore exercitation deserunt odio ex eos ipsum nisi non elit amet at dolor sit amet consectetur adipiscing elit ipsum',
    },
    {
        name: 'Five',
        timeOut: 1,
        type: 'Thinking',
        content: 'Lorem ipsum dolor sit amet',
    },
];
type Props = { open: boolean; onClose: () => void };
type chatSeqType = {
    name: string;
    type: 'Thinking' | 'Tool';
    content: string;
    timeOut: number;
}[];

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
            <div className="">
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
                <div
                    className={`${styles.tarun} ${activeView === 'tarun' ? styles.active : ''}`}
                >
                    <div>
                        <div className={styles.thinkingheader}>
                            {chatSeq[chatSeq.length - 1]?.type}
                        </div>
                    </div>
                    {chatSeq.map((s, index) => (
                        <div className="">
                            <div className={styles.seqheader}>
                                <h5>
                                    Step: {s.name} {s.type}
                                </h5>
                            </div>
                            <div className={styles.seqbody}>{s.content}</div>
                        </div>
                    ))}
                </div>
                <div
                    className={`${styles.tarun} ${activeView === 'chakri' ? styles.active : ''}`}
                ></div>
            </div>
        </Dialog>
    );
}

export default AiChatDialog;
