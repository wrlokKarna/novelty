import type { chatSeqType} from './AiChatDialog.common';
import { MOCK_CHAT_DATA } from './AiChatDialog.common';
import styles from './AiChatDialog.chakri.module.css';
import { useEffect, useState, useRef } from 'react';

// Exact 4 steps structure
const STEP_CONFIG = [
    { type: 'reasoning' as const },
    { type: 'tool' as const },
    { type: 'reasoning' as const },
    { type: 'tool' as const },
];

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
    const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(true);
    const [isGenerating, setIsGenerating] = useState<boolean>(true);
    const [openSteps, setOpenSteps] = useState<Record<number, boolean>>({});
    const [streamedText, setStreamedText] = useState<Record<number, string>>(
        {}
    );
    const [activeStreamingIndex, setActiveStreamingIndex] = useState<
        number | null
    >(null);

    const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
    const intervalsRef = useRef<NodeJS.Timeout[]>([]);
    const runIdRef = useRef<number>(0);

    const clearTimers = () => {
        timeoutsRef.current.forEach(clearTimeout);
        intervalsRef.current.forEach(clearInterval);
        timeoutsRef.current = [];
        intervalsRef.current = [];
    };

    const toggleStep = (index: number) => {
        setOpenSteps((prev) => ({
            ...prev,
            [index]: !prev[index],
        }));
    };

    useEffect(() => {
        runIdRef.current += 1;
        const currentRunId = runIdRef.current;

        clearTimers();
        setChatSeq([]);
        setOpenSteps({});
        setStreamedText({});
        setActiveStreamingIndex(null);
        setIsGenerating(true);
        setIsAccordionOpen(true);

        // Cap to exactly 4 steps
        const fourSteps = MOCK_CHAT_DATA.slice(0, 4);

        const streamWords = (
            text: string,
            index: number,
            onDone: () => void
        ) => {
            if (currentRunId !== runIdRef.current) return;

            if (!text) {
                onDone();
                return;
            }
            const words = text.split(' ');
            let count = 0;
            setActiveStreamingIndex(index);

            const interval = setInterval(() => {
                if (currentRunId !== runIdRef.current) {
                    clearInterval(interval);
                    return;
                }

                count++;
                setStreamedText((prev) => ({
                    ...prev,
                    [index]: words.slice(0, count).join(' '),
                }));

                if (count >= words.length) {
                    clearInterval(interval);
                    setActiveStreamingIndex(null);
                    onDone();
                }
            }, 30);

            intervalsRef.current.push(interval);
        };

        const generateStepByStep = (index: number) => {
            if (currentRunId !== runIdRef.current) return;

            if (index < fourSteps.length) {
                const currentItem = fourSteps[index];

                const timeout = setTimeout(() => {
                    if (currentRunId !== runIdRef.current) return;

                    setChatSeq(fourSteps.slice(0, index + 1));
                    setOpenSteps((prev) => ({ ...prev, [index]: true }));

                    streamWords(currentItem.content || '', index, () => {
                        if (currentRunId !== runIdRef.current) return;
                        generateStepByStep(index + 1);
                    });
                }, 200);

                timeoutsRef.current.push(timeout);
            } else {
                setIsGenerating(false);
            }
        };

        generateStepByStep(0);

        return () => clearTimers();
    }, [resetSeq]);

    const displayedSteps = chatSeq.slice(0, 4);

    return (
        <div
            className={`${styles.tarun} ${activeView === 'chakri' ? styles.active : ''}`}
        >
            <div className={styles.container}>
                <div className={styles.reasoningBox}>
                    {/* Collapsible status header */}
                    <div
                        className={styles.thinkingheader}
                        onClick={() => setIsAccordionOpen((prev) => !prev)}
                    >
                        <div className={styles.headerLeft}>
                            {isGenerating ? (
                                <>
                                    <span className={styles.spinner} />
                                    <span className={styles.headerTitle}>
                                        Thinking...
                                    </span>
                                    <span className={styles.headerBadge}>
                                        Running
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className={styles.statusSuccessDot} />
                                    <span className={styles.headerTitle}>
                                        Completed 4 Steps
                                    </span>
                                    <span className={styles.headerBadge}>
                                        4 Steps
                                    </span>
                                </>
                            )}
                        </div>
                        <svg
                            className={`${styles.chevron} ${isAccordionOpen ? styles.chevronOpen : ''}`}
                            viewBox="0 0 24 24"
                            width="14"
                            height="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>

                    {/* Stepper Pipeline */}
                    {isAccordionOpen && (
                        <div className={styles.reasoningBody}>
                            {displayedSteps.map((_, index) => {
                                const isOpen = openSteps[index] ?? false;
                                const isStreaming =
                                    activeStreamingIndex === index;
                                const stepMeta = STEP_CONFIG[index];
                                const isReasoning =
                                    stepMeta?.type === 'reasoning';

                                return (
                                    <div
                                        key={index}
                                        className={styles.stepItem}
                                    >
                                        {/* Step Trigger Row */}
                                        <div
                                            className={styles.seqheader}
                                            onClick={() => toggleStep(index)}
                                        >
                                            <div
                                                className={
                                                    styles.stepLabelGroup
                                                }
                                            >
                                                {/* Circular loading indicator when actively generating */}
                                                {isStreaming && (
                                                    <span
                                                        className={
                                                            styles.stepSpinner
                                                        }
                                                    />
                                                )}

                                                {/* Step Label: Reasoning/Reasoned or Tool */}
                                                <span
                                                    className={
                                                        styles.stepTitleText
                                                    }
                                                >
                                                    {isReasoning
                                                        ? isStreaming
                                                            ? 'Reasoning'
                                                            : 'Reasoned'
                                                        : 'Tool'}
                                                </span>
                                            </div>

                                            <svg
                                                className={`${styles.stepChevron} ${isOpen ? styles.stepChevronOpen : ''}`}
                                                viewBox="0 0 24 24"
                                                width="12"
                                                height="12"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <polyline points="6 9 12 15 18 9"></polyline>
                                            </svg>
                                        </div>

                                        {/* Step Content Card */}
                                        {isOpen && (
                                            <div
                                                className={`${styles.seqbody} ${
                                                    isStreaming
                                                        ? styles.seqbodyActive
                                                        : ''
                                                }`}
                                            >
                                                {streamedText[index] || ''}
                                                {isStreaming && (
                                                    <span
                                                        className={
                                                            styles.cursor
                                                        }
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
