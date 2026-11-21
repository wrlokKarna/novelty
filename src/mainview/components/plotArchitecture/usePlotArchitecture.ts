import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type PointerEvent as ReactPointerEvent,
} from 'react';
import type { StoryAct, StorySequence } from '../../../shared/types';
import type { Chapter } from '../../../shared/types/project';
import type { Character } from '../../../shared/types/project/compendium';
import type {
    PlotThread,
    StoryBeat,
    StoryScene,
} from '../../../shared/types/project/manuscript';
import { useRPC } from '../../contexts/RPCContext';
import { useCollapseState } from '../../hooks/useCollapseState';
import styles from '../PlotArchitectureView.module.css';
import { THREAD_COLORS } from './constants';
import type {
    DragItemType,
    DropPos,
    DropTarget,
    DropTargetType,
    EntityItem,
    MentionCategory,
    PlotArchitectureDataProps,
} from './types';
import { normalizeEntities, openInLeftSidebar } from './utils';

export function usePlotArchitecture({
    projectId,
    chapters,
    characters,
    locations = [],
    organizations = [],
    items = [],
    lore = [],
    onNavigateChapter,
    onSelectCharacter,
    onSelectLocation,
    onSelectCategory,
    onSelectSidebarChapter,
    onSelectSidebarEntity,
    onDataChange,
}: PlotArchitectureDataProps) {
    const rpc = useRPC();

    const [acts, setActs] = useState<StoryAct[]>([]);
    const [sequences, setSequences] = useState<StorySequence[]>([]);
    const [scenes, setScenes] = useState<StoryScene[]>([]);
    const [plotThreads, setPlotThreads] = useState<PlotThread[]>([]);
    const [storyBeats, setStoryBeats] = useState<StoryBeat[]>([]);

    const [dbCharacters, setDbCharacters] = useState<EntityItem[]>([]);
    const [dbLocations, setDbLocations] = useState<EntityItem[]>([]);
    const [dbOrganizations, setDbOrganizations] = useState<EntityItem[]>([]);
    const [dbItems, setDbItems] = useState<EntityItem[]>([]);
    const [dbLore, setDbLore] = useState<EntityItem[]>([]);

    const [pendingEntities, setPendingEntities] = useState<
        Record<string, MentionCategory>
    >(() => {
        try {
            const saved = localStorage.getItem(
                `novelty:pending-mentions:${projectId}`
            );
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    // ప్రతి మెన్షన్ ఏ కేటగిరీలో క్రియేట్ చేయబడిందో పర్మినెంట్ గా గుర్తుంచుకుంటుంది (`1`, `5`, `lore22` మొదలైనవి)
    const [knownCategoryMap, setKnownCategoryMap] = useState<
        Record<string, MentionCategory>
    >(() => {
        try {
            const saved = localStorage.getItem(
                `novelty:known-mention-categories:${projectId}`
            );
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    const handleRegisterPending = useCallback(
        (name: string, category: MentionCategory) => {
            setPendingEntities((prev) => {
                const next = { ...prev, [name]: category };
                try {
                    localStorage.setItem(
                        `novelty:pending-mentions:${projectId}`,
                        JSON.stringify(next)
                    );
                } catch { }
                return next;
            });
        },
        [projectId]
    );

    const handleRegisterKnownCategory = useCallback(
        (name: string, category: MentionCategory) => {
            setKnownCategoryMap((prev) => {
                const next = { ...prev, [name]: category };
                try {
                    localStorage.setItem(
                        `novelty:known-mention-categories:${projectId}`,
                        JSON.stringify(next)
                    );
                } catch { }
                return next;
            });
        },
        [projectId]
    );

    const handleRemovePending = useCallback((name: string) => {
        setPendingEntities((prev) => {
            const next = { ...prev };
            delete next[name];
            return next;
        });
    }, []);

    const { collapsed, toggle, isCollapsed } = useCollapseState(projectId);
    const [dragItem, setDragItem] = useState<{
        type: DragItemType;
        id: string;
    } | null>(null);
    const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
    const [actHeights, setActHeights] = useState<Record<string, number>>({});
    const [resizingActId, setResizingActId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        const req = rpc.request as Record<string, any>;

        const tryRpc = async (keys: string[]) => {
            for (const key of keys) {
                if (typeof req[key] === 'function') {
                    try {
                        const res = await req[key](projectId);
                        if (Array.isArray(res) && res.length > 0) return res;
                    } catch { }
                }
            }
            return [];
        };

        const [
            a,
            s,
            sc,
            t,
            b,
            fetchedChars,
            fetchedLocs,
            fetchedOrgs,
            fetchedItems,
            fetchedLore,
            allCompendium,
        ] = await Promise.all([
            rpc.request['db:get-story-acts'](projectId),
            rpc.request['db:get-story-sequences'](projectId),
            rpc.request['db:get-story-scenes'](projectId),
            rpc.request['db:get-plot-threads'](projectId),
            rpc.request['db:get-story-beats'](projectId),
            tryRpc([
                'db:get-characters',
                'db:get-compendium-characters',
                'db:get-story-characters',
            ]),
            tryRpc([
                'db:get-locations',
                'db:get-story-locations',
                'db:get-compendium-locations',
                'db:get-world-locations',
            ]),
            tryRpc([
                'db:get-organizations',
                'db:get-factions',
                'db:get-compendium-organizations',
                'db:get-groups',
            ]),
            tryRpc([
                'db:get-items',
                'db:get-compendium-items',
                'db:get-artifacts',
                'db:get-objects',
            ]),
            tryRpc([
                'db:get-lore',
                'db:get-lores',
                'db:get-lore-entries',
                'db:get-world-lore',
                'db:get-compendium-lore',
            ]),
            tryRpc([
                'db:get-compendium-entries',
                'db:get-compendium',
                'db:get-world-entries',
                'db:get-entities',
            ]),
        ]);

        setActs(a || []);
        setSequences(s || []);
        setScenes(sc || []);
        setPlotThreads(t || []);
        setStoryBeats(b || []);

        const filterUnified = (types: string[]) =>
            Array.isArray(allCompendium)
                ? allCompendium.filter((entry: any) =>
                    types.includes(
                        String(
                            entry?.type ||
                            entry?.category ||
                            entry?.entryType ||
                            ''
                        ).toLowerCase()
                    )
                )
                : [];

        setDbCharacters(
            normalizeEntities(
                fetchedChars.length
                    ? fetchedChars
                    : filterUnified(['character', 'characters', 'person']),
                'CHARACTER'
            )
        );
        setDbLocations(
            normalizeEntities(
                fetchedLocs.length
                    ? fetchedLocs
                    : filterUnified(['location', 'locations', 'place']),
                'LOCATION'
            )
        );
        setDbOrganizations(
            normalizeEntities(
                fetchedOrgs.length
                    ? fetchedOrgs
                    : filterUnified([
                        'organization',
                        'organizations',
                        'faction',
                        'group',
                    ]),
                'ORGANIZATION'
            )
        );
        setDbItems(
            normalizeEntities(
                fetchedItems.length
                    ? fetchedItems
                    : filterUnified(['item', 'items', 'artifact', 'object']),
                'ITEM'
            )
        );
        setDbLore(
            normalizeEntities(
                fetchedLore.length
                    ? fetchedLore
                    : filterUnified([
                        'lore',
                        'lores',
                        'myth',
                        'history',
                        'world',
                    ]),
                'LORE'
            )
        );
    }, [projectId, rpc]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const effectiveCharacters: Character[] = [
        ...characters,
        ...dbCharacters
            .filter(
                (dc) =>
                    !characters.some(
                        (c) => c.name.toLowerCase() === dc.name.toLowerCase()
                    )
            )
            .map((dc) => ({ id: dc.id, name: dc.name }) as Character),
    ];
    const effectiveLocations = [
        ...locations,
        ...dbLocations.filter(
            (dl) =>
                !locations.some(
                    (l) => l.name.toLowerCase() === dl.name.toLowerCase()
                )
        ),
    ];
    const effectiveOrganizations = [
        ...organizations,
        ...dbOrganizations.filter(
            (doItem) =>
                !organizations.some(
                    (o) => o.name.toLowerCase() === doItem.name.toLowerCase()
                )
        ),
    ];
    const effectiveItems = [
        ...items,
        ...dbItems.filter(
            (di) =>
                !items.some(
                    (i) => i.name.toLowerCase() === di.name.toLowerCase()
                )
        ),
    ];
    const effectiveLore = [
        ...lore,
        ...dbLore.filter(
            (dlr) =>
                !lore.some(
                    (lr) => lr.name.toLowerCase() === dlr.name.toLowerCase()
                )
        ),
    ];

    const handleCreateAndOpenEntity = useCallback(
        async (entityName: string, category: MentionCategory) => {
            const newId = crypto.randomUUID();
            const req = rpc.request as Record<string, any>;

            handleRegisterKnownCategory(entityName, category);

            const tryCreateRpc = async (
                keys: string[],
                payloads: Record<string, any>[]
            ) => {
                for (const key of keys) {
                    if (typeof req[key] === 'function') {
                        for (const payload of payloads) {
                            try {
                                await req[key](payload);
                                return true;
                            } catch { }
                        }
                    }
                }
                return false;
            };

            if (category === 'Chapter') {
                await rpc.request['db:create-chapter']({
                    id: newId,
                    projectId,
                    title: entityName,
                    content: null,
                    filePath: null,
                    orderIndex: chapters.length,
                    status: 'outline',
                    outline: null,
                    povCharacterId: null,
                    wordCountTarget: null,
                    actId: null,
                    sequenceId: null,
                });
                await loadData();
                onDataChange?.();
                onSelectSidebarChapter?.(newId);
                onNavigateChapter(newId);
                openInLeftSidebar('Chapter', entityName, newId);
                return;
            }

            const basePayloads = [
                {
                    id: newId,
                    projectId,
                    name: entityName,
                    title: entityName,
                    type: category.toLowerCase(),
                    category: category.toLowerCase(),
                    entryType: category.toLowerCase(),
                    description: '',
                    content: '',
                    summary: '',
                },
            ];

            if (category === 'Character') {
                await tryCreateRpc(
                    [
                        'db:create-character',
                        'db:create-compendium-character',
                        'db:create-compendium-entry',
                        'db:create-entity',
                    ],
                    [
                        {
                            id: newId,
                            projectId,
                            name: entityName,
                            role: 'supporting',
                            description: null,
                            backstory: null,
                        },
                        ...basePayloads,
                    ]
                );
                setDbCharacters((prev) => [
                    ...prev,
                    { id: newId, name: entityName, category: 'CHARACTER' },
                ]);
                onSelectCharacter?.(newId);
            } else if (category === 'Location') {
                await tryCreateRpc(
                    [
                        'db:create-location',
                        'db:create-story-location',
                        'db:create-compendium-location',
                        'db:create-world-location',
                        'db:create-compendium-entry',
                        'db:create-entity',
                    ],
                    basePayloads
                );
                setDbLocations((prev) => [
                    ...prev,
                    { id: newId, name: entityName, category: 'LOCATION' },
                ]);
                onSelectLocation?.(entityName);
            } else if (category === 'Organization') {
                await tryCreateRpc(
                    [
                        'db:create-organization',
                        'db:create-faction',
                        'db:create-compendium-organization',
                        'db:create-compendium-entry',
                        'db:create-entity',
                    ],
                    basePayloads
                );
                setDbOrganizations((prev) => [
                    ...prev,
                    { id: newId, name: entityName, category: 'ORGANIZATION' },
                ]);
            } else if (category === 'Item') {
                await tryCreateRpc(
                    [
                        'db:create-item',
                        'db:create-compendium-item',
                        'db:create-artifact',
                        'db:create-compendium-entry',
                        'db:create-entity',
                    ],
                    basePayloads
                );
                setDbItems((prev) => [
                    ...prev,
                    { id: newId, name: entityName, category: 'ITEM' },
                ]);
            } else if (category === 'Lore') {
                await tryCreateRpc(
                    [
                        'db:create-lore',
                        'db:create-lore-entry',
                        'db:create-world-lore',
                        'db:create-compendium-lore',
                        'db:create-compendium-entry',
                        'db:create-entity',
                    ],
                    basePayloads
                );
                setDbLore((prev) => [
                    ...prev,
                    { id: newId, name: entityName, category: 'LORE' },
                ]);
            }

            setPendingEntities((prev) => {
                const next = { ...prev };
                delete next[entityName];
                try {
                    localStorage.setItem(
                        `novelty:pending-mentions:${projectId}`,
                        JSON.stringify(next)
                    );
                } catch { }
                return next;
            });

            await loadData();
            onDataChange?.();
            onSelectCategory?.(category);
            onSelectSidebarEntity?.(entityName, category);

            openInLeftSidebar(category, entityName, newId, true);
        },
        [
            projectId,
            rpc,
            chapters.length,
            loadData,
            onDataChange,
            onNavigateChapter,
            onSelectCharacter,
            onSelectLocation,
            onSelectCategory,
            onSelectSidebarChapter,
            onSelectSidebarEntity,
            handleRegisterKnownCategory,
        ]
    );

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
            linked_beats: '[]'
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
        setStoryBeats((prev) =>
            prev.map((b) =>
                b.id === id ? ({ ...b, [field]: value } as StoryBeat) : b
            )
        );
        await rpc.request['db:update-story-beat']({
            id,
            data: { [field]: value } as any,
        });
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
            '[data-act-body]'
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
                ? styles['drop-before']
                : dropTarget.pos === 'after'
                    ? styles['drop-after']
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
            ? styles['drop-inside']
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

    return {
        chapters,
        collapsed,
        toggle,
        isCollapsed,
        actHeights,
        resizingActId,
        pendingEntities,
        knownCategoryMap,
        effectiveCharacters,
        effectiveLocations,
        effectiveOrganizations,
        effectiveItems,
        effectiveLore,
        sortedActs,
        sortedChapters,
        sortedSequences,
        scenesUnassigned,
        plotThreads,
        storyBeats,
        dragItem,
        dropTarget,
        chaptersOfAct,
        sequencesOfChapter,
        scenesOfSequence,
        scenesOfChapter,
        handleAddAct,
        handleAddChapter,
        handleAddSequence,
        handleAddScene,
        handleAddPlotThread,
        handleAddStoryBeat,
        handleDeleteAct,
        handleDeleteChapter,
        handleDeleteSequence,
        handleDeleteScene,
        handleDeleteThread,
        handleDeleteBeat,
        handleUpdateAct,
        handleUpdateSequence,
        handleUpdateScene,
        handleMoveSequence,
        handleMoveScene,
        handleUpdateThread,
        handleUpdateBeat,
        toggleAct,
        toggleChapter,
        toggleSequence,
        startActResize,
        handleRegisterPending,
        handleRegisterKnownCategory,
        handleRemovePending,
        handleCreateAndOpenEntity,
        cardDropClass,
        insideDropClass,
        startDrag,
        clearDrag,
        dragOverCard,
        dragOverInside,
        dragLeaveTarget,
        dropCard,
        dropInside,
        loadData,
        onNavigateChapter,
        onSelectCharacter,
        onSelectLocation,
        onSelectCategory,
        onSelectSidebarChapter,
        onSelectSidebarEntity,
    };
}

export type PlotArchitectureContextValue = ReturnType<
    typeof usePlotArchitecture
>;

export const PlotArchitectureContext =
    createContext<PlotArchitectureContextValue | null>(null);

export function usePlotArchitectureContext() {
    const ctx = useContext(PlotArchitectureContext);
    if (!ctx) {
        throw new Error(
            'usePlotArchitectureContext must be used inside PlotArchitectureContext.Provider'
        );
    }
    return ctx;
}
