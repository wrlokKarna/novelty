import { chatSeqType, MOCK_CHAT_DATA } from './AiChatDialog.common';
import styles from './AiChatDialog.chakri.module.css';
import { useEffect, useState, useRef } from 'react';

const STEP_LABELS = ['One', 'Two', 'Three', 'Four', 'Five'];

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

        // Strict 5 steps cap
        const fiveSteps = MOCK_CHAT_DATA.slice(0, 5);

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

            if (index < fiveSteps.length) {
                const currentItem = fiveSteps[index];

                const timeout = setTimeout(() => {
                    if (currentRunId !== runIdRef.current) return;

                    setChatSeq(fiveSteps.slice(0, index + 1));
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

    const displayedSteps = chatSeq.slice(0, 5);
    const toolCount = displayedSteps.filter(
        (item) => item.type === 'Tool'
    ).length;

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
                                    <span className={styles.headerTitle}></span>
                                    <span className={styles.headerBadge}>
                                        Thinking...
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className={styles.statusSuccessDot} />
                                    <span className={styles.headerTitle}>
                                        {toolCount > 0
                                            ? `Called ${toolCount} Tools`
                                            : 'Reasoning Completed'}
                                    </span>
                                    <span className={styles.headerBadge}>
                                        5 Steps
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
                            {displayedSteps.map((item, index) => {
                                const isOpen = openSteps[index] ?? false;
                                const stepName =
                                    item.name ||
                                    STEP_LABELS[index] ||
                                    `${index + 1}`;
                                const isStreaming =
                                    activeStreamingIndex === index;
                                const isCompleted =
                                    !isStreaming &&
                                    (streamedText[index]?.length ?? 0) > 0;

                                return (
                                    <div
                                        key={index}
                                        className={styles.stepItem}
                                    >
                                        {/* Step Trigger Pill */}
                                        <div
                                            className={styles.seqheader}
                                            onClick={() => toggleStep(index)}
                                        >
                                            <div className={styles.stepBadge}>
                                                <span
                                                    className={`${styles.stepNode} ${
                                                        isStreaming
                                                            ? styles.stepNodeActive
                                                            : isCompleted
                                                              ? styles.stepNodeCompleted
                                                              : ''
                                                    }`}
                                                >
                                                    {isCompleted
                                                        ? '✓'
                                                        : index + 1}
                                                </span>
                                                <span
                                                    className={styles.stepTitle}
                                                >
                                                    Step {index + 1}
                                                </span>
                                                <span
                                                    className={
                                                        styles.stepDivider
                                                    }
                                                >
                                                    •
                                                </span>
                                                <span
                                                    className={
                                                        styles.stepSubtitle
                                                    }
                                                >
                                                    {stepName}
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
