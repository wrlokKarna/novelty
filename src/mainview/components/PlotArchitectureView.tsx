import {
    useState,
    useEffect,
    useCallback,
    type PointerEvent as ReactPointerEvent,
} from 'react';
import { useRPC } from '../contexts/RPCContext';
import { useCollapseState } from '../hooks/useCollapseState';
import type {
    StoryAct,
    StorySequence,
    StoryScene,
    PlotThread,
    Chapter,
    StoryBeat,
    Character,
} from '../types/index';
import {
    IconPlus,
    IconTrash,
    IconGripVertical,
    IconChevronDown,
    IconChevronRight,
    IconRefresh,
} from '@tabler/icons-react';
import SceneCardEditor from './SceneCardEditor';

interface Props {
    projectId: string;
    chapters: Chapter[];
    characters: Character[];
    onNavigateChapter: (chapterId: string) => void;
    onDataChange?: () => void;
}

const THREAD_COLORS = [
    '#ef4444',
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
];
const BEAT_TYPES = [
    'opening-image',
    'theme-stated',
    'setup',
    'catalyst',
    'debate',
    'break-into-two',
    'b-story',
    'fun-and-games',
    'midpoint',
    'bad-guys-close-in',
    'all-is-lost',
    'dark-night-of-soul',
    'break-into-three',
    'climax',
    'falling-action',
    'finale',
    'final-image',
    'custom',
] as const;

type DragItemType = 'act' | 'chapter' | 'sequence' | 'scene';
type DropTargetType =
    | DragItemType
    | 'unassigned-sequence'
    | 'unassigned-scene'
    | 'unassigned-chapter';
type DropPos = 'before' | 'after' | 'inside';
type DropTarget = {
    type: DropTargetType;
    id: string | null;
    pos: DropPos;
    zone: string;
};

