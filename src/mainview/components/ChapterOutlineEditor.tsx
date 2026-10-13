import { useState } from 'react';
import type {
    Chapter,
    ChapterStatus,
    Character,
    PlotThread,
    ChapterPlotThread,
    ChapterOutlineData,
    StoryAct,
    StoryScene,
    StorySequence,
} from '../types/index';
import { IconPlus, IconTrash, IconArrowRight } from '@tabler/icons-react';
import { useCollapseState } from '../hooks/useCollapseState';
import ChapterStructureEditor from './ChapterStructureEditor';
import type { StructureItem } from './ChapterStructureEditor';

interface Props {
    projectId: string;
    chapter: Chapter;
    characters: Character[];
    plotThreads: PlotThread[];
    chapterPlotThreads: ChapterPlotThread[];
    acts: StoryAct[];
    scenes: StoryScene[];
    sequences: StorySequence[];
    onUpdate: (field: string, value: unknown) => void;
    onMoveToDraft: () => void;
    onSceneCreate: (sequenceId: string | null) => void;
    onSceneDelete: (id: string) => void;
    onSceneUpdate: (id: string, field: string, value: unknown) => void;
    onSceneReorder: (
        targetContainer: string | null,
        orderedIds: string[],
        movedSceneId?: string,
        sourceContainer?: string | null
    ) => void;
    onSequenceCreate: () => void;
    onSequenceDelete: (id: string) => void;
    onSequenceUpdate: (id: string, field: string, value: unknown) => void;
    onStructureReorder?: (unifiedItems: StructureItem[]) => void;
}

export default function ChapterOutlineEditor({
    projectId,
    chapter,
    characters,
    plotThreads,
    chapterPlotThreads,
    acts,
    scenes,
    sequences,
    onUpdate,
    onMoveToDraft,
    onSceneCreate,
    onSceneDelete,
    onSceneUpdate,
    onSceneReorder,
    onSequenceCreate,
    onSequenceDelete,
    onSequenceUpdate,
    onStructureReorder,
}: Props) {
    const { collapsed, toggle } = useCollapseState(projectId);
    const [outlineData, setOutlineData] = useState<ChapterOutlineData>(() => {
        try {
            const parsed = chapter.outline ? JSON.parse(chapter.outline) : {};
            return {
                summary: parsed.summary || '',
                scenes: [],
                keyEvents: parsed.keyEvents || [],
                notes: parsed.notes || '',
            };
        } catch {
            return { summary: '', scenes: [], keyEvents: [], notes: '' };
        }
    });

    function updateOutline(field: keyof ChapterOutlineData, value: unknown) {
        const newData = { ...outlineData, [field]: value };
        setOutlineData(newData);
        onUpdate('outline', JSON.stringify(newData));
    }

    function addKeyEvent() {
        updateOutline('keyEvents', [...outlineData.keyEvents, '']);
    }

    function updateKeyEvent(index: number, value: string) {
        const events = [...outlineData.keyEvents];
        events[index] = value;
        updateOutline('keyEvents', events);
    }

    function removeKeyEvent(index: number) {
        updateOutline(
            'keyEvents',
            outlineData.keyEvents.filter((_, i) => i !== index)
        );
    }

    const statusOptions: ChapterStatus[] = [
        'outline',
        'draft',
        'revision',
        'done',
    ];
    const activeThreadIds = new Set(
        chapterPlotThreads.map((t) => t.plotThreadId)
    );

    return (
        <div className="chapter-outline-editor">
            <div className="outline-toolbar">
                <div className="outline-status-group">
                    <label>Status</label>
                    <div className="status-selector">
                        {statusOptions.map((s) => (
                            <button
                                key={s}
                                className={`status-btn status-${s} ${chapter.status === s ? 'active' : ''}`}
                                onClick={() => onUpdate('status', s)}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {chapter.status === 'outline' && (
                    <button
                        className="move-to-draft-btn"
                        onClick={onMoveToDraft}
                    >
                        <IconArrowRight size={14} /> Move to Draft
                    </button>
                )}
            </div>

            <div className="outline-meta-grid">
                <div className="outline-field">
                    <label>Point of View</label>
                    <select
                        value={chapter.povCharacterId || ''}
                        onChange={(e) =>
                            onUpdate('povCharacterId', e.target.value || null)
                        }
                    >
                        <option value="">-- Select POV --</option>
                        {characters.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="outline-field">
                    <label>Word Count Target</label>
                    <input
                        type="number"
                        value={chapter.wordCountTarget || ''}
                        onChange={(e) =>
                            onUpdate(
                                'wordCountTarget',
                                e.target.value ? parseInt(e.target.value) : null
                            )
                        }
                        placeholder="e.g. 3000"
                    />
                </div>

                <div className="outline-field">
                    <label>Act</label>
                    <select
                        value={chapter.actId || ''}
                        onChange={(e) =>
                            onUpdate('actId', e.target.value || null)
                        }
                    >
                        <option value="">-- None --</option>
                        {acts.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.title}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="outline-section">
                <label>Chapter Summary</label>
                <textarea
                    value={outlineData.summary}
                    onChange={(e) => updateOutline('summary', e.target.value)}
                    placeholder="Brief summary of what happens in this chapter..."
                    rows={3}
                />
            </div>

            <ChapterStructureEditor
                projectId={projectId}
                characters={characters}
                scenes={scenes}
                sequences={sequences}
                collapsed={collapsed}
                toggle={toggle}
                onSceneCreate={onSceneCreate}
                onSceneDelete={onSceneDelete}
                onSceneUpdate={onSceneUpdate}
                onSceneReorder={onSceneReorder}
                onSequenceCreate={onSequenceCreate}
                onSequenceDelete={onSequenceDelete}
                onSequenceUpdate={onSequenceUpdate}
                onStructureReorder={onStructureReorder}
            />

            <div className="outline-section">
                <div className="section-header">
                    <label>Key Events / Plot Points</label>
                    <button className="icon-btn" onClick={addKeyEvent}>
                        <IconPlus size={14} />
                    </button>
                </div>
                {outlineData.keyEvents.map((event, idx) => (
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
            </div>

            <div className="outline-section">
                <label>Plot Threads in this Chapter</label>
                <div className="plot-thread-tags">
                    {plotThreads.map((pt) => (
                        <button
                            key={pt.id}
                            className={`thread-tag ${activeThreadIds.has(pt.id) ? 'active' : ''}`}
                            style={{ borderLeftColor: pt.color }}
                            onClick={() => {
                                const existing = chapterPlotThreads.find(
                                    (t) => t.plotThreadId === pt.id
                                );
                                const newThreads = existing
                                    ? chapterPlotThreads.filter(
                                          (t) => t.plotThreadId !== pt.id
                                      )
                                    : [
                                          ...chapterPlotThreads,
                                          {
                                              chapterId: chapter.id,
                                              plotThreadId: pt.id,
                                              intensity: 5,
                                          },
                                      ];
                                onUpdate('plotThreads', newThreads);
                            }}
                        >
                            {pt.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="outline-section">
                <label>Notes</label>
                <textarea
                    value={outlineData.notes}
                    onChange={(e) => updateOutline('notes', e.target.value)}
                    placeholder="Additional notes, reminders, research links..."
                    rows={3}
                />
            </div>
        </div>
    );
}
