import { useEffect, useMemo, useState } from 'react';
import {
    IconEye,
    IconFileText,
    IconFolder,
    IconPencil,
} from '@tabler/icons-react';
import type { AssistantStep, ToolStep } from '../../../shared/types/ai';
import DottedSpinner from '../DottedSpinner';
import ProgressiveMarkdown from './ProgressiveMarkdown';
import styles from './ThinkingPanel.module.css';

interface ThinkingPanelProps {
    steps?: AssistantStep[];
    reasoning?: string;
    isStreaming: boolean;
    hasResponse?: boolean;
    stepsExpanded: boolean;
    toolsExpanded: boolean;
    onToggleTools: () => void;
    renderMarkdown: (text: string) => React.ReactNode;
    children?: React.ReactNode;
}

const PATH_KEYS = [
    'path',
    'file_path',
    'filePath',
    'filename',
    'folder',
    'directory',
    'target',
] as const;

function getToolPath(argumentsJson?: string): string | undefined {
    if (!argumentsJson) return undefined;
    try {
        const parsed = JSON.parse(argumentsJson) as Record<string, unknown>;
        for (const key of PATH_KEYS) {
            const candidate = parsed[key];
            if (typeof candidate === 'string' && candidate.length > 0) {
                return candidate;
            }
        }
        return undefined;
    } catch {
        return undefined;
    }
}

function formatArguments(argumentsJson?: string): string | undefined {
    if (!argumentsJson) return undefined;
    try {
        return JSON.stringify(JSON.parse(argumentsJson), null, 2);
    } catch {
        return argumentsJson;
    }
}

function getToolAction(name: string): string {
    const normalized = (name || '').toLowerCase();
    if (normalized.includes('list')) return 'list';
    if (/search|find|query|fetch/.test(normalized)) return 'fetch';
    if (/read|get|show|describe/.test(normalized)) return 'read';
    if (/edit|write|patch|modify/.test(normalized)) {
        return normalized.includes('modify') ? 'modify' : 'edit';
    }
    if (normalized.includes('update')) return 'update';
    if (/create|add|insert/.test(normalized)) return 'create';
    return normalized.split(/[_-]/)[0] || normalized;
}

function getHeaderLabel(type: string, isCompleted: boolean): string {
    if (type === 'reasoning') {
        return isCompleted ? 'Reasoned' : 'Reasoning';
    }
    return type ? type.charAt(0).toUpperCase() + type.slice(1) : '';
}

function getToolActionLabel(action?: string): string {
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
}

function PathIcon({ isFolder }: { isFolder?: boolean }) {
    return isFolder ? (
        <IconFolder size={13} style={{ opacity: 0.7 }} />
    ) : (
        <IconFileText size={13} style={{ opacity: 0.7 }} />
    );
}

function ToolPayloadViewer({ step }: { step: ToolStep }) {
    const request = formatArguments(step.arguments);
    const response = step.result;
    const [activeTab, setActiveTab] = useState<'request' | 'response'>(
        request ? 'request' : 'response'
    );
    const effectiveTab = response ? activeTab : 'request';

    return (
        <div className={styles.toolPayload}>
            <div className={styles.toolTabRow}>
                {request && (
                    <button
                        type="button"
                        className={`${styles.tabBtn} ${
                            effectiveTab === 'request'
                                ? styles.tabBtnActive
                                : ''
                        }`}
                        onClick={() => setActiveTab('request')}
                    >
                        Request
                    </button>
                )}
                {response && (
                    <button
                        type="button"
                        className={`${styles.tabBtn} ${
                            effectiveTab === 'response'
                                ? styles.tabBtnActive
                                : ''
                        }`}
                        onClick={() => setActiveTab('response')}
                    >
                        Response
                    </button>
                )}
            </div>
            <div className={styles.tabBody}>
                <pre className={styles.toolPre}>
                    {effectiveTab === 'request' ? request : response}
                </pre>
            </div>
        </div>
    );
}

