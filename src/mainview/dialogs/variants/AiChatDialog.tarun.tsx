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

export type TokenSpeedMode =
    'very_slow' | 'slow' | 'standard' | 'fast' | 'very_fast';

const SPEED_CONFIG: Record<
    TokenSpeedMode,
    { label: string; multiplier: number }
> = {
    very_slow: { label: '🐢 Very Slow (3-10 tps)', multiplier: 18.0 },
    slow: { label: '🚶 Slow (~15 tps)', multiplier: 6.0 },
    standard: { label: '⚡ Standard (~40 tps)', multiplier: 1.0 },
    fast: { label: '🚀 Fast (70-80 tps)', multiplier: 0.45 },
    very_fast: { label: '⚡⚡ Very Fast (120+ tps)', multiplier: 0.15 },
};

function getTextAnimationTiming(text: string, speedMode: TokenSpeedMode) {
    const words = text ? text.split(/(\s+)/) : [];
    const multiplier = SPEED_CONFIG[speedMode].multiplier;
    const baseDelay = 250 / Math.max(words.length, 1);
    const wordDelay = Math.max(0.5, baseDelay * multiplier);
    const animationDuration = Math.max(80, Math.min(300, wordDelay * 6));
    const totalDuration =
        words.length > 0
            ? (words.length - 1) * wordDelay + animationDuration
            : 0;

    return { words, wordDelay, animationDuration, totalDuration };
}

