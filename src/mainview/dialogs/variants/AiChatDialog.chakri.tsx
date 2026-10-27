import { chatSeqType, MOCK_CHAT_DATA } from './AiChatDialog.common';
import styles from './AiChatDialog.chakri.module.css';
import { useEffect, useState } from 'react';
export default function AiChatDialogChakri({
    activeView,
    chatSeq,
    setChatSeq,
    resetSeq,
}: {
    activeView: 'tarun' | 'chakri';
    chatSeq: chatSeqType;
    resetSeq: boolean;
    setChatSeq: (value: React.SetStateAction<chatSeqType>) => void;
}) {
    //const [resetSeq, setResetSeq] = useState<boolean>(false);
    const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(true);
    const [isGenerating, setIsGenerating] = useState<boolean>(true);
    const [openSteps, setOpenSteps] = useState<Record<number, boolean>>({});

    const toggleStep = (index: number) => {
        setOpenSteps((prev) => ({
            ...prev,
            [index]: !prev[index],
        }));
    };
    useEffect(() => {
        setChatSeq([]);
        setOpenSteps({});
        setIsGenerating(true);
        setIsAccordionOpen(true);

        let currentIndex = 0;
        let timerId: NodeJS.Timeout;

        const loadNextItem = () => {
            if (currentIndex < MOCK_CHAT_DATA.length) {
                const currentItem = MOCK_CHAT_DATA[currentIndex];
                const indexToAdd = currentIndex;
                const delay = currentItem.timeOut * 1000;

                timerId = setTimeout(() => {
                    setChatSeq((prev) => [...prev, currentItem]);
                    setOpenSteps((prev) => ({ ...prev, [indexToAdd]: true }));
                    currentIndex++;
                    loadNextItem();
                }, delay);
            } else {
                setIsGenerating(false);
                setIsAccordionOpen(false);
            }
        };

        loadNextItem();

        return () => clearTimeout(timerId);
    }, [resetSeq]);

    const toolCount = chatSeq.filter((item) => item.type === 'Tool').length;
    const currentStep = chatSeq[chatSeq.length - 1];

    return (
        <div
            className={`${styles.tarun} ${activeView === 'chakri' ? styles.active : ''}`}
        >
            <div className={styles.container}>
                <div className={styles.reasoningBox}>
                    <div className={styles.thinkingheader}>
                        <span className={styles.headerLeft}>Chakri View</span>
                    </div>
                    <div className={styles.reasoningBody}>
                        {chatSeq.map((s, index) => (
                            <div key={index} className={styles.stepItem}>
                                <div className={styles.seqheader}>
                                    <span className={styles.stepTitle}>
                                        {s.name} - {s.type}
                                    </span>
                                </div>
                                <div className={styles.seqbody}>
                                    {s.content}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
/* 
import { useEffect, useState } from 'react';
import Dialog from '../Dialog';
import styles from './AiChatDialog.module.css';

type Props = { open: boolean; onClose: () => void };

type ChatItem = {
    name: string;
    type: 'Thinking' | 'Tool';
    content: string;
    timeOut: number;
};

type chatSeqType = ChatItem[];

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

function AiChatDialog({ open, onClose }: Props) {
    const [chatSeq, setChatSeq] = useState<chatSeqType>([]);
    const [resetSeq, setResetSeq] = useState<boolean>(false);
    const [activeView, setActiveView] = useState<'tarun' | 'chakri'>('tarun');

    const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(true);
    const [isGenerating, setIsGenerating] = useState<boolean>(true);
    const [openSteps, setOpenSteps] = useState<Record<number, boolean>>({});

    const toggleStep = (index: number) => {
        setOpenSteps((prev) => ({
            ...prev,
            [index]: !prev[index],
        }));
    };

    useEffect(() => {
        setChatSeq([]);
        setOpenSteps({});
        setIsGenerating(true);
        setIsAccordionOpen(true);

        let currentIndex = 0;
        let timerId: NodeJS.Timeout;

        const loadNextItem = () => {
            if (currentIndex < MOCK_CHAT_DATA.length) {
                const currentItem = MOCK_CHAT_DATA[currentIndex];
                const indexToAdd = currentIndex;
                const delay = currentItem.timeOut * 1000;

                timerId = setTimeout(() => {
                    setChatSeq((prev) => [...prev, currentItem]);
                    setOpenSteps((prev) => ({ ...prev, [indexToAdd]: true }));
                    currentIndex++;
                    loadNextItem();
                }, delay);
            } else {
                setIsGenerating(false);
                setIsAccordionOpen(false);
            }
        };

        loadNextItem();

        return () => clearTimeout(timerId);
    }, [resetSeq]);

    const toolCount = chatSeq.filter((item) => item.type === 'Tool').length;
    const currentStep = chatSeq[chatSeq.length - 1];

    return (
        <Dialog
            open={open}
            onClose={() => onClose()}
            title="AICHAT REWORK"
            large
        >
            <div className={styles.container}>
                <div className={styles.controls}>
                    <button
                        className={styles.resetBtn}
                        onClick={() => setResetSeq(!resetSeq)}
                    >
                        Reset
                    </button>
                    <button
                        className={styles.resetBtn}
                        onClick={() =>
                            setActiveView(
                                activeView === 'tarun' ? 'chakri' : 'tarun'
                            )
                        }
                    >
                        View: {activeView}
                    </button>
                </div>

                {/* View 1: Default/Tarun View * /}
                <div
                    className={`${styles.tarun} ${activeView === 'tarun' ? styles.active : ''}`}
                >
                    <div className={styles.reasoningBox}>
                        {/* Parent Collapsible Header * /}
                        <div
                            className={styles.thinkingheader}
                            onClick={() => setIsAccordionOpen((prev) => !prev)}
                        >
                            <div className={styles.headerLeft}>
                                {isGenerating && (
                                    <span className={styles.spinner} />
                                )}
                                <span>
                                    {isGenerating
                                        ? `Step: ${currentStep?.name ?? 'Starting'} (${currentStep?.type ?? 'Thinking'})`
                                        : `Called ${toolCount} tools`}
                                </span>
                            </div>
                            <span
                                className={`${styles.chevron} ${
                                    isAccordionOpen ? styles.open : ''
                                }`}
                            >
                                ▶
                            </span>
                        </div>

                        {/* Step items with per-step dropdowns * /}
                        {isAccordionOpen && (
                            <div className={styles.reasoningBody}>
                                {chatSeq.map((s, index) => {
                                    const isOpen = openSteps[index] ?? false;
                                    return (
                                        <div
                                            key={index}
                                            className={styles.stepItem}
                                        >
                                            <div
                                                className={`${styles.seqheader} ${
                                                    isOpen
                                                        ? styles.seqheaderActive
                                                        : ''
                                                }`}
                                                onClick={() =>
                                                    toggleStep(index)
                                                }
                                            >
                                                <span
                                                    className={`${styles.chevron} ${
                                                        isOpen
                                                            ? styles.open
                                                            : ''
                                                    }`}
                                                >
                                                    ▶
                                                </span>
                                                <span
                                                    className={styles.stepTitle}
                                                >
                                                    <span
                                                        className={
                                                            styles.stepIcon
                                                        }
                                                    >
                                                        {s.type === 'Tool'
                                                            ? '⚙'
                                                            : '✦'}
                                                    </span>
                                                    Step: {s.name} ({s.type})
                                                </span>
                                            </div>

                                            {isOpen && (
                                                <div className={styles.seqbody}>
                                                    {s.content}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* View 2: Chakri View * /}
                <div
                    className={`${styles.tarun} ${activeView === 'chakri' ? styles.active : ''}`}
                >
                    <div className={styles.reasoningBox}>
                        <div className={styles.thinkingheader}>
                            <span className={styles.headerLeft}>
                                Chakri View
                            </span>
                        </div>
                        <div className={styles.reasoningBody}>
                            {chatSeq.map((s, index) => (
                                <div key={index} className={styles.stepItem}>
                                    <div className={styles.seqheader}>
                                        <span className={styles.stepTitle}>
                                            {s.name} - {s.type}
                                        </span>
                                    </div>
                                    <div className={styles.seqbody}>
                                        {s.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}

export default AiChatDialog;

*/
