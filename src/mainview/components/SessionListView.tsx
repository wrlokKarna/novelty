import { useState, useRef, useEffect } from 'react';
import {
    IconArchive,
    IconArchiveOff,
    IconTrash,
    IconPencil,
} from '@tabler/icons-react';
import type { ChatSession } from '../types';

interface SessionListViewProps {
    sessions: ChatSession[];
    type: 'history' | 'archive';
    onSelect: (id: string) => void;
    onAction: (id: string) => void;
    onDelete: (id: string) => void;
    onRename?: (id: string, newTitle: string) => void;
}

function formatTime(isoString: string | Date): string {
    try {
        const d = new Date(isoString);
        return d.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return String(isoString);
    }
}

export default function SessionListView({
    sessions,
    type,
    onSelect,
    onAction,
    onDelete,
    onRename,
}: SessionListViewProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const editInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingId && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingId]);

    const handleStartEdit = (id: string, currentTitle: string) => {
        setEditingId(id);
        setEditValue(currentTitle);
    };

    const handleCommitEdit = () => {
        if (editingId && editValue.trim() && onRename) {
            onRename(editingId, editValue.trim());
        }
        setEditingId(null);
        setEditValue('');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditValue('');
    };

    const handleDeleteClick = (id: string) => {
        if (type === 'archive') {
            alert(
                'This session is vaulted. You must unvault it before it can be deleted.'
            );
            return;
        }
        onDelete(id);
    };

    if (sessions.length === 0) {
        return (
            <div className="session-list-empty">
                <p>
                    {type === 'history'
                        ? 'No recent chat history found.'
                        : 'Your archive vault is empty.'}
                </p>
            </div>
        );
    }

    return (
        <div className="session-list-view">
            {sessions.map((session) => (
                <div
                    key={session.id}
                    className="session-list-item"
                    onClick={() => onSelect(session.id)}
                >
                    <div className="session-list-item-content">
                        {editingId === session.id ? (
                            <input
                                ref={editInputRef}
                                className="session-list-title-input"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCommitEdit();
                                    if (e.key === 'Escape') handleCancelEdit();
                                    e.stopPropagation();
                                }}
                                onBlur={handleCommitEdit}
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <span className="session-list-item-title">
                                {session.title || 'Untitled Session'}
                            </span>
                        )}
                        <span className="session-list-item-timestamp">
                            {formatTime(session.updatedAt)}
                        </span>
                    </div>

                    <div
                        className="session-list-item-actions"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {onRename && editingId !== session.id && (
                            <button
                                className="message-action-btn session-list-rename-btn"
                                title="Rename Session"
                                onClick={() =>
                                    handleStartEdit(session.id, session.title)
                                }
                            >
                                <IconPencil size={14} />
                            </button>
                        )}
                        <button
                            className="message-action-btn"
                            title={
                                type === 'history'
                                    ? 'Archive Session'
                                    : 'Restore Session'
                            }
                            onClick={() => onAction(session.id)}
                        >
                            {type === 'history' ? (
                                <IconArchive size={16} />
                            ) : (
                                <IconArchiveOff size={16} />
                            )}
                        </button>
                        <button
                            className="message-action-btn delete-btn"
                            title={
                                type === 'archive'
                                    ? 'Unvault before deleting'
                                    : 'Delete Permanently'
                            }
                            disabled={type === 'archive'}
                            onClick={() => handleDeleteClick(session.id)}
                        >
                            <IconTrash size={16} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
