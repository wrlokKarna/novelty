import type { ReactNode } from 'react';
import type { StoryScene, Character } from '../types/index';
import {
    IconPlus,
    IconTrash,
    IconChevronDown,
    IconChevronRight,
} from '@tabler/icons-react';

interface Props {
    scene: StoryScene;
    index: number;
    characters: Character[];
    collapsed: boolean;
    onToggleCollapsed: () => void;
    onChange: (id: string, field: string, value: unknown) => void;
    onRemove: (id: string) => void;
    dragHandle?: ReactNode;
    extraActions?: ReactNode;
}

function parseStringArray(value: string | null): string[] {
    try {
        const parsed = value ? JSON.parse(value) : [];
        return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
        return [];
    }
}

export default function SceneCardEditor({
    scene,
    index,
    characters,
    collapsed,
    onToggleCollapsed,
    onChange,
    onRemove,
    dragHandle,
    extraActions,
}: Props) {
    const charactersPresent = parseStringArray(scene.charactersPresent);
    const keyEvents = parseStringArray(scene.keyEvents);

    function toggleCharacter(charId: string) {
        const present = charactersPresent.includes(charId)
            ? charactersPresent.filter((id) => id !== charId)
            : [...charactersPresent, charId];
        onChange(scene.id, 'charactersPresent', JSON.stringify(present));
    }

    function updateKeyEvent(idx: number, value: string) {
        const events = [...keyEvents];
        events[idx] = value;
        onChange(scene.id, 'keyEvents', JSON.stringify(events));
    }

    function addKeyEvent() {
        onChange(scene.id, 'keyEvents', JSON.stringify([...keyEvents, '']));
    }

    function removeKeyEvent(idx: number) {
        onChange(
            scene.id,
            'keyEvents',
            JSON.stringify(keyEvents.filter((_, i) => i !== idx))
        );
    }

    return (
        <div className={`scene-card${collapsed ? ' collapsed' : ''}`}>
            <div className="scene-header">
                {dragHandle}
                <button
                    className="collapse-btn"
                    onClick={onToggleCollapsed}
                    title={collapsed ? 'Expand scene' : 'Collapse scene'}
                >
                    {collapsed ? (
                        <IconChevronRight size={16} />
                    ) : (
                        <IconChevronDown size={16} />
                    )}
                </button>
                <span className="scene-number">Scene {index + 1}</span>
                {extraActions}
                <button
                    className="icon-btn icon-btn-sm"
                    onClick={() => onRemove(scene.id)}
                >
                    <IconTrash size={12} />
                </button>
            </div>
            <input
                className="scene-title"
                placeholder="Scene title..."
                value={scene.title}
                onChange={(e) => onChange(scene.id, 'title', e.target.value)}
            />
            <div className="scene-body">
                <textarea
                    placeholder="What happens in this scene?"
                    value={scene.summary || ''}
                    onChange={(e) =>
                        onChange(scene.id, 'summary', e.target.value)
                    }
                    rows={2}
                />
                <div className="scene-details">
                    <input
                        placeholder="Setting (e.g. The Throne Room)"
                        value={scene.setting || ''}
                        onChange={(e) =>
                            onChange(scene.id, 'setting', e.target.value)
                        }
                    />
                    <input
                        placeholder="Duration (e.g. 10 minutes)"
                        value={scene.duration || ''}
                        onChange={(e) =>
                            onChange(scene.id, 'duration', e.target.value)
                        }
                    />
                    <input
                        placeholder="Core conflict..."
                        value={scene.conflict || ''}
                        onChange={(e) =>
                            onChange(scene.id, 'conflict', e.target.value)
                        }
                    />
                </div>
                {characters.length > 0 && (
                    <div className="scene-characters">
                        <label>Characters present:</label>
                        <div className="char-tags">
                            {characters.map((ch) => (
                                <button
                                    key={ch.id}
                                    className={`char-tag ${charactersPresent.includes(ch.id) ? 'active' : ''}`}
                                    onClick={() => toggleCharacter(ch.id)}
                                >
                                    {ch.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {keyEvents.length > 0 && (
                    <div className="scene-key-events">
                        <label>Key events:</label>
                        {keyEvents.map((event, idx) => (
                            <div key={idx} className="key-event-row">
                                <input
                                    value={event}
                                    onChange={(e) =>
                                        updateKeyEvent(idx, e.target.value)
                                    }
                                    placeholder="e.g. Protagonist discovers the hidden letter"
                                />
                                <button
                                    className="icon-btn icon-btn-sm"
                                    onClick={() => removeKeyEvent(idx)}
                                >
                                    <IconTrash size={12} />
                                </button>
                            </div>
                        ))}
                        <button className="icon-btn" onClick={addKeyEvent}>
                            <IconPlus size={12} /> Add
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
