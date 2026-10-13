import { forwardRef, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import {
    IconCopy,
    IconCheck,
    IconRefresh,
    IconEdit,
    IconArrowBack,
    IconChevronLeft,
    IconChevronRight,
    IconBrain,
    IconChevronDown,
    IconChevronUp,
} from '@tabler/icons-react';
import type { ChatMessage } from '../services/ai';
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
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
            const content = message.content[message.currentVariantIndex];
            const totalVariants = message.content.length;
            const isCopied = justCopiedId === message.id;
            const isTruncated = viewMode === 'truncate' && isOld && !isExpanded;
            const [thinkingExpanded, setThinkingExpanded] =
                useState(isStreaming);
            useEffect(() => {
                if (isStreaming) setThinkingExpanded(true);
            }, [isStreaming]);
            const hasReasoning =
                message.reasoning && message.reasoning.length > 0;

            return (
                <div
                    ref={ref}
                    className="message-wrapper assistant"
                    data-msg-id={message.id}
                >
                    <div className="chat-message-header">
                        <span className="message-mode-badge">
                            {message.mode}
                        </span>
                        <span className="message-timestamp">
                            {formatTimestamp(message.timestamp)}
                        </span>
                    </div>
                    {hasReasoning && (
                        <div className="chat-message thinking">
                            <button
                                className="thinking-toggle"
                                onClick={() =>
                                    setThinkingExpanded(!thinkingExpanded)
                                }
                            >
                                <IconBrain size={14} />
                                <span>Thinking</span>
                                {thinkingExpanded ? (
                                    <IconChevronUp size={12} />
                                ) : (
                                    <IconChevronDown size={12} />
                                )}
                            </button>
                            {thinkingExpanded && (
                                <div className="thinking-body">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        rehypePlugins={[rehypeHighlight]}
                                    >
                                        {message.reasoning}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="chat-message assistant">
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
                                {content}
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
