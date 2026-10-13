import type { MentionTarget } from '../types/index';
import {
    IconX,
    IconFiles,
    IconUsers,
    IconMapPin2,
    IconBuildings,
    IconSwords,
    IconBook,
    IconPaperclip,
} from '@tabler/icons-react';

const typeIcons: Record<string, React.ReactNode> = {
    chapter: <IconFiles size={14} />,
    character: <IconUsers size={14} />,
    location: <IconMapPin2 size={14} />,
    organization: <IconBuildings size={14} />,
    item: <IconSwords size={14} />,
    lore: <IconBook size={14} />,
};

interface ContextChipsProps {
    mentions: MentionTarget[];
    fileLabels: string[];
    onRemoveMention: (id: string) => void;
    onRemoveFile: (index: number) => void;
    onToggleMentionMode: (id: string) => void;
}

export default function ContextChips({
    mentions,
    fileLabels,
    onRemoveMention,
    onRemoveFile,
    onToggleMentionMode,
}: ContextChipsProps) {
    if (mentions.length === 0 && fileLabels.length === 0) return null;

    return (
        <div className="context-chips">
            {mentions.map((m) => (
                <span
                    key={`mention-${m.id}`}
                    className="context-chip mention-chip"
                >
                    {typeIcons[m.type] || null}
                    <span className="context-chip-label">{m.label}</span>
                    {m.type === 'chapter' && (
                        <button
                            className="context-chip-mode"
                            onClick={() => onToggleMentionMode(m.id)}
                            title="Toggle brief/full"
                        >
                            {m.mode === 'full' ? 'Full' : 'Brief'}
                        </button>
                    )}
                    <button
                        className="context-chip-remove"
                        onClick={() => onRemoveMention(m.id)}
                    >
                        <IconX size={12} />
                    </button>
                </span>
            ))}
            {fileLabels.map((label, i) => (
                <span key={`file-${i}`} className="context-chip file-chip">
                    <IconPaperclip size={14} />
                    <span className="context-chip-label">{label}</span>
                    <button
                        className="context-chip-remove"
                        onClick={() => onRemoveFile(i)}
                    >
                        <IconX size={12} />
                    </button>
                </span>
            ))}
        </div>
    );
}
