import { useState, useEffect, useRef, useMemo } from 'react';
import type { ReactNode } from 'react';

export interface SuggestionItem {
    id: string;
    primary: ReactNode;
    secondary?: string;
    metadata?: string;
}

export interface SuggestionGroup {
    label?: string;
    icon?: ReactNode;
    items: SuggestionItem[];
}

interface FloatingSuggestionsProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (id: string) => void;
    groups: SuggestionGroup[];
}

export default function FloatingSuggestions({
    isOpen,
    onClose,
    onSelect,
    groups,
}: FloatingSuggestionsProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const selectedIndexRef = useRef(selectedIndex);
    selectedIndexRef.current = selectedIndex;
    const listRef = useRef<HTMLDivElement>(null);
    const handlerRef = useRef<{
        isOpen: boolean;
        groups: SuggestionGroup[];
        onSelect: (id: string) => void;
        onClose: () => void;
    }>({ isOpen, groups, onSelect, onClose });
    handlerRef.current = { isOpen, groups, onSelect, onClose };

    const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [groups, isOpen]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const h = handlerRef.current;
            if (!h.isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((i) =>
                    Math.min(i + 1, h.groups.flatMap((g) => g.items).length - 1)
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const allItems = h.groups.flatMap((g) => g.items);
                const item = allItems[selectedIndexRef.current];
                if (item) h.onSelect(item.id);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                h.onClose();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    useEffect(() => {
        if (listRef.current) {
            const el = listRef.current.querySelector(
                `[data-index="${selectedIndex}"]`
            );
            el?.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex]);

    if (!isOpen || groups.length === 0 || flatItems.length === 0) return null;

    let globalIdx = 0;

    return (
        <div className="floating-suggestions" ref={listRef}>
            {groups.map((group, gi) => (
                <div
                    key={group.label ?? gi}
                    className="floating-suggestions-group"
                >
                    {group.label && (
                        <div className="floating-suggestions-group-header">
                            {group.icon}
                            <span>{group.label}</span>
                        </div>
                    )}
                    {group.items.map((item) => {
                        const idx = globalIdx++;
                        return (
                            <div
                                key={item.id}
                                className={`floating-suggestions-item ${idx === selectedIndex ? 'selected' : ''}`}
                                data-index={idx}
                                onClick={() => onSelect(item.id)}
                                onMouseEnter={() => setSelectedIndex(idx)}
                            >
                                <span className="floating-suggestions-item-primary">
                                    {item.primary}
                                </span>
                                {item.secondary && (
                                    <span className="floating-suggestions-item-secondary">
                                        {item.secondary}
                                    </span>
                                )}
                                {item.metadata && (
                                    <span className="floating-suggestions-item-metadata">
                                        {item.metadata}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
