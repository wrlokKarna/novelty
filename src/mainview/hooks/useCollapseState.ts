import { useEffect, useRef, useState } from 'react';

export type CollapseKind = 'acts' | 'chapters' | 'sequences' | 'scenes';

export type CollapseState = Record<CollapseKind, string[]>;

const EMPTY_STATE: CollapseState = {
    acts: [],
    chapters: [],
    sequences: [],
    scenes: [],
};

function storageKey(projectId: string) {
    return `novelty:ui:${projectId}`;
}

function loadState(projectId: string): CollapseState {
    try {
        const stored = localStorage.getItem(storageKey(projectId));
        if (!stored) return EMPTY_STATE;
        const parsed = JSON.parse(stored);
        return {
            acts: Array.isArray(parsed.acts) ? parsed.acts.map(String) : [],
            chapters: Array.isArray(parsed.chapters)
                ? parsed.chapters.map(String)
                : [],
            sequences: Array.isArray(parsed.sequences)
                ? parsed.sequences.map(String)
                : [],
            scenes: Array.isArray(parsed.scenes)
                ? parsed.scenes.map(String)
                : [],
        };
    } catch {
        return EMPTY_STATE;
    }
}

export function useCollapseState(projectId: string) {
    const [collapsed, setCollapsed] = useState<CollapseState>(() =>
        loadState(projectId)
    );
    const stateProjectId = useRef(projectId);

    useEffect(() => {
        stateProjectId.current = projectId;
        setCollapsed(loadState(projectId));
    }, [projectId]);

    useEffect(() => {
        if (stateProjectId.current !== projectId) return;
        try {
            localStorage.setItem(
                storageKey(projectId),
                JSON.stringify(collapsed)
            );
        } catch {
            // ignore storage failures
        }
    }, [projectId, collapsed]);

    function toggle(kind: CollapseKind, id: string) {
        setCollapsed((prev) => {
            const list = prev[kind];
            const nextList = list.includes(id)
                ? list.filter((x) => x !== id)
                : [...list, id];
            return { ...prev, [kind]: nextList };
        });
    }

    const isCollapsed = (kind: CollapseKind, id: string) =>
        collapsed[kind].includes(id);

    return { collapsed, toggle, isCollapsed };
}
