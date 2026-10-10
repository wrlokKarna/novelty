import { useCallback, useState } from 'react';

export const LAYOUT_ENGINE_KEY = 'novelty.layoutEngine';

export type LayoutEngineId = 'framer' | 'dnd';

export function getStoredLayoutEngine(): LayoutEngineId {
    try {
        const v = localStorage.getItem(LAYOUT_ENGINE_KEY);
        if (v === 'dnd' || v === 'framer') return v;
    } catch {
        // localStorage unavailable (private mode / node) - fall through
    }
    return 'framer';
}

// The reorder engine is a runtime preference, not per-project data: the layout
// is engine-agnostic (order + spans + columns), so switching engines only
// changes how it is dragged, never what is stored.
export function useLayoutEngine() {
    const [engine, setEngine] = useState<LayoutEngineId>(getStoredLayoutEngine);
    const change = useCallback((next: LayoutEngineId) => {
        setEngine(next);
        try {
            localStorage.setItem(LAYOUT_ENGINE_KEY, next);
        } catch {
            // ignore
        }
    }, []);
    return { engine, setEngine: change };
}