function WordByWordText({
    text,
    animate,
    speedMode = 'standard',
}: {
    text: string;
    animate: boolean;
    speedMode?: TokenSpeedMode;
}) {
    const { words, wordDelay, animationDuration } = getTextAnimationTiming(
        text,
        speedMode
    );

    if (!animate) {
        return <span>{text}</span>;
    }

    return (
        <span key={speedMode}>
            {words.map((word, i) => (
                <span
                    key={i}
                    className={styles.word}
                    style={
                        {
                            animationDelay: `${i * wordDelay}ms`,
                            '--word-duration': `${animationDuration}ms`,
                        } as React.CSSProperties
                    }
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
                        type="button"
                        className={`${styles.tabBtn} ${activeTab === 'request' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('request')}
                    >
                        Request
                    </button>
                )}
                {response && (
                    <button
                        type="button"
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
    const [userToggled, setUserToggled] = useState<Record<number, boolean>>({});
    const [animatedSteps, setAnimatedSteps] = useState<Record<number, boolean>>(
        {}
    );
    const [visibleCount, setVisibleCount] = useState(1);

    // Initialize start time securely on mount or when sequence starts
    const [startTime, setStartTime] = useState<number>(() => Date.now());
    const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
    const [allStepsExpanded, setAllStepsExpanded] = useState<boolean>(false);
    const [toolsExpanded, setToolsExpanded] = useState<boolean>(false);
    const [tokenSpeed, setTokenSpeed] = useState<TokenSpeedMode>('standard');

    const runIdRef = useRef<number>(0);
    const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
    const intervalsRef = useRef<NodeJS.Timeout[]>([]);

    const clearTimers = () => {
        timeoutsRef.current.forEach(clearTimeout);
        intervalsRef.current.forEach(clearInterval);
        timeoutsRef.current = [];
        intervalsRef.current = [];
    };

    const prevChatSeqLengthRef = useRef(chatSeq?.length);

    useEffect(() => {
        runIdRef.current += 1;
        clearTimers();

        const currentLength = chatSeq?.length ?? 0;
        const prevLength = prevChatSeqLengthRef.current ?? 0;

        if (currentLength <= 1 || currentLength < prevLength) {
            setVisibleCount(1);
            setCollapsed({});
            setUserToggled({});
            setAnimatedSteps({});
            setStartTime(Date.now());
            setElapsedSeconds(0);
            setAllStepsExpanded(false);
            setToolsExpanded(false);
        }
        prevChatSeqLengthRef.current = currentLength;

        return () => clearTimers();
    }, [chatSeq]);

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
        const activeIndex = visibleCount - 1;
        const step = chatSeq?.[activeIndex];
        if (
            !step ||
            step.type === 'processing' ||
            step.type === 'tool' ||
            animatedSteps[activeIndex]
        ) {
            return;
        }

        const { totalDuration } = getTextAnimationTiming(
            step.content ?? '',
            tokenSpeed
        );
        const currentRunId = runIdRef.current;

        const markAnimatedTimer = setTimeout(() => {
            if (currentRunId !== runIdRef.current) return;
            setAnimatedSteps((prev) => ({ ...prev, [activeIndex]: true }));
        }, totalDuration + 50);

        timeoutsRef.current.push(markAnimatedTimer);
        return () => clearTimeout(markAnimatedTimer);
    }, [visibleCount, chatSeq, tokenSpeed, animatedSteps]);

    // Live elapsed timer calculation
    useEffect(() => {
        if (isAllComplete) return;
        const currentRunId = runIdRef.current;

        const timer = setInterval(() => {
            if (currentRunId !== runIdRef.current) return;
            const currentElapsed = Math.floor((Date.now() - startTime) / 1000);
            setElapsedSeconds(currentElapsed);
        }, 1000);

        intervalsRef.current.push(timer);
        return () => clearInterval(timer);
    }, [startTime, isAllComplete]);

    const toggleStep = (index: number) => {
        setAnimatedSteps((prev) =>
            prev[index] ? prev : { ...prev, [index]: true }
        );
        setUserToggled((prev) => ({ ...prev, [index]: true }));

        setCollapsed((prev) => {
            const isCurrentActive = index === activeSequence.length - 1;
            const defaultCollapsed = isAllComplete ? true : !isCurrentActive;
            const currentCollapsedState = prev[index] ?? defaultCollapsed;
            return { ...prev, [index]: !currentCollapsedState };
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
            const currentRunId = runIdRef.current;

            const stepWaitTime =
                currentStep.type === 'tool'
                    ? 600
                    : Math.max(
                          600,
                          getTextAnimationTiming(
                              currentStep.content ?? '',
                              tokenSpeed
                          ).totalDuration + 250
                      );

            const timer = setTimeout(() => {
                if (currentRunId !== runIdRef.current) return;
                setVisibleCount((prev) => prev + 1);
            }, stepWaitTime);

            timeoutsRef.current.push(timer);
            return () => clearTimeout(timer);
        }
    }, [currentStep, isProcessingActive, visibleCount, chatSeq, tokenSpeed]);

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
            <div className={styles.speedControllerBar}>
                <span className={styles.speedLabel}>Speed:</span>
                {(
                    [
                        'very_slow',
                        'slow',
                        'standard',
                        'fast',
                        'very_fast',
                    ] as TokenSpeedMode[]
                ).map((mode) => (
                    <button
                        key={mode}
                        type="button"
                        className={`${styles.speedBtn} ${tokenSpeed === mode ? styles.activeSpeedBtn : ''}`}
                        onClick={() => setTokenSpeed(mode)}
                        title={SPEED_CONFIG[mode].label}
                    >
                        {mode === 'very_slow' && 'Very Slow'}
                        {mode === 'slow' && 'Slow'}
                        {mode === 'standard' && 'Standard'}
                        {mode === 'fast' && 'Fast'}
                        {mode === 'very_fast' && 'Very Fast'}
                    </button>
                ))}
            </div>

            <div>
                {isAllComplete && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <button
                            type="button"
                            className={styles.completionBadge}
                            onClick={toggleAllSteps}
                        >
                            Worked for {elapsedSeconds}s{' '}
                            <span
                                className={`${styles.badgeArrow} ${allStepsExpanded ? styles.expanded : ''}`}
                            />
                        </button>
                        {allStepsExpanded && totalToolCount > 0 && (
                            <button
                                type="button"
                                className={styles.completionBadge}
                                onClick={toggleToolsExpanded}
                            >
                                Called {totalToolCount} tools{' '}
                                {readFilesCount > 0
                                    ? `, read ${readFilesCount} file${readFilesCount > 1 ? 's' : ''}`
                                    : ''}{' '}
                                <span
                                    className={`${styles.badgeArrow} ${toolsExpanded ? styles.expanded : ''}`}
                                />
                            </button>
                        )}
                    </div>
                )}

                {showHeader && (
                    <div
                        className={`${styles.thinkingheader} ${styles.thinkingActive}`}
                    >
                        {getHeaderLabel(currentStep?.type || '', false)}
                    </div>
                )}

                <div
                    className={
                        !isAllComplete || (allStepsExpanded && toolsExpanded)
                            ? styles.stepsExpandedContainer
                            : styles.stepsCollapsedContainer
                    }
                >
                    {activeSequence.map((s, index) => {
                        if (s.type === 'processing' || s.type === 'response')
                            return null;
                        const isCurrentActive =
                            index === activeSequence.length - 1;
                        const isStepCompleted =
                            index < activeSequence.length - 1 || isAllComplete;

                        const defaultCollapsed = isAllComplete
                            ? true
                            : !isCurrentActive;

                        // FIX: Honor user toggle state permanently once clicked, ignoring global collapse states
                        const isCollapsed = userToggled[index]
                            ? (collapsed[index] ?? false)
                            : allStepsExpanded
                              ? false
                              : defaultCollapsed;

                        const shouldAnimate =
                            !isCollapsed && !animatedSteps[index];

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
                                                      '--after-opacity': '1',
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
                                                ].includes(s.action ?? '') ? (
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
                                                animate={shouldAnimate}
                                                speedMode={tokenSpeed}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {activeSequence.map((s, index) => {
                    if (s.type !== 'response') return null;
                    return (
                        <div key={index} className={styles.responseContainer}>
                            <WordByWordText
                                text={s.content ?? ''}
                                animate={!animatedSteps[index]}
                                speedMode={tokenSpeed}
                            />
                        </div>
                    );
                })}
            </div>

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
    );
}