export default function ThinkingPanel({
    steps,
    reasoning,
    isStreaming,
    hasResponse = false,
    stepsExpanded,
    toolsExpanded,
    onToggleTools,
    renderMarkdown,
    children,
}: ThinkingPanelProps) {
    const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
    const [userToggled, setUserToggled] = useState<Record<number, boolean>>({});

    useEffect(() => {
        if (!stepsExpanded) {
            setCollapsed({});
            setUserToggled({});
        }
    }, [stepsExpanded]);

    const effectiveSteps = useMemo<AssistantStep[]>(() => {
        if (steps && steps.length > 0) return steps;
        if (reasoning && reasoning.length > 0) {
            return [{ type: 'reasoning', content: reasoning }];
        }
        return [];
    }, [steps, reasoning]);

    const isThinking = isStreaming && !hasResponse;

    if (effectiveSteps.length === 0 && !isStreaming) {
        return <>{children}</>;
    }

    const activeIndex = effectiveSteps.length - 1;
    const isComplete = !isStreaming && effectiveSteps.length > 0;
    const currentStep = effectiveSteps[activeIndex];
    const toolCount = effectiveSteps.filter(
        (step) => step.type === 'tool'
    ).length;
    const readCount = effectiveSteps.filter(
        (step) => step.type === 'tool' && getToolAction(step.name) === 'read'
    ).length;
    const showThinkingHeader = isStreaming && effectiveSteps.length > 0;

    const showSteps =
        isStreaming || (stepsExpanded && (toolCount === 0 || toolsExpanded));

    const toggleStep = (index: number, isCollapsed: boolean) => {
        setUserToggled((prev) => ({ ...prev, [index]: true }));
        setCollapsed((prev) => ({ ...prev, [index]: !isCollapsed }));
    };

    return (
        <div className={styles.tarun}>
            {isComplete && stepsExpanded && toolCount > 0 && (
                <div className={styles.completionBadges}>
                    <button
                        type="button"
                        className={`${styles.completionBadge} ${styles.completionBadgeNested}`}
                        onClick={onToggleTools}
                    >
                        Called {toolCount} tools
                        {readCount > 0
                            ? `, read ${readCount} file${readCount > 1 ? 's' : ''}`
                            : ''}{' '}
                        <span
                            className={`${styles.badgeArrow} ${
                                toolsExpanded ? styles.badgeArrowExpanded : ''
                            }`}
                        />
                    </button>
                </div>
            )}

            {showThinkingHeader && currentStep && (
                <div
                    className={`${styles.thinkingheader} ${styles.thinkingActive}`}
                >
                    {getHeaderLabel(currentStep.type, false)}
                </div>
            )}

            <div
                className={
                    showSteps
                        ? styles.stepsExpandedContainer
                        : styles.stepsCollapsedContainer
                }
            >
                {effectiveSteps.map((step, index) => {
                    const isStepCompleted = index < activeIndex || isComplete;
                    const defaultCollapsed = isStreaming
                        ? step.type !== 'reasoning'
                        : true;
                    const isCollapsed = userToggled[index]
                        ? (collapsed[index] ?? false)
                        : stepsExpanded
                          ? false
                          : defaultCollapsed;
                    const action =
                        step.type === 'tool' ? getToolAction(step.name) : '';
                    const path =
                        step.type === 'tool'
                            ? getToolPath(step.arguments)
                            : undefined;

                    return (
                        <div
                            key={
                                step.type === 'tool'
                                    ? step.id
                                    : `reasoning-${index}`
                            }
                            className={styles.seqwrapper}
                        >
                            <div
                                className={`${styles.seqheader} ${
                                    isCollapsed ? styles.collapsed : ''
                                }`}
                                onClick={() => toggleStep(index, isCollapsed)}
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
                                    {step.type === 'tool' ? (
                                        <span
                                            className={styles.toolHeaderContent}
                                        >
                                            {[
                                                'edit',
                                                'modify',
                                                'update',
                                            ].includes(action) ? (
                                                <IconPencil size={15} />
                                            ) : (
                                                <IconEye size={15} />
                                            )}
                                            <span
                                                className={
                                                    styles.toolActionText
                                                }
                                            >
                                                {getToolActionLabel(action)}
                                            </span>
                                            {path && (
                                                <span
                                                    className={
                                                        styles.tarunPathPill
                                                    }
                                                >
                                                    <PathIcon
                                                        isFolder={
                                                            action === 'list'
                                                        }
                                                    />
                                                    <span
                                                        className={
                                                            styles.tarunPathText
                                                        }
                                                    >
                                                        {path}
                                                    </span>
                                                </span>
                                            )}
                                            {step.status === 'error' && (
                                                <span
                                                    className={
                                                        styles.tarunErrorBadge
                                                    }
                                                >
                                                    Failed
                                                </span>
                                            )}
                                        </span>
                                    ) : (
                                        <span>
                                            {getHeaderLabel(
                                                step.type,
                                                isStepCompleted
                                            )}
                                        </span>
                                    )}
                                </h5>
                            </div>
                            <div
                                className={`${styles.seqbody} ${
                                    isCollapsed ? styles.seqbodyCollapsed : ''
                                }`}
                            >
                                <div className={styles.seqbodyInner}>
                                    {step.type === 'tool' ? (
                                        <ToolPayloadViewer step={step} />
                                    ) : (
                                        <ProgressiveMarkdown
                                            text={step.content}
                                            isStreaming={
                                                isStreaming &&
                                                !isCollapsed &&
                                                index === activeIndex
                                            }
                                            renderMarkdown={renderMarkdown}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {children && (
                <div
                    className={`${styles.responseContainer} ${
                        isStreaming && hasResponse
                            ? styles.responseStreaming
                            : ''
                    }`}
                >
                    {children}
                </div>
            )}

            {isThinking && (
                <div className={styles.tarunProcessing}>
                    <DottedSpinner
                        size={38}
                        dotSize={5}
                        spinSpeed={4}
                        radialSpeed={1.2}
                        minRadiusFactor={0.4}
                        maxRadiusFactor={0.75}
                        glowIntensity="md"
                    />
                    {effectiveSteps.length === 0 && (
                        <span className={styles.tarunProcessingLabel}>
                            Processing prompt
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
