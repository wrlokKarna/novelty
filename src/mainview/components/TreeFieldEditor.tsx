import { useState, useMemo, useRef, useEffect } from 'react';
import type { CompendiumCategory } from '../types/index';
import type { TreeEdge, TreeRelationPair } from '../templates/tree';
import { inverseOf, treeEdgeKey, buildTreeGraph } from '../templates/tree';
import { IconPlus, IconX, IconSearch } from '@tabler/icons-react';

type EntryRef = {
    id: string;
    name: string;
    templateData?: Record<string, unknown> | null;
};

interface TreeFieldEditorProps {
    edges: TreeEdge[];
    entryId: string;
    entryName: string;
    allowedCategories: CompendiumCategory[];
    relations: TreeRelationPair[];
    characters?: EntryRef[];
    locations?: EntryRef[];
    organizations?: EntryRef[];
    items?: EntryRef[];
    loreEntries?: EntryRef[];
    onChange: (edges: TreeEdge[]) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
    character: '#4a9eff',
    location: '#4caf50',
    organization: '#ff9800',
    item: '#ab47bc',
    lore: '#ff7043',
};

export default function TreeFieldEditor({
    edges,
    entryId,
    entryName,
    allowedCategories,
    relations,
    characters,
    locations,
    organizations,
    items,
    loreEntries,
    onChange,
}: TreeFieldEditorProps) {
    const [showAdd, setShowAdd] = useState(false);
    const [customMode, setCustomMode] = useState(false);
    const [customRelation, setCustomRelation] = useState('');
    const [customInverse, setCustomInverse] = useState('');
    const [selectedRelation, setSelectedRelation] = useState('');
    const [selectedTarget, setSelectedTarget] = useState<{
        id: string;
        category: CompendiumCategory;
    } | null>(null);
    const [relQuery, setRelQuery] = useState('');
    const [targetQuery, setTargetQuery] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    const allEntries = useMemo(() => {
        const out: Array<{
            id: string;
            name: string;
            category: CompendiumCategory;
            templateData?: Record<string, unknown> | null;
        }> = [];
        for (const cat of allowedCategories) {
            const list =
                cat === 'character'
                    ? characters
                    : cat === 'location'
                      ? locations
                      : cat === 'organization'
                        ? organizations
                        : cat === 'item'
                          ? items
                          : cat === 'lore'
                            ? loreEntries
                            : [];
            for (const e of list || []) {
                out.push({
                    id: e.id,
                    name: e.name,
                    category: cat,
                    templateData: e.templateData,
                });
            }
        }
        return out;
    }, [
        allowedCategories,
        characters,
        locations,
        organizations,
        items,
        loreEntries,
    ]);

    const nameById = useMemo(() => {
        const m = new Map<string, string>();
        for (const e of allEntries) m.set(e.id, e.name);
        return m;
    }, [allEntries]);

    const relationOptions = useMemo(() => {
        const seen = new Set<string>();
        const out: TreeRelationPair[] = [];
        for (const p of relations) {
            if (seen.has(p.relation)) continue;
            seen.add(p.relation);
            out.push(p);
        }
        return out;
    }, [relations]);

    useEffect(() => {
        if (!showAdd) return;
        function handleClickOutside(e: MouseEvent) {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(e.target as Node)
            ) {
                setShowAdd(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, [showAdd]);

    function resetAdd() {
        setShowAdd(false);
        setCustomMode(false);
        setCustomRelation('');
        setCustomInverse('');
        setSelectedRelation('');
        setSelectedTarget(null);
        setRelQuery('');
        setTargetQuery('');
    }

    function addEdge() {
        if (!selectedTarget) return;
        const relation = customMode ? customRelation.trim() : selectedRelation;
        if (!relation) return;
        const inverse = customMode
            ? customInverse.trim() || relation
            : inverseOf(relation, relations);
        const newEdge: TreeEdge = {
            relation,
            inverseRelation: inverse,
            targetType: selectedTarget.category,
            targetId: selectedTarget.id,
        };
        const key = treeEdgeKey(newEdge);
        if (edges.some((e) => treeEdgeKey(e) === key)) return;
        onChange([...edges, newEdge]);
        resetAdd();
    }

    function removeEdge(targetId: string, relation: string) {
        onChange(
            edges.filter(
                (e) => !(e.targetId === targetId && e.relation === relation)
            )
        );
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Escape') {
            resetAdd();
        } else if (e.key === 'Enter') {
            const canAdd =
                (customMode
                    ? customRelation.trim().length > 0
                    : selectedRelation) && !!selectedTarget;
            if (canAdd) {
                e.preventDefault();
                addEdge();
            }
        }
    }

    const filteredRelations = relationOptions.filter((p) =>
        p.relation.toLowerCase().includes(relQuery.trim().toLowerCase())
    );
    const filteredTargets = allEntries.filter(
        (e) =>
            e.id !== entryId &&
            e.name.toLowerCase().includes(targetQuery.trim().toLowerCase())
    );

    const canAdd =
        (customMode ? customRelation.trim().length > 0 : selectedRelation) &&
        !!selectedTarget;

    return (
        <div
            ref={wrapperRef}
            className="tree-field-editor"
            onKeyDown={handleKeyDown}
        >
            <div className="tree-chips">
                {edges.length === 0 && (
                    <span className="tree-empty">
                        No relationships defined.
                    </span>
                )}
                {edges.map((edge) => (
                    <span key={treeEdgeKey(edge)} className="tree-chip">
                        <span className="tree-chip-label">{edge.relation}</span>
                        <span className="tree-chip-arrow">→</span>
                        <span className="tree-chip-target">
                            {nameById.get(edge.targetId) || edge.targetId}
                        </span>
                        <button
                            type="button"
                            className="tree-chip-remove"
                            aria-label="Remove"
                            onClick={() =>
                                removeEdge(edge.targetId, edge.relation)
                            }
                        >
                            <IconX size={12} />
                        </button>
                    </span>
                ))}
                <button
                    type="button"
                    className="tree-add-btn"
                    onClick={() => setShowAdd(!showAdd)}
                >
                    <IconPlus size={14} />
                    Add relationship
                </button>
            </div>

            {showAdd && (
                <div className="tree-popover">
                    <div className="tree-popover-section">
                        <div className="tree-popover-label">Relation</div>
                        {!customMode ? (
                            <>
                                <div className="tree-search">
                                    <IconSearch size={14} />
                                    <input
                                        value={relQuery}
                                        onChange={(e) =>
                                            setRelQuery(e.target.value)
                                        }
                                        placeholder="Search relation..."
                                        autoFocus
                                    />
                                </div>
                                <div className="tree-options">
                                    {filteredRelations.map((p) => (
                                        <button
                                            key={p.relation}
                                            type="button"
                                            className={
                                                selectedRelation === p.relation
                                                    ? 'tree-option selected'
                                                    : 'tree-option'
                                            }
                                            onClick={() =>
                                                setSelectedRelation(p.relation)
                                            }
                                        >
                                            <span>{p.relation}</span>
                                            <span className="tree-option-inverse">
                                                → {p.inverse}
                                            </span>
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        className="tree-option tree-option-custom"
                                        onClick={() => setCustomMode(true)}
                                    >
                                        Add custom relation…
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="tree-custom-fields">
                                <input
                                    placeholder="Relation (e.g. mentors)"
                                    value={customRelation}
                                    onChange={(e) =>
                                        setCustomRelation(e.target.value)
                                    }
                                    autoFocus
                                />
                                <input
                                    placeholder="Inverse (e.g. mentee)"
                                    value={customInverse}
                                    onChange={(e) =>
                                        setCustomInverse(e.target.value)
                                    }
                                />
                                <button
                                    type="button"
                                    className="tree-option-custom-back"
                                    onClick={() => setCustomMode(false)}
                                >
                                    ← Pick from list
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="tree-popover-section">
                        <div className="tree-popover-label">Target</div>
                        <div className="tree-search">
                            <IconSearch size={14} />
                            <input
                                value={targetQuery}
                                onChange={(e) => setTargetQuery(e.target.value)}
                                placeholder="Search entries..."
                            />
                        </div>
                        <div className="tree-options">
                            {filteredTargets.map((e) => (
                                <button
                                    key={e.id}
                                    type="button"
                                    className={
                                        selectedTarget?.id === e.id
                                            ? 'tree-option selected'
                                            : 'tree-option'
                                    }
                                    onClick={() =>
                                        setSelectedTarget({
                                            id: e.id,
                                            category: e.category,
                                        })
                                    }
                                >
                                    <span
                                        className="tree-cat-dot"
                                        style={{
                                            background:
                                                CATEGORY_COLORS[e.category] ||
                                                '#888',
                                        }}
                                    />
                                    <span className="tree-option-name">
                                        {e.name}
                                    </span>
                                    <span className="tree-option-cat">
                                        {e.category}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="tree-popover-footer">
                        <div className="tree-preview">
                            <span className="tree-preview-relation">
                                {customMode
                                    ? customRelation || '…'
                                    : selectedRelation || '…'}
                            </span>
                            <span className="tree-preview-arrow">→</span>
                            <span className="tree-preview-target">
                                {selectedTarget
                                    ? nameById.get(selectedTarget.id) ||
                                      selectedTarget.id
                                    : '…'}
                            </span>
                        </div>
                        <div className="tree-popover-actions">
                            <button
                                type="button"
                                className="tree-cancel-btn"
                                onClick={resetAdd}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="tree-add-confirm"
                                disabled={!canAdd}
                                onClick={addEdge}
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {edges.length > 0 && (
                <div className="tree-view-section">
                    <div className="tree-view-label">Tree</div>
                    <TreeView
                        entryId={entryId}
                        entryName={entryName}
                        edges={edges}
                        allEntries={allEntries}
                        relations={relations}
                    />
                </div>
            )}
        </div>
    );
}

function classifyRelations(relations: TreeRelationPair[]) {
    const up = new Set<string>();
    const down = new Set<string>();
    const symmetric = new Set<string>();
    const seen = new Set<string>();
    for (const p of relations) {
        if (p.relation === p.inverse) {
            symmetric.add(p.relation);
            continue;
        }
        const key = `${p.relation}::${p.inverse}`;
        const revKey = `${p.inverse}::${p.relation}`;
        if (seen.has(revKey)) continue;
        up.add(p.relation);
        down.add(p.inverse);
        seen.add(key);
    }
    for (const label of up) down.delete(label);
    return { up, down, symmetric };
}

function bfsLevels(
    graph: Map<string, TreeEdge[]>,
    classified: Set<string>,
    start: string
): Array<Array<{ id: string; relation: string }>> {
    const levels: Array<Array<{ id: string; relation: string }>> = [];
    const visited = new Set<string>([start]);
    let frontier: Array<{ id: string; relation: string }> = [
        { id: start, relation: '' },
    ];
    while (frontier.length > 0) {
        const level: Array<{ id: string; relation: string }> = [];
        const next: Array<{ id: string; relation: string }> = [];
        for (const f of frontier) {
            for (const e of graph.get(f.id) || []) {
                if (classified.has(e.relation) && !visited.has(e.targetId)) {
                    visited.add(e.targetId);
                    level.push({ id: e.targetId, relation: e.relation });
                    next.push({ id: e.targetId, relation: e.relation });
                }
            }
        }
        if (level.length > 0) levels.push(level);
        frontier = next;
    }
    return levels;
}

function TreeView({
    entryId,
    entryName,
    edges,
    allEntries,
    relations,
}: {
    entryId: string;
    entryName: string;
    edges: TreeEdge[];
    allEntries: Array<{
        id: string;
        name: string;
        category: CompendiumCategory;
        templateData?: Record<string, unknown> | null;
    }>;
    relations: TreeRelationPair[];
}) {
    const graph = useMemo(
        () =>
            buildTreeGraph([
                { id: entryId, templateData: { _tree: edges } },
                ...allEntries,
            ]),
        [entryId, edges, allEntries]
    );

    const { up, down, symmetric } = useMemo(
        () => classifyRelations(relations),
        [relations]
    );

    const upLevels = useMemo(
        () => bfsLevels(graph, up, entryId),
        [graph, up, entryId]
    );
    const downLevels = useMemo(
        () => bfsLevels(graph, down, entryId),
        [graph, down, entryId]
    );
    const symmetricNodes = useMemo(
        () =>
            edges
                .filter((e) => symmetric.has(e.relation))
                .map((e) => ({ id: e.targetId, relation: e.relation })),
        [edges, symmetric]
    );
    const otherEdges = useMemo(
        () =>
            edges.filter(
                (e) =>
                    !up.has(e.relation) &&
                    !down.has(e.relation) &&
                    !symmetric.has(e.relation)
            ),
        [edges, up, down, symmetric]
    );

    const meta = useMemo(() => {
        const name = new Map<string, string>();
        const cat = new Map<string, string>();
        for (const e of allEntries) {
            name.set(e.id, e.name);
            cat.set(e.id, e.category);
        }
        return { name, cat };
    }, [allEntries]);

    return (
        <div className="tree-view">
            {upLevels
                .slice()
                .reverse()
                .map((level, li) => (
                    <div
                        key={`up-${li}`}
                        className="tree-view-row tree-view-up"
                    >
                        {level.map((n) => (
                            <NodeChip
                                key={n.id}
                                name={meta.name.get(n.id) || n.id}
                                relation={n.relation}
                                category={meta.cat.get(n.id)}
                            />
                        ))}
                    </div>
                ))}
            <div className="tree-view-row tree-view-self">
                <NodeChip name={entryName} highlight />
                {symmetricNodes.map((n) => (
                    <NodeChip
                        key={n.id}
                        name={meta.name.get(n.id) || n.id}
                        relation={n.relation}
                        category={meta.cat.get(n.id)}
                    />
                ))}
            </div>
            {downLevels.map((level, li) => (
                <div
                    key={`down-${li}`}
                    className="tree-view-row tree-view-down"
                >
                    {level.map((n) => (
                        <NodeChip
                            key={n.id}
                            name={meta.name.get(n.id) || n.id}
                            relation={n.relation}
                            category={meta.cat.get(n.id)}
                        />
                    ))}
                </div>
            ))}
            {otherEdges.length > 0 && (
                <div className="tree-view-other">
                    <div className="tree-view-label">Other relations</div>
                    <div className="tree-view-row">
                        {otherEdges.map((e) => (
                            <NodeChip
                                key={treeEdgeKey(e)}
                                name={meta.name.get(e.targetId) || e.targetId}
                                relation={e.relation}
                                category={meta.cat.get(e.targetId)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function NodeChip({
    name,
    relation,
    category,
    highlight,
}: {
    name: string;
    relation?: string;
    category?: string;
    highlight?: boolean;
}) {
    return (
        <div className={highlight ? 'tree-node highlight' : 'tree-node'}>
            {category && (
                <span
                    className="tree-node-dot"
                    style={{ background: CATEGORY_COLORS[category] || '#888' }}
                />
            )}
            <span className="tree-node-name">{name}</span>
            {relation && <span className="tree-node-rel">{relation}</span>}
        </div>
    );
}
