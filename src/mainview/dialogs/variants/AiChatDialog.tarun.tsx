import { useCallback, useEffect, useRef, useState } from 'react';
import {
    IconEye,
    IconFileText,
    IconFolder,
    IconPencil,
} from '@tabler/icons-react';
import DottedSpinner from '@/mainview/components/DottedSpinner';
import type { chatSeqType } from './AiChatDialog.common';
import styles from './AiChatDialog.tarun.module.css';

function WordByWordText({ text }: { text: string }) {
    const words = text ? text.split(/(\s+)/) : [];
    return (
        <span>
            {words.map((word, i) => (
                <span
                    key={i}
                    className={styles.word}
                    style={{ animationDelay: `${i * 35}ms` }}
                >
                    {word}
                </span>
            ))}
        </span>
    );
}

function PathIcon({ isFolder }: { isFolder?: boolean }) {
    return isFolder ? (
        <IconFolder size={13} style={{ opacity: 0.7 }} />
    ) : (
        <IconFileText size={13} style={{ opacity: 0.7 }} />
    );
}

function SimulatedProcessing({
    content,
    onComplete,
    stepIndex,
}: {
    content: string;
    onComplete: () => void;
    stepIndex: number;
}) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [steps, setSteps] = useState<{ percentage: number; delay: number }[]>(
        []
    );

    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        try {
            const sanitized = content.replace(
                /([{,]\s*)([a-zA-Z0-9_]+)(\s*:\s*)/g,
                '$1"$2"$3'
            );
            const parsed = JSON.parse(sanitized);
            if (Array.isArray(parsed) && parsed.length > 0) {
                setSteps(parsed);
                setCurrentIndex(0);
            }
        } catch (e) {
            setSteps([{ percentage: 100, delay: 1 }]);
            console.error('err', e);
        }
    }, [content, stepIndex]);

    useEffect(() => {
        if (steps.length === 0) return;

        const currentStep = steps[currentIndex];
        const stepDelay = (currentStep?.delay ?? 1) * 1000;

        if (currentIndex >= steps.length - 1) {
            const lingerTime = Math.max(stepDelay, 800);
            const completeTimer = setTimeout(() => {
                onCompleteRef.current();
            }, lingerTime);
            return () => clearTimeout(completeTimer);
        }

        const timer = setTimeout(() => {
            setCurrentIndex((prev) => prev + 1);
        }, stepDelay);

        return () => clearTimeout(timer);
    }, [steps, currentIndex, stepIndex]);

    const currentPercentage = steps[currentIndex]?.percentage ?? 10;

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 0',
            }}
        >
            <DottedSpinner
                size={38}
                dotSize={5}
                spinSpeed={4}
                radialSpeed={1.2}
                minRadiusFactor={0.4}
                maxRadiusFactor={0.75}
                glowIntensity="md"
            />
            <span>Processing prompt {currentPercentage}%</span>
        </div>
    );
}

function ToolPayloadViewer({
    request,
    response,
}: {
    request?: string;
    response?: string;
}) {
    const [activeTab, setActiveTab] = useState<'request' | 'response'>(
        request ? 'request' : 'response'
    );

    return (
        <div className={styles.toolPayloadContainer}>
            <div
                className={styles.toolTabRow}
                style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}
            >
                {request && (
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'request' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('request')}
                    >
                        Request
                    </button>
                )}
                {response && (
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'response' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('response')}
                    >
                        Response
                    </button>
                )}
            </div>

            <div className={styles.tabBody}>
                {activeTab === 'request' && (
                    <pre style={{ margin: 0, overflowX: 'auto' }}>
                        {request}
                    </pre>
                )}
                {activeTab === 'response' && (
                    <pre style={{ margin: 0, overflowX: 'auto' }}>
                        {response}
                    </pre>
                )}
            </div>
        </div>
    );
}

