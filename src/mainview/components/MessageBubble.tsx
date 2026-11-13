import { forwardRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
    IconArrowBack,
    IconCheck,
    IconChevronLeft,
    IconChevronRight,
    IconCopy,
    IconEdit,
    IconRefresh,
} from '@tabler/icons-react';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../../shared/types/ai';
import ThinkingPanel from './thinking/ThinkingPanel';

//import 'highlight.js/styles/github-dark.css';

interface MessageBubbleProps {
    message: ChatMessage;
    modelDisplayText?: string;
    justCopiedId: string | null;
    viewMode: 'full' | 'truncate' | 'accordion';
    isOld: boolean;
    isExpanded: boolean;
    isStreaming: boolean;
    onCopy: (id: string) => void;
    onRetry: (id: string) => void;
    onUndo: (id: string) => void;
    onRemove: (id: string) => void;
    onVariantChange: (id: string, variantIndex: number) => void;
    onExpand: (id: string) => void;
    createEntryButton?: React.ReactNode;
    createStructureButton?: React.ReactNode;
}

function formatTimestamp(iso: string): string {
    try {
        const d = new Date(iso);
        return d
            .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
            .toLowerCase();
    } catch {
        return '';
    }
}

const MessageBubble = forwardRef<HTMLDivElement, MessageBubbleProps>(
    (
        {
            message,
            modelDisplayText,
            justCopiedId,
            viewMode,
            isOld,
            isExpanded,
            isStreaming,
            onCopy,
            onRetry,
            onUndo,
            onRemove,
            onVariantChange,
            onExpand,
            createEntryButton,
            createStructureButton,
        },
        ref
    ) => {
        const isAssistant = message.role === 'assistant';
        const assistantContent = isAssistant
            ? (message.content[message.currentVariantIndex] ?? '')
            : '';
        const assistantReasoning = isAssistant ? message.reasoning : undefined;
        const assistantSteps = isAssistant ? message.steps : undefined;

        const [stepsExpanded, setStepsExpanded] = useState(false);
        const [toolsExpanded, setToolsExpanded] = useState(false);

        const toggleSteps = () => {
            const next = !stepsExpanded;
            setStepsExpanded(next);
            if (!next) setToolsExpanded(false);
        };

        const renderMarkdown = (text: string) => (
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
            >
                {text}
            </ReactMarkdown>
        );

        // Accordion preview for old messages
        if (viewMode === 'accordion' && isOld && !isExpanded) {
            const previewText = isAssistant
                ? message.content[message.currentVariantIndex]
                : message.content;
            const truncated = previewText.slice(0, 60);
            return (
                <div
                    className="chat-message accordion-preview"
                    onClick={() => onExpand(message.id)}
                    data-msg-id={message.id}
                >
                    <span className="accordion-preview-text">{truncated}…</span>
                    <span className="accordion-preview-role">
                        {message.role}
                    </span>
                </div>
            );
        }

        if (isAssistant) {
            const totalVariants = message.content.length;
            const isCopied = justCopiedId === message.id;
            const isTruncated = viewMode === 'truncate' && isOld && !isExpanded;
            const canToggleSteps =
                !!assistantSteps && assistantSteps.length > 0 && !isStreaming;

            return (
                <div
                    ref={ref}
                    className="message-wrapper assistant"
                    data-msg-id={message.id}
                >
                    <div
                        className={
                            'chat-message-header' +
                            (canToggleSteps ? ' is-clickable' : '')
                        }
                        onClick={canToggleSteps ? toggleSteps : undefined}
                        onKeyDown={
                            canToggleSteps
                                ? (event) => {
                                      if (
                                          event.key === 'Enter' ||
                                          event.key === ' '
                                      ) {
                                          event.preventDefault();
                                          toggleSteps();
                                      }
                                  }
                                : undefined
                        }
                        role={canToggleSteps ? 'button' : undefined}
                        tabIndex={canToggleSteps ? 0 : undefined}
                        aria-expanded={
                            canToggleSteps ? stepsExpanded : undefined
                        }
                    >
                        <span
                            className={`message-mode-badge badge-${message.mode}`}
                        >
                            {message.mode}
                        </span>
                        <span className="message-header-sep">•</span>
                        <span className="message-timestamp">
                            {formatTimestamp(message.timestamp)}
                        </span>
                        {canToggleSteps && (
                            <>
                                <span className="message-header-sep">•</span>
                                <span className="message-worked">
                                    {message.durationMs != null
                                        ? `Worked for ${Math.floor(
                                              message.durationMs / 1000
                                          )}s`
                                        : 'Worked'}
                                    <span
                                        className={
                                            'message-worked-arrow' +
                                            (stepsExpanded ? ' open' : '')
                                        }
                                    />
                                </span>
                            </>
                        )}
                    </div>
                    <div className="chat-message assistant">
                        <div
                            className={
                                'chat-message-body' +
                                (isTruncated ? ' truncated' : '')
                            }
                        >
                            <ThinkingPanel
                                steps={assistantSteps}
                                reasoning={assistantReasoning}
                                isStreaming={isStreaming}
                                hasResponse={assistantContent.length > 0}
                                stepsExpanded={stepsExpanded}
                                toolsExpanded={toolsExpanded}
                                onToggleTools={() =>
                                    setToolsExpanded((prev) => !prev)
                                }
                                renderMarkdown={renderMarkdown}
                            >
                                {renderMarkdown(assistantContent)}
                            </ThinkingPanel>
                        </div>
                        {isTruncated && (
                            <button
                                className="show-more-btn"
                                onClick={() => onExpand(message.id)}
                            >
                                Show More
                            </button>
                        )}
                    </div>
                    <div className="chat-message-footer">
                        <span className="message-meta">
                            {modelDisplayText || message.model}
                        </span>
                        {totalVariants > 1 && (
                            <div className="message-pagination">
                                <button
                                    className="message-pagination-btn"
                                    onClick={() =>
                                        onVariantChange(
                                            message.id,
                                            message.currentVariantIndex - 1
                                        )
                                    }
                                    disabled={message.currentVariantIndex === 0}
                                >
                                    <IconChevronLeft size={12} />
                                </button>
                                <span className="message-pagination-label">
                                    {message.currentVariantIndex + 1} /{' '}
                                    {totalVariants}
                                </span>
                                <button
                                    className="message-pagination-btn"
                                    onClick={() =>
                                        onVariantChange(
                                            message.id,
                                            message.currentVariantIndex + 1
                                        )
                                    }
                                    disabled={
                                        message.currentVariantIndex ===
                                        totalVariants - 1
                                    }
                                >
                                    <IconChevronRight size={12} />
                                </button>
                            </div>
                        )}
                        <div className="message-spacer" />
                        {createEntryButton && <>{createEntryButton}</>}
                        {createStructureButton && <>{createStructureButton}</>}
                        <button
                            className={
                                'message-action-btn' +
                                (isCopied ? ' copied' : '')
                            }
                            onClick={() => onCopy(message.id)}
                            title="Copy response"
                        >
                            {isCopied ? (
                                <IconCheck size={14} />
                            ) : (
                                <IconCopy size={14} />
                            )}
                        </button>
                        <button
                            className="message-action-btn"
                            onClick={() => onRetry(message.id)}
                            title="Retry"
                        >
                            <IconRefresh size={14} />
                        </button>
                    </div>
                </div>
            );
        }

        // User message
        const isCopied = justCopiedId === message.id;
        const isTruncated = viewMode === 'truncate' && isOld && !isExpanded;

        return (
            <div
                ref={ref}
                className="message-wrapper user"
                data-msg-id={message.id}
            >
                <div className="chat-message user">
                    <div
                        className={
                            'chat-message-body' +
                            (isTruncated ? ' truncated' : '')
                        }
                    >
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                        >
                            {message.content}
                        </ReactMarkdown>
                    </div>
                    {isTruncated && (
                        <button
                            className="show-more-btn"
                            onClick={() => onExpand(message.id)}
                        >
                            Show More
                        </button>
                    )}
                </div>
                <div className="chat-message-footer">
                    <span className="message-timestamp">
                        {formatTimestamp(message.timestamp)}
                    </span>
                    <div className="message-spacer" />
                    <button
                        className={
                            'message-action-btn' + (isCopied ? ' copied' : '')
                        }
                        onClick={() => onCopy(message.id)}
                        title="Copy prompt"
                    >
                        {isCopied ? (
                            <IconCheck size={14} />
                        ) : (
                            <IconCopy size={14} />
                        )}
                    </button>
                    <button
                        className="message-action-btn"
                        onClick={() => onUndo(message.id)}
                        title="Edit prompt"
                    >
                        <IconEdit size={14} />
                    </button>
                    <button
                        className="message-action-btn"
                        onClick={() => onRemove(message.id)}
                        title="Undo prompt"
                    >
                        <IconArrowBack size={14} />
                    </button>
                </div>
            </div>
        );
    }
);

MessageBubble.displayName = 'MessageBubble';

export default MessageBubble;