export default function PlotArchitectureView({
    projectId,
    chapters,
    characters,
    onNavigateChapter,
    onDataChange,
}: Props) {
    const rpc = useRPC();

    const [acts, setActs] = useState<StoryAct[]>([]);
    const [sequences, setSequences] = useState<StorySequence[]>([]);
    const [scenes, setScenes] = useState<StoryScene[]>([]);
    const [plotThreads, setPlotThreads] = useState<PlotThread[]>([]);
    const [storyBeats, setStoryBeats] = useState<StoryBeat[]>([]);
    const { collapsed, toggle, isCollapsed } = useCollapseState(projectId);
    const [activeTab, setActiveTab] = useState<'acts' | 'threads' | 'beats'>(
        'acts'
    );
    const [dragItem, setDragItem] = useState<{
        type: DragItemType;
        id: string;
    } | null>(null);
    const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
    const [actHeights, setActHeights] = useState<Record<string, number>>({});
    const [resizingActId, setResizingActId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        const [a, s, sc, t, b] = await Promise.all([
            rpc.request['db:get-story-acts'](projectId),
            rpc.request['db:get-story-sequences'](projectId),
            rpc.request['db:get-story-scenes'](projectId),
            rpc.request['db:get-plot-threads'](projectId),
            rpc.request['db:get-story-beats'](projectId),
        ]);
        setActs(a || []);
        setSequences(s || []);
        setScenes(sc || []);
        setPlotThreads(t || []);
        setStoryBeats(b || []);
    }, [projectId, rpc]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const sortedActs = [...acts].sort((a, b) => a.orderIndex - b.orderIndex);
    const sortedChapters = [...chapters].sort(
        (a, b) => a.orderIndex - b.orderIndex
    );
    const sortedSequences = [...sequences].sort(
        (a, b) => a.orderIndex - b.orderIndex
    );
    const sortedScenes = [...scenes].sort(
        (a, b) => a.orderIndex - b.orderIndex
    );

    const chaptersOfAct = (actId: string | null) =>
        sortedChapters.filter((c) => c.actId === actId);
    const sequencesOfChapter = (chapterId: string | null) =>
        sortedSequences.filter((s) => s.chapterId === chapterId);
    const scenesOfSequence = (sequenceId: string | null) =>
        sortedScenes.filter((s) => s.sequenceId === sequenceId);
    const scenesOfChapter = (chapterId: string) =>
        sortedScenes.filter((s) => s.chapterId === chapterId && !s.sequenceId);
    const scenesUnassigned = sortedScenes.filter(
        (s) => !s.sequenceId && !s.chapterId
    );

    function sceneContainerKey(s: StoryScene): string {
        if (s.sequenceId) return `seq:${s.sequenceId}`;
        if (s.chapterId) return `ch:${s.chapterId}`;
        return 'unassigned';
    }

    async function handleAddAct() {
        await rpc.request['db:create-story-act']({
            id: crypto.randomUUID(),
            projectId,
            title: `Act ${acts.length + 1}`,
            summary: null,
            orderIndex: acts.length,
            actNumber: acts.length + 1,
            status: 'outline',
        });
        await loadData();
        onDataChange?.();
    }

    async function handleAddChapter(actId: string) {
        const list = chaptersOfAct(actId);
        await rpc.request['db:create-chapter']({
            id: crypto.randomUUID(),
            projectId,
            title: `Chapter ${list.length + 1}`,
            content: null,
            filePath: null,
            orderIndex: list.length,
            status: 'outline',
            outline: null,
            povCharacterId: null,
            wordCountTarget: null,
            actId,
            sequenceId: null,
        });
        await loadData();
        onDataChange?.();
    }

    async function handleAddSequence(chapterId: string) {
        const chapter = chapters.find((c) => c.id === chapterId);
        const list = sequencesOfChapter(chapterId);
        const chapterScenesList = scenesOfChapter(chapterId);
        const maxDisplayOrder = Math.max(
            0,
            ...list.map((s) => s.displayOrder),
            ...chapterScenesList.map((s) => s.displayOrder)
        );
        await rpc.request['db:create-story-sequence']({
            id: crypto.randomUUID(),
            actId: chapter?.actId ?? null,
            chapterId,
            projectId,
            title: `Sequence ${list.length + 1}`,
            summary: null,
            orderIndex: list.length,
            displayOrder: maxDisplayOrder + 1,
            status: 'outline',
        });
        await loadData();
        onDataChange?.();
    }

    async function handleAddScene(container: {
        sequenceId?: string;
        chapterId?: string;
    }) {
        const seq = container.sequenceId
            ? sequences.find((s) => s.id === container.sequenceId)
            : undefined;
        const chapter = container.chapterId
            ? chapters.find((c) => c.id === container.chapterId)
            : undefined;
        const list = container.sequenceId
            ? scenesOfSequence(container.sequenceId)
            : container.chapterId
              ? scenesOfChapter(container.chapterId)
              : [];
        const chapterSeqs = container.chapterId
            ? sequencesOfChapter(container.chapterId)
            : [];
        const maxDisplayOrder = Math.max(
            0,
            ...list.map((s) => s.displayOrder),
            ...chapterSeqs.map((s) => s.displayOrder)
        );
        await rpc.request['db:create-story-scene']({
            id: crypto.randomUUID(),
            projectId,
            actId: seq?.actId ?? chapter?.actId ?? null,
            sequenceId: container.sequenceId ?? null,
            chapterId: seq?.chapterId ?? container.chapterId ?? null,
            title: '',
            summary: null,
            setting: null,
            charactersPresent: null,
            keyEvents: null,
            duration: null,
            conflict: null,
            status: 'outline',
            orderIndex: list.length,
            displayOrder: container.sequenceId ? 0 : maxDisplayOrder + 1,
        });
        await loadData();
        onDataChange?.();
    }

    async function handleAddPlotThread() {
        await rpc.request['db:create-plot-thread']({
            id: crypto.randomUUID(),
            projectId,
            name: 'New Plot Thread',
            description: null,
            threadType: 'subplot',
            color: THREAD_COLORS[plotThreads.length % THREAD_COLORS.length],
        });
        await loadData();
    }

    async function handleAddStoryBeat() {
        await rpc.request['db:create-story-beat']({
            id: crypto.randomUUID(),
            projectId,
            chapterId: null,
            beatType: 'custom',
            title: 'New Beat',
            description: null,
            orderIndex: storyBeats.length,
        });
        await loadData();
    }

    async function handleDeleteAct(id: string) {
        await rpc.request['db:delete-story-act'](id);
        await loadData();
        onDataChange?.();
    }

    async function handleDeleteChapter(id: string) {
        await rpc.request['db:delete-chapter'](id);
        await loadData();
        onDataChange?.();
    }

    async function handleDeleteSequence(id: string) {
        await rpc.request['db:delete-story-sequence'](id);
        await loadData();
        onDataChange?.();
    }

    async function handleDeleteScene(id: string) {
        await rpc.request['db:delete-story-scene'](id);
        await loadData();
        onDataChange?.();
    }

    async function handleDeleteThread(id: string) {
        await rpc.request['db:delete-plot-thread'](id);
        await loadData();
    }

    async function handleDeleteBeat(id: string) {
        await rpc.request['db:delete-story-beat'](id);
        await loadData();
    }

    async function handleUpdateAct(
        id: string,
        field: string,
        value: string | number
    ) {
        await rpc.request['db:update-story-act']({
            id,
            data: { [field]: value } as any,
        });
        await loadData();
        onDataChange?.();
    }

    async function handleUpdateSequence(
        id: string,
        field: string,
        value: string | number
    ) {
        await rpc.request['db:update-story-sequence']({
            id,
            data: { [field]: value } as any,
        });
        await loadData();
        onDataChange?.();
    }

    async function handleUpdateScene(
        id: string,
        field: string,
        value: unknown
    ) {
        setScenes((prev) =>
            prev.map((s) =>
                s.id === id ? ({ ...s, [field]: value } as StoryScene) : s
            )
        );
        await rpc.request['db:update-story-scene']({
            id,
            data: { [field]: value } as any,
        });
        onDataChange?.();
    }

    async function handleMoveSequence(id: string, chapterId: string | null) {
        const chapter = chapterId
            ? chapters.find((c) => c.id === chapterId)
            : undefined;
        await rpc.request['db:update-story-sequence']({
            id,
            data: { chapterId, actId: chapter?.actId ?? null },
        });
        await loadData();
        onDataChange?.();
    }

    async function handleMoveScene(
        id: string,
        data: {
            sequenceId?: string | null;
            chapterId?: string | null;
            actId?: string | null;
            orderIndex?: number;
        }
    ) {
        await rpc.request['db:move-scene']({ id, data });
        await loadData();
        onDataChange?.();
    }

    async function handleUpdateThread(
        id: string,
        field: string,
        value: string
    ) {
        await rpc.request['db:update-plot-thread']({
            id,
            data: { [field]: value } as any,
        });
        await loadData();
    }

    async function handleUpdateBeat(id: string, field: string, value: string) {
        await rpc.request['db:update-story-beat']({
            id,
            data: { [field]: value } as any,
        });
        await loadData();
    }

    function toggleAct(id: string) {
        toggle('acts', id);
    }

    function toggleChapter(id: string) {
        toggle('chapters', id);
    }

    function toggleSequence(id: string) {
        toggle('sequences', id);
    }

    function startActResize(
        e: ReactPointerEvent<HTMLDivElement>,
        actId: string
    ) {
        e.preventDefault();
        const bodyEl = e.currentTarget.closest(
            '.act-body'
        ) as HTMLElement | null;
        if (!bodyEl) return;
        const startY = e.clientY;
        const startHeight = bodyEl.getBoundingClientRect().height;
        const naturalHeight = bodyEl.scrollHeight;
        const minHeight = Math.max(naturalHeight, 48);
        const maxHeight = Math.max(minHeight, window.innerHeight - 100);
        setResizingActId(actId);

        const onMove = (ev: PointerEvent) => {
            const next = Math.min(
                maxHeight,
                Math.max(minHeight, startHeight + (ev.clientY - startY))
            );
            setActHeights((prev) => ({ ...prev, [actId]: next }));
        };
        const onUp = () => {
            setResizingActId(null);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    }

    async function persistSceneOrder(ids: string[]) {
        await rpc.request['db:reorder-scenes'](
            ids.map((id, i) => ({ id, orderIndex: i }))
        );
    }

    async function persistSequenceOrder(ids: string[]) {
        await rpc.request['db:reorder-sequences'](
            ids.map((id, i) => ({ id, orderIndex: i }))
        );
    }

    async function persistActOrder(ids: string[]) {
        await rpc.request['db:reorder-acts'](
            ids.map((id, i) => ({ id, orderIndex: i }))
        );
    }

    async function persistChapterOrder(ids: string[]) {
        for (let i = 0; i < ids.length; i++) {
            await rpc.request['db:update-chapter']({
                id: ids[i],
                data: { orderIndex: i },
            });
        }
    }

    function insertItem<T extends { id: string }>(
        list: T[],
        item: T,
        targetId: string | null,
        pos: DropPos
    ): T[] {
        const arr = list.filter((x) => x.id !== item.id);
        if (targetId === null) {
            arr.push(item);
            return arr;
        }
        const idx = arr.findIndex((x) => x.id === targetId);
        if (idx < 0) {
            arr.push(item);
            return arr;
        }
        arr.splice(pos === 'after' ? idx + 1 : idx, 0, item);
        return arr;
    }

    function canDrop(
        drag: DragItemType,
        target: DropTargetType,
        pos: DropPos
    ): boolean {
        const allowed =
            (drag === 'act' && target === 'act') ||
            (drag === 'chapter' &&
                (target === 'chapter' ||
                    target === 'act' ||
                    target === 'unassigned-chapter')) ||
            (drag === 'sequence' &&
                (target === 'sequence' ||
                    target === 'chapter' ||
                    target === 'unassigned-sequence')) ||
            (drag === 'scene' &&
                (target === 'scene' ||
                    target === 'sequence' ||
                    target === 'chapter' ||
                    target === 'unassigned-scene'));
        if (!allowed) return false;
        if (drag === 'act' && pos === 'inside') return false;
        if (pos !== 'inside' && drag !== target) return false;
        if (drag === 'scene' && target === 'sequence' && pos !== 'inside')
            return false;
        if (drag === 'sequence' && target === 'chapter' && pos !== 'inside')
            return false;
        if (drag === 'chapter' && target === 'act' && pos !== 'inside')
            return false;
        return true;
    }

    async function handleDrop(
        drag: { type: DragItemType; id: string },
        target: DropTarget
    ) {
        const { type: ttype, id: tid, pos } = target;
        if (!canDrop(drag.type, ttype, pos)) return;

        if (drag.type === 'act' && ttype === 'act') {
            const item = acts.find((a) => a.id === drag.id);
            if (!item) return;
            const ordered = insertItem(sortedActs, item, tid, pos);
            await persistActOrder(ordered.map((a) => a.id));
        } else if (drag.type === 'chapter') {
            const item = chapters.find((c) => c.id === drag.id);
            if (!item) return;
            let newActId: string | null;
            let targetList: Chapter[];
            if (ttype === 'act') {
                newActId = tid;
                targetList = chaptersOfAct(tid);
            } else if (ttype === 'unassigned-chapter') {
                newActId = null;
                targetList = sortedChapters.filter((c) => !c.actId);
            } else if (ttype === 'chapter') {
                const targetChapter = chapters.find((c) => c.id === tid);
                if (!targetChapter) return;
                newActId = targetChapter.actId;
                targetList = chaptersOfAct(newActId);
            } else return;
            const ordered = insertItem(targetList, item, tid, pos);
            await rpc.request['db:update-chapter']({
                id: item.id,
                data: {
                    actId: newActId,
                    orderIndex: ordered.findIndex((c) => c.id === item.id),
                },
            });
            if (newActId !== item.actId) {
                await persistChapterOrder(
                    chaptersOfAct(item.actId)
                        .filter((c) => c.id !== item.id)
                        .map((c) => c.id)
                );
            }
            await persistChapterOrder(ordered.map((c) => c.id));
        } else if (drag.type === 'sequence') {
            const item = sequences.find((s) => s.id === drag.id);
            if (!item) return;
            let newChapterId: string | null;
            let newActId: string | null = item.actId;
            let targetList: StorySequence[];
            if (ttype === 'chapter') {
                const chapter = chapters.find((c) => c.id === tid);
                if (!chapter) return;
                newChapterId = tid;
                newActId = chapter.actId;
                targetList = sequencesOfChapter(tid);
            } else if (ttype === 'unassigned-sequence') {
                newChapterId = null;
                targetList = sortedSequences.filter((s) => !s.chapterId);
            } else if (ttype === 'sequence') {
                const targetSeq = sequences.find((s) => s.id === tid);
                if (!targetSeq) return;
                newChapterId = targetSeq.chapterId;
                const chapter = newChapterId
                    ? chapters.find((c) => c.id === newChapterId)
                    : undefined;
                newActId = chapter?.actId ?? null;
                targetList = sequencesOfChapter(newChapterId);
            } else return;
            const ordered = insertItem(targetList, item, tid, pos);
            await rpc.request['db:update-story-sequence']({
                id: item.id,
                data: {
                    chapterId: newChapterId,
                    actId: newActId,
                    orderIndex: ordered.findIndex((s) => s.id === item.id),
                },
            });
            if (newChapterId !== item.chapterId) {
                await persistSequenceOrder(
                    sequencesOfChapter(item.chapterId)
                        .filter((s) => s.id !== item.id)
                        .map((s) => s.id)
                );
            }
            await persistSequenceOrder(ordered.map((s) => s.id));
        } else if (drag.type === 'scene') {
            const item = scenes.find((s) => s.id === drag.id);
            if (!item) return;
            let seqId: string | null;
            let chId: string | null;
            let actId: string | null;
            let targetList: StoryScene[];
            if (ttype === 'sequence') {
                const seq = sequences.find((s) => s.id === tid);
                if (!seq) return;
                seqId = tid;
                chId = seq.chapterId;
                actId =
                    seq.actId ??
                    (chId
                        ? (chapters.find((c) => c.id === chId)?.actId ?? null)
                        : null);
                targetList = scenesOfSequence(tid);
            } else if (ttype === 'chapter') {
                const chapter = chapters.find((c) => c.id === tid);
                if (!chapter || !tid) return;
                seqId = null;
                chId = tid;
                actId = chapter.actId;
                targetList = scenesOfChapter(tid);
            } else if (ttype === 'scene') {
                const targetScene = scenes.find((s) => s.id === tid);
                if (!targetScene) return;
                if (targetScene.sequenceId) {
                    seqId = targetScene.sequenceId;
                    chId = targetScene.chapterId;
                    actId = targetScene.actId;
                    targetList = scenesOfSequence(seqId);
                } else {
                    seqId = null;
                    chId = targetScene.chapterId;
                    actId = targetScene.actId;
                    targetList = targetScene.chapterId
                        ? scenesOfChapter(targetScene.chapterId)
                        : sortedScenes.filter(
                              (s) => !s.sequenceId && !s.chapterId
                          );
                }
            } else if (ttype === 'unassigned-scene') {
                seqId = null;
                chId = null;
                actId = null;
                targetList = scenesUnassigned;
            } else return;
            const ordered = insertItem(targetList, item, tid, pos);
            await rpc.request['db:move-scene']({
                id: item.id,
                data: {
                    sequenceId: seqId,
                    chapterId: chId,
                    actId,
                    orderIndex: ordered.findIndex((s) => s.id === item.id),
                },
            });
            const newContainerKey = seqId
                ? `seq:${seqId}`
                : chId
                  ? `ch:${chId}`
                  : 'unassigned';
            if (sceneContainerKey(item) !== newContainerKey) {
                await persistSceneOrder(
                    sortedScenes
                        .filter(
                            (s) =>
                                sceneContainerKey(s) ===
                                    sceneContainerKey(item) && s.id !== item.id
                        )
                        .map((s) => s.id)
                );
            }
            await persistSceneOrder(ordered.map((s) => s.id));
        }
    }

    function startDrag(e: React.DragEvent, type: DragItemType, id: string) {
        e.dataTransfer.setData('text/plain', `${type}:${id}`);
        e.dataTransfer.effectAllowed = 'move';
        setDragItem({ type, id });
    }

    function clearDrag() {
        setDragItem(null);
        setDropTarget(null);
    }

    function cardDropClass(type: DragItemType, id: string): string {
        if (
            dropTarget &&
            dropTarget.type === type &&
            dropTarget.id === id &&
            dropTarget.zone === 'card'
        ) {
            return dropTarget.pos === 'before'
                ? 'drop-before'
                : dropTarget.pos === 'after'
                  ? 'drop-after'
                  : '';
        }
        return '';
    }

    function insideDropClass(
        type: DropTargetType,
        id: string | null,
        zone: string
    ): string {
        return dropTarget &&
            dropTarget.type === type &&
            dropTarget.id === id &&
            dropTarget.pos === 'inside' &&
            dropTarget.zone === zone
            ? 'drop-inside'
            : '';
    }

    function dragOverCard(e: React.DragEvent, type: DragItemType, id: string) {
        if (dragItem && dragItem.type !== type) return;
        e.stopPropagation();
        if (!dragItem) return;
        if (dragItem.type === type && dragItem.id === id) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pos: DropPos =
            e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
        if (!canDrop(dragItem.type, type, pos)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDropTarget({ type, id, pos, zone: 'card' });
    }

    function canDropInside(
        dragType: DragItemType,
        type: DropTargetType
    ): boolean {
        if (type === 'act') return dragType === 'chapter';
        if (type === 'chapter')
            return dragType === 'sequence' || dragType === 'scene';
        if (type === 'sequence') return dragType === 'scene';
        if (type === 'unassigned-chapter') return dragType === 'chapter';
        if (type === 'unassigned-sequence') return dragType === 'sequence';
        if (type === 'unassigned-scene') return dragType === 'scene';
        return false;
    }

    function dragOverInside(
        e: React.DragEvent,
        type: DropTargetType,
        id: string | null,
        zone: string
    ) {
        if (dragItem && !canDropInside(dragItem.type, type)) return;
        e.stopPropagation();
        if (!dragItem) return;
        if (!canDrop(dragItem.type, type, 'inside')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDropTarget({ type, id, pos: 'inside', zone });
    }

    function dragLeaveTarget(e: React.DragEvent) {
        const rel = e.relatedTarget as Node | null;
        if (!e.currentTarget.contains(rel)) setDropTarget(null);
    }

    async function dropCard(
        e: React.DragEvent,
        type: DragItemType,
        id: string
    ) {
        if (dragItem && dragItem.type !== type) return;
        e.stopPropagation();
        e.preventDefault();
        const drag = dragItem;
        setDropTarget(null);
        if (!drag) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pos: DropPos =
            e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
        if (!canDrop(drag.type, type, pos)) return;
        await handleDrop(drag, { type, id, pos, zone: 'card' });
        await loadData();
        onDataChange?.();
        setDragItem(null);
    }

    async function dropInside(
        e: React.DragEvent,
        type: DropTargetType,
        id: string | null,
        zone: string
    ) {
        if (dragItem && !canDropInside(dragItem.type, type)) return;
        e.stopPropagation();
        e.preventDefault();
        const drag = dragItem;
        setDropTarget(null);
        if (!drag) return;
        if (!canDrop(drag.type, type, 'inside')) return;
        await handleDrop(drag, { type, id, pos: 'inside', zone });
        await loadData();
        onDataChange?.();
        setDragItem(null);
    }

    const renderScene = (scene: StoryScene, index: number) => (
        <div
            key={scene.id}
            className={`scene-content-wrap ${cardDropClass('scene', scene.id)}`}
            onDragOver={(e) => dragOverCard(e, 'scene', scene.id)}
            onDrop={(e) => dropCard(e, 'scene', scene.id)}
            onDragLeave={dragLeaveTarget}
        >
            <SceneCardEditor
                scene={scene}
                index={index}
                characters={characters}
                collapsed={isCollapsed('scenes', scene.id)}
                onToggleCollapsed={() => toggle('scenes', scene.id)}
                onChange={handleUpdateScene}
                onRemove={handleDeleteScene}
                dragHandle={
                    <span
                        className="drag-handle"
                        draggable
                        onDragStart={(e) => startDrag(e, 'scene', scene.id)}
                        onDragEnd={clearDrag}
                    >
                        <IconGripVertical size={12} />
                    </span>
                }
                extraActions={
                    <select
                        className="scene-chapter-select"
                        value={scene.chapterId || ''}
                        onChange={(e) =>
                            handleMoveScene(scene.id, {
                                chapterId: e.target.value || null,
                            })
                        }
                        title="Attach scene to a chapter"
                    >
                        <option value="">No chapter</option>
                        {chapters.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.title}
                            </option>
                        ))}
                    </select>
                }
            />
        </div>
    );

    const renderSequenceCard = (seq: StorySequence) => (
        <div
            key={seq.id}
            className={`sequence-card ${cardDropClass('sequence', seq.id)}`}
            onDragOver={(e) => dragOverCard(e, 'sequence', seq.id)}
            onDrop={(e) => dropCard(e, 'sequence', seq.id)}
            onDragLeave={dragLeaveTarget}
        >
            <div className="sequence-header">
                <span
                    className="drag-handle"
                    draggable
                    onDragStart={(e) => startDrag(e, 'sequence', seq.id)}
                    onDragEnd={clearDrag}
                >
                    <IconGripVertical size={16} />
                </span>
                <button
                    className="collapse-btn"
                    onClick={() => toggleSequence(seq.id)}
                    title={
                        collapsed.sequences.includes(seq.id)
                            ? 'Expand'
                            : 'Collapse'
                    }
                >
                    {collapsed.sequences.includes(seq.id) ? (
                        <IconChevronRight size={16} />
                    ) : (
                        <IconChevronDown size={16} />
                    )}
                </button>
                <input
                    className="sequence-title-input"
                    value={seq.title}
                    onChange={(e) =>
                        handleUpdateSequence(seq.id, 'title', e.target.value)
                    }
                />
                <select
                    className="seq-chapter-select"
                    value={seq.chapterId || ''}
                    onChange={(e) =>
                        handleMoveSequence(seq.id, e.target.value || null)
                    }
                    title="Assign sequence to a chapter"
                >
                    <option value="">Unassigned</option>
                    {chapters.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.title}
                        </option>
                    ))}
                </select>
                <span className="act-badge">{seq.status}</span>
                <button
                    className="icon-btn icon-btn-sm"
                    onClick={() => handleDeleteSequence(seq.id)}
                >
                    <IconTrash size={12} />
                </button>
            </div>
            {!collapsed.sequences.includes(seq.id) && (
                <>
                    <textarea
                        className="sequence-summary-input"
                        placeholder="Sequence summary..."
                        value={seq.summary || ''}
                        onChange={(e) =>
                            handleUpdateSequence(
                                seq.id,
                                'summary',
                                e.target.value
                            )
                        }
                        rows={1}
                    />
                    <div
                        className="sequence-scenes"
                        onDragOver={(e) =>
                            dragOverInside(e, 'sequence', seq.id, 'scenes')
                        }
                        onDrop={(e) =>
                            dropInside(e, 'sequence', seq.id, 'scenes')
                        }
                    >
                        {scenesOfSequence(seq.id).map((scene, idx) =>
                            renderScene(scene, idx)
                        )}
                        <button
                            className="add-scene-btn"
                            onClick={() =>
                                handleAddScene({ sequenceId: seq.id })
                            }
                        >
                            <IconPlus size={12} /> Add Scene
                        </button>
                    </div>
                </>
            )}
        </div>
    );

    const renderChapter = (ch: Chapter) => (
        <div
            key={ch.id}
            className={`chapter-node ${cardDropClass('chapter', ch.id)}`}
            onDragOver={(e) => dragOverCard(e, 'chapter', ch.id)}
            onDrop={(e) => dropCard(e, 'chapter', ch.id)}
            onDragLeave={dragLeaveTarget}
        >
            <div className="chapter-header">
                <span
                    className="drag-handle"
                    draggable
                    onDragStart={(e) => startDrag(e, 'chapter', ch.id)}
                    onDragEnd={clearDrag}
                >
                    <IconGripVertical size={16} />
                </span>
                <button
                    className="collapse-btn"
                    onClick={() => toggleChapter(ch.id)}
                    title={
                        collapsed.chapters.includes(ch.id)
                            ? 'Expand'
                            : 'Collapse'
                    }
                >
                    {collapsed.chapters.includes(ch.id) ? (
                        <IconChevronRight size={16} />
                    ) : (
                        <IconChevronDown size={16} />
                    )}
                </button>
                <span
                    className="chapter-title"
                    onClick={() => onNavigateChapter(ch.id)}
                    title="Open chapter"
                >
                    {ch.title}
                </span>
                <span className={`status-dot status-${ch.status}`} />
                <button
                    className="icon-btn icon-btn-sm"
                    onClick={() => handleDeleteChapter(ch.id)}
                >
                    <IconTrash size={12} />
                </button>
            </div>
            {!collapsed.chapters.includes(ch.id) && (
                <div className="chapter-body">
                    <div
                        className="sequences-list"
                        onDragOver={(e) =>
                            dragOverInside(e, 'chapter', ch.id, 'sequences')
                        }
                        onDrop={(e) =>
                            dropInside(e, 'chapter', ch.id, 'sequences')
                        }
                    >
                        {sequencesOfChapter(ch.id).map((seq) =>
                            renderSequenceCard(seq)
                        )}
                        <button
                            className="add-sequence-btn"
                            onClick={() => handleAddSequence(ch.id)}
                        >
                            <IconPlus size={14} /> Add Sequence
                        </button>
                    </div>
                    <div
                        className="chapter-scenes"
                        onDragOver={(e) =>
                            dragOverInside(e, 'chapter', ch.id, 'scenes')
                        }
                        onDrop={(e) =>
                            dropInside(e, 'chapter', ch.id, 'scenes')
                        }
                    >
                        {scenesOfChapter(ch.id).map((scene, idx) =>
                            renderScene(scene, idx)
                        )}
                        <button
                            className="add-scene-btn"
                            onClick={() => handleAddScene({ chapterId: ch.id })}
                        >
                            <IconPlus size={12} /> Add Scene
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="plot-architecture-view">
            <div className="plot-arch-header">
                <h3>Plot Architecture</h3>
                <div className="plot-arch-tabs">
                    <button
                        className={activeTab === 'acts' ? 'active' : ''}
                        onClick={() => setActiveTab('acts')}
                    >
                        Acts
                    </button>
                    <button
                        className={activeTab === 'threads' ? 'active' : ''}
                        onClick={() => setActiveTab('threads')}
                    >
                        Plot Threads
                    </button>
                    <button
                        className={activeTab === 'beats' ? 'active' : ''}
                        onClick={() => setActiveTab('beats')}
                    >
                        Story Beats
                    </button>
                </div>
                <button className="icon-btn" onClick={loadData} title="Refresh">
                    <IconRefresh size={16} />
                </button>
            </div>

            {activeTab === 'acts' && (
                <div className="acts-list">
                    {sortedActs.length === 0 && (
                        <div className="empty-state">
                            No acts defined. Add one to structure your story.
                        </div>
                    )}
                    {sortedActs.map((act) => {
                        const actChapterCount = chaptersOfAct(act.id).length;
                        return (
                            <div
                                key={act.id}
                                className={`act-card ${cardDropClass('act', act.id)}`}
                                onDragOver={(e) =>
                                    dragOverCard(e, 'act', act.id)
                                }
                                onDrop={(e) => dropCard(e, 'act', act.id)}
                                onDragLeave={dragLeaveTarget}
                            >
                                <div
                                    className="act-header"
                                    onClick={() => toggleAct(act.id)}
                                >
                                    <span
                                        className="drag-handle"
                                        draggable
                                        onDragStart={(e) =>
                                            startDrag(e, 'act', act.id)
                                        }
                                        onDragEnd={clearDrag}
                                    >
                                        <IconGripVertical size={16} />
                                    </span>
                                    {collapsed.acts.includes(act.id) ? (
                                        <IconChevronRight size={16} />
                                    ) : (
                                        <IconChevronDown size={16} />
                                    )}
                                    <input
                                        className="act-title-input"
                                        value={act.title}
                                        onChange={(e) =>
                                            handleUpdateAct(
                                                act.id,
                                                'title',
                                                e.target.value
                                            )
                                        }
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <span className="act-badge">
                                        {act.status}
                                    </span>
                                    <span className="act-chapter-count">
                                        {actChapterCount} chapters
                                    </span>
                                    <button
                                        className="icon-btn icon-btn-sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteAct(act.id);
                                        }}
                                    >
                                        <IconTrash size={14} />
                                    </button>
                                </div>
                                {!collapsed.acts.includes(act.id) && (
                                    <div
                                        className="act-body"
                                        style={
                                            actHeights[act.id]
                                                ? {
                                                      height: `${actHeights[act.id]}px`,
                                                  }
                                                : undefined
                                        }
                                    >
                                        <textarea
                                            className="act-summary-input"
                                            placeholder="Act summary..."
                                            value={act.summary || ''}
                                            onChange={(e) =>
                                                handleUpdateAct(
                                                    act.id,
                                                    'summary',
                                                    e.target.value
                                                )
                                            }
                                            rows={2}
                                        />
                                        <div
                                            className={`chapters-list ${insideDropClass('act', act.id, 'chapters')}`}
                                            onDragOver={(e) =>
                                                dragOverInside(
                                                    e,
                                                    'act',
                                                    act.id,
                                                    'chapters'
                                                )
                                            }
                                            onDrop={(e) =>
                                                dropInside(
                                                    e,
                                                    'act',
                                                    act.id,
                                                    'chapters'
                                                )
                                            }
                                        >
                                            {chaptersOfAct(act.id).map((ch) =>
                                                renderChapter(ch)
                                            )}
                                            <button
                                                className="add-chapter-btn"
                                                onClick={() =>
                                                    handleAddChapter(act.id)
                                                }
                                            >
                                                <IconPlus size={14} /> Add
                                                Chapter
                                            </button>
                                        </div>
                                        <div
                                            className={`act-resize-handle ${resizingActId === act.id ? 'active' : ''}`}
                                            onPointerDown={(e) =>
                                                startActResize(e, act.id)
                                            }
                                            title="Drag to resize"
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <button className="add-act-btn" onClick={handleAddAct}>
                        <IconPlus size={16} /> Add Act
                    </button>

                    {sortedChapters.filter((c) => !c.actId).length > 0 && (
                        <div
                            className={`unassigned-section ${insideDropClass('unassigned-chapter', null, 'unassigned')}`}
                            onDragOver={(e) =>
                                dragOverInside(
                                    e,
                                    'unassigned-chapter',
                                    null,
                                    'unassigned'
                                )
                            }
                            onDrop={(e) =>
                                dropInside(
                                    e,
                                    'unassigned-chapter',
                                    null,
                                    'unassigned'
                                )
                            }
                        >
                            <div className="unassigned-header">
                                Unassigned Chapters
                            </div>
                            {sortedChapters
                                .filter((c) => !c.actId)
                                .map((ch) => renderChapter(ch))}
                        </div>
                    )}

                    {sortedSequences.filter((s) => !s.chapterId).length > 0 && (
                        <div
                            className={`unassigned-section ${insideDropClass('unassigned-sequence', null, 'unassigned')}`}
                            onDragOver={(e) =>
                                dragOverInside(
                                    e,
                                    'unassigned-sequence',
                                    null,
                                    'unassigned'
                                )
                            }
                            onDrop={(e) =>
                                dropInside(
                                    e,
                                    'unassigned-sequence',
                                    null,
                                    'unassigned'
                                )
                            }
                        >
                            <div className="unassigned-header">
                                Unassigned Sequences
                            </div>
                            {sortedSequences
                                .filter((s) => !s.chapterId)
                                .map((seq) => renderSequenceCard(seq))}
                        </div>
                    )}

                    {scenesUnassigned.length > 0 && (
                        <div
                            className={`unassigned-section ${insideDropClass('unassigned-scene', null, 'unassigned')}`}
                            onDragOver={(e) =>
                                dragOverInside(
                                    e,
                                    'unassigned-scene',
                                    null,
                                    'unassigned'
                                )
                            }
                            onDrop={(e) =>
                                dropInside(
                                    e,
                                    'unassigned-scene',
                                    null,
                                    'unassigned'
                                )
                            }
                        >
                            <div className="unassigned-header">
                                Unassigned Scenes
                            </div>
                            {scenesUnassigned.map((scene, idx) =>
                                renderScene(scene, idx)
                            )}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'threads' && (
                <div className="threads-list">
                    {plotThreads.length === 0 && (
                        <div className="empty-state">
                            No plot threads defined. Add threads to track
                            subplots and character arcs.
                        </div>
                    )}
                    {plotThreads.map((thread) => (
                        <div
                            key={thread.id}
                            className="thread-card"
                            style={{ borderLeftColor: thread.color }}
                        >
                            <div className="thread-header">
                                <input
                                    className="thread-name-input"
                                    value={thread.name}
                                    onChange={(e) =>
                                        handleUpdateThread(
                                            thread.id,
                                            'name',
                                            e.target.value
                                        )
                                    }
                                />
                                <select
                                    value={thread.threadType}
                                    onChange={(e) =>
                                        handleUpdateThread(
                                            thread.id,
                                            'threadType',
                                            e.target.value
                                        )
                                    }
                                    className="thread-type-select"
                                >
                                    <option value="main">Main</option>
                                    <option value="subplot">Subplot</option>
                                    <option value="character-arc">
                                        Character Arc
                                    </option>
                                    <option value="mystery">Mystery</option>
                                    <option value="romance">Romance</option>
                                    <option value="thematic">Thematic</option>
                                </select>
                                <input
                                    type="color"
                                    value={thread.color}
                                    onChange={(e) =>
                                        handleUpdateThread(
                                            thread.id,
                                            'color',
                                            e.target.value
                                        )
                                    }
                                    className="thread-color-picker"
                                />
                                <button
                                    className="icon-btn icon-btn-sm"
                                    onClick={() =>
                                        handleDeleteThread(thread.id)
                                    }
                                >
                                    <IconTrash size={14} />
                                </button>
                            </div>
                            <input
                                className="thread-desc-input"
                                placeholder="Description..."
                                value={thread.description || ''}
                                onChange={(e) =>
                                    handleUpdateThread(
                                        thread.id,
                                        'description',
                                        e.target.value
                                    )
                                }
                            />
                            <div className="thread-chapters">
                                Chapters:{' '}
                                {
                                    chapters.filter((c) =>
                                        c.content?.includes(thread.name)
                                    ).length
                                }
                            </div>
                        </div>
                    ))}
                    <button
                        className="add-thread-btn"
                        onClick={handleAddPlotThread}
                    >
                        <IconPlus size={16} /> Add Plot Thread
                    </button>
                </div>
            )}

            {activeTab === 'beats' && (
                <div className="beats-list">
                    {storyBeats.length === 0 && (
                        <div className="empty-state">
                            No story beats defined. Add structural beats like
                            "Inciting Incident" or "Midpoint".
                        </div>
                    )}
                    {storyBeats.map((beat) => (
                        <div key={beat.id} className="beat-card">
                            <div className="beat-header">
                                <select
                                    value={beat.beatType}
                                    onChange={(e) =>
                                        handleUpdateBeat(
                                            beat.id,
                                            'beatType',
                                            e.target.value
                                        )
                                    }
                                    className="beat-type-select"
                                >
                                    {BEAT_TYPES.map((bt) => (
                                        <option key={bt} value={bt}>
                                            {bt.replace(/-/g, ' ')}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    className="beat-title-input"
                                    value={beat.title}
                                    onChange={(e) =>
                                        handleUpdateBeat(
                                            beat.id,
                                            'title',
                                            e.target.value
                                        )
                                    }
                                />
                                <button
                                    className="icon-btn icon-btn-sm"
                                    onClick={() => handleDeleteBeat(beat.id)}
                                >
                                    <IconTrash size={14} />
                                </button>
                            </div>
                            <input
                                className="beat-desc-input"
                                placeholder="Description..."
                                value={beat.description || ''}
                                onChange={(e) =>
                                    handleUpdateBeat(
                                        beat.id,
                                        'description',
                                        e.target.value
                                    )
                                }
                            />
                            <div className="beat-chapter">
                                {beat.chapterId ? (
                                    <span>
                                        Assigned to:{' '}
                                        {chapters.find(
                                            (c) => c.id === beat.chapterId
                                        )?.title || 'Unknown'}
                                    </span>
                                ) : (
                                    <span className="unassigned">
                                        Not assigned to a chapter
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                    <button
                        className="add-beat-btn"
                        onClick={handleAddStoryBeat}
                    >
                        <IconPlus size={16} /> Add Story Beat
                    </button>
                </div>
            )}
        </div>
    );
}