export default function AiChatDialogTarun({
    activeView,
    chatSeq,
}: {
    activeView: 'tarun' | 'chakri';
    chatSeq: chatSeqType;
}) {
    const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
    const [visibleCount, setVisibleCount] = useState(1);
    const [startTime, setStartTime] = useState<number | null>(() =>
        chatSeq?.length ? Date.now() : null
    );
    const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
    const [allStepsExpanded, setAllStepsExpanded] = useState<boolean>(false);
    const [toolsExpanded, setToolsExpanded] = useState<boolean>(false);

    const prevChatSeqLengthRef = useRef(chatSeq?.length);

    useEffect(() => {
        const currentLength = chatSeq?.length ?? 0;
        const prevLength = prevChatSeqLengthRef.current ?? 0;

        if (currentLength <= 1 || currentLength < prevLength) {
            setVisibleCount(1);
            setCollapsed({});
            setStartTime(Date.now());
            setElapsedSeconds(0);
            setAllStepsExpanded(false);
            setToolsExpanded(false);
        } else if (!startTime && currentLength > 0) {
            setStartTime(Date.now());
        }
        prevChatSeqLengthRef.current = currentLength;
    }, [chatSeq, startTime]);

    const activeSequence = chatSeq ? chatSeq.slice(0, visibleCount) : [];
    const currentStep = activeSequence[activeSequence.length - 1];
    const isProcessingActive = currentStep?.type === 'processing';

    const isAllComplete = Boolean(
        chatSeq &&
        chatSeq.length > 0 &&
        visibleCount >= chatSeq.length &&
        !isProcessingActive
    );

    useEffect(() => {
        if (!startTime || isAllComplete) return;

        const timer = setInterval(() => {
            const currentElapsed = Math.floor((Date.now() - startTime) / 1000);
            setElapsedSeconds(currentElapsed);
        }, 1000);

        return () => clearInterval(timer);
    }, [startTime, isAllComplete]);

    const toggleStep = (index: number) => {
        setCollapsed((prev) => {
            const isCurrentActive = index === activeSequence.length - 1;
            const defaultCollapsed = isAllComplete ? true : !isCurrentActive;
            const currentCollapsedState = prev[index] ?? defaultCollapsed;

            return {
                ...prev,
                [index]: !currentCollapsedState,
            };
        });
    };

    const toggleAllSteps = () => {
        setAllStepsExpanded((prev) => !prev);
    };

    const toggleToolsExpanded = () => {
        setToolsExpanded((prev) => !prev);
    };

    const handleProcessingComplete = useCallback(() => {
        if (chatSeq && visibleCount < chatSeq.length) {
            setVisibleCount((prev) => prev + 1);
        }
    }, [visibleCount, chatSeq]);

    useEffect(() => {
        if (
            !isProcessingActive &&
            currentStep &&
            chatSeq &&
            visibleCount < chatSeq.length
        ) {
            const timer = setTimeout(() => {
                setVisibleCount((prev) => prev + 1);
            }, 600);

            return () => clearTimeout(timer);
        }
    }, [currentStep, isProcessingActive, visibleCount, chatSeq]);

    const getHeaderLabel = (type: string, isCompleted: boolean) => {
        if (type === 'reasoning') {
            return isCompleted ? 'Reasoned' : 'Reasoning';
        }
        return type ? type.charAt(0).toUpperCase() + type.slice(1) : '';
    };

    const getToolActionLabel = (action?: string) => {
        switch (action) {
            case 'list':
                return 'Listed';
            case 'read':
                return 'Read';
            case 'fetch':
                return 'Fetched';
            case 'edit':
                return 'Edited';
            case 'modify':
                return 'Edited';
            case 'update':
                return 'Updated';
            default:
                return action
                    ? action.charAt(0).toUpperCase() + action.slice(1)
                    : 'Action';
        }
    };

    const totalToolCount =
        chatSeq?.filter((s) => s.type === 'tool').length ?? 0;
    const readFilesCount =
        chatSeq?.filter((s) => s.type === 'tool' && s.action === 'read')
            .length ?? 0;
    const showHeader = visibleCount > 1 && !isAllComplete;

    if (!chatSeq || chatSeq.length === 0) {
        return null;
    }

    return (
        <div
            className={`${styles.tarun} ${activeView === 'tarun' ? styles.active : ''}`}
        >
            <div>
                <div
                    className={`${styles.tarun} ${activeView === 'tarun' ? styles.active : ''}`}
                >
                    {/* Top Completion Badge Button */}
                    {isAllComplete && (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <button
                                type="button"
                                className={styles.completionBadge}
                                onClick={toggleAllSteps}
                            >
                                Worked for {elapsedSeconds}s
                                <span
                                    className={`${styles.badgeArrow} ${allStepsExpanded ? styles.expanded : ''}`}
                                />
                            </button>

                            {/* Secondary Tool Call Summary Button */}
                            {allStepsExpanded && totalToolCount > 0 && (
                                <button
                                    type="button"
                                    className={styles.completionBadge}
                                    onClick={toggleToolsExpanded}
                                >
                                    Called {totalToolCount} tools
                                    {readFilesCount > 0
                                        ? `, read ${readFilesCount} file${readFilesCount > 1 ? 's' : ''}`
                                        : ''}
                                    <span
                                        className={`${styles.badgeArrow} ${toolsExpanded ? styles.expanded : ''}`}
                                    />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Thinking Header for live active states */}
                    {showHeader && (
                        <div
                            className={`${styles.thinkingheader} ${styles.thinkingActive}`}
                        >
                            {getHeaderLabel(currentStep?.type || '', false)}
                        </div>
                    )}

                    {/* Collapsible Container for internal steps */}
                    <div
                        className={
                            !isAllComplete ||
                            (allStepsExpanded && toolsExpanded)
                                ? styles.stepsExpandedContainer
                                : styles.stepsCollapsedContainer
                        }
                    >
                        {activeSequence.map((s, index) => {
                            if (
                                s.type === 'processing' ||
                                s.type === 'response'
                            )
                                return null;

                            const isCurrentActive =
                                index === activeSequence.length - 1;
                            const isStepCompleted =
                                index < activeSequence.length - 1 ||
                                isAllComplete;

                            const defaultCollapsed = isAllComplete
                                ? true
                                : !isCurrentActive;

                            const isCollapsed =
                                collapsed[index] ?? defaultCollapsed;

                            return (
                                <div key={index} className={styles.seqwrapper}>
                                    <div
                                        className={`${styles.seqheader} ${isCollapsed ? styles.collapsed : ''}`}
                                        onClick={() => toggleStep(index)}
                                    >
                                        <h5
                                            style={
                                                !isCollapsed
                                                    ? ({
                                                          '--after-opacity':
                                                              '1',
                                                      } as React.CSSProperties)
                                                    : undefined
                                            }
                                        >
                                            {s.type === 'tool' ? (
                                                <span
                                                    className={
                                                        styles.toolHeaderContent
                                                    }
                                                >
                                                    {[
                                                        'edit',
                                                        'modify',
                                                        'update',
                                                    ].includes(
                                                        s.action ?? ''
                                                    ) ? (
                                                        <IconPencil size={15} />
                                                    ) : (
                                                        <IconEye size={15} />
                                                    )}
                                                    <span
                                                        className={
                                                            styles.toolActionText
                                                        }
                                                    >
                                                        {getToolActionLabel(
                                                            s.action
                                                        )}
                                                    </span>
                                                    {s.path && (
                                                        <span
                                                            className={
                                                                styles.pathPill
                                                            }
                                                        >
                                                            <PathIcon
                                                                isFolder={
                                                                    s.action ===
                                                                    'list'
                                                                }
                                                            />
                                                            <span
                                                                className={
                                                                    styles.pathText
                                                                }
                                                            >
                                                                {s.path}
                                                            </span>
                                                        </span>
                                                    )}
                                                </span>
                                            ) : (
                                                <span>
                                                    {getHeaderLabel(
                                                        s.type,
                                                        isStepCompleted
                                                    )}
                                                </span>
                                            )}
                                        </h5>
                                    </div>
                                    <div
                                        className={`${styles.seqbody} ${isCollapsed ? styles.seqbodyCollapsed : ''}`}
                                    >
                                        <div className={styles.seqbodyInner}>
                                            {s.type === 'tool' ? (
                                                <ToolPayloadViewer
                                                    request={s.request}
                                                    response={s.response}
                                                />
                                            ) : (
                                                <WordByWordText
                                                    text={s.content ?? ''}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Response Container placed outside collapsible container */}
                    {activeSequence.map((s, index) => {
                        if (s.type !== 'response') return null;
                        return (
                            <div
                                key={index}
                                className={styles.responseContainer}
                                style={{ marginTop: '16px' }}
                            >
                                <WordByWordText text={s.content ?? ''} />
                            </div>
                        );
                    })}
                </div>

                <div
                    className={`${styles.tarun} ${activeView === 'chakri' ? styles.active : ''}`}
                />

                {!isAllComplete && (
                    <div style={{ marginTop: '16px' }}>
                        {isProcessingActive ? (
                            <SimulatedProcessing
                                content={currentStep.content ?? ''}
                                key={`process-${visibleCount}`}
                                stepIndex={visibleCount}
                                onComplete={handleProcessingComplete}
                            />
                        ) : (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 0',
                                }}
                            >
                                <DottedSpinner
                                    size={38}
                                    dotSize={5}
                                    spinSpeed={4}
                                    radialSpeed={1.2}
                                    minRadiusFactor={0.4}
                                    maxRadiusFactor={0.75}
                                    glowIntensity="md"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
