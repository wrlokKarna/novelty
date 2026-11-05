import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import {
    IconArrowBarToLeft,
    IconArrowBarToRight,
    IconCheck,
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconObjectScan,
    IconPlus,
} from '@tabler/icons-react';
import styles from './TimelineBottomDock.module.css';
import type {
    TimelineDataItem,
    timelineFilterBtn,
} from '@/shared/types/timeline';
import type { FileTab } from '@/shared/types/project/templates';

type Props = {
    hasAnySelected: boolean;
    handleToggleAllOrClear: () => void;
    openTabsChecked: boolean;
    setOpenTabsChecked: React.Dispatch<React.SetStateAction<boolean>>;
    timelineFilters: timelineFilterBtn[];
    setTimelineFilters: React.Dispatch<
        React.SetStateAction<timelineFilterBtn[]>
    >;
    tabs: FileTab[];
    categoryData: Record<string, TimelineDataItem[]>;
    onAddEvent: () => void;
    onAutoDetect?: () => Promise<number | null> | number | null;
    unassignedEvents: number[];
    selectedEvent: string;
    onSelectEvent: React.Dispatch<React.SetStateAction<string>>;
    previewLimit?: number;
    selectedItems: Set<string>;
    onToggleItem: (key: string) => void;
};

const EMPTY_ITEMS: TimelineDataItem[] = [];
const DEFAULT_PREVIEW_LIMIT = 10;
const SELECTION_SEPARATOR = '::';

export function getCheckedSectionKeys(
    timelineFilters: timelineFilterBtn[],
    openTabsChecked: boolean
): string[] {
    const keys: string[] = [];
    if (openTabsChecked) keys.push('opened tabs');
    for (const filt of timelineFilters) {
        if (filt.cat === 'opened tabs') continue;
        for (const sub of filt.subCat ?? []) {
            if (sub.checked) keys.push(sub.key);
        }
    }
    return keys;
}

type DataSectionProps = {
    sectionKey: string;
    label: string;
    items: TimelineDataItem[];
    limit: number;
    selectedItems: Set<string>;
    onToggleItem: (key: string) => void;
    selectable: boolean;
    registerRef: (key: string, el: HTMLDivElement | null) => void;
};

const DataSection = memo(function DataSection({
    sectionKey,
    label,
    items,
    limit,
    selectedItems,
    onToggleItem,
    selectable,
    registerRef,
}: DataSectionProps) {
    const [pinned, setPinned] = useState(true);
    const [hovered, setHovered] = useState(false);
    const [showAllPinned, setShowAllPinned] = useState(false);
    const [showAllHover, setShowAllHover] = useState(false);

    const expanded = pinned || hovered;
    const showAll = showAllPinned || showAllHover;
    const visibleItems =
        showAll || limit >= items.length ? items : items.slice(0, limit);
    const hiddenCount = items.length - visibleItems.length;

    const selectedEntries = useMemo(() => {
        return items.filter((item) =>
            selectedItems.has(`${sectionKey}${SELECTION_SEPARATOR}${item.id}`)
        );
    }, [items, selectedItems, sectionKey]);

    const activeCount = selectedEntries.length;
    const renderItems = expanded ? visibleItems : selectedEntries;

    return (
        <div
            className={styles.dataSection}
            ref={(el) => {
                registerRef(sectionKey, el);
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => {
                setHovered(false);
                setShowAllHover(false);
            }}
        >
            <button
                type="button"
                className={styles.dataSectionHeader}
                title={pinned ? `Collapse ${label}` : `Expand ${label}`}
                aria-expanded={expanded}
                onClick={() => setPinned((prev) => !prev)}
            >
                <span>{label}</span>
                {items.length > 0 && (
                    <span className={styles.dataSectionCount}>
                        {activeCount}/{items.length}
                    </span>
                )}
                {pinned ? (
                    <IconChevronLeft size={12} />
                ) : (
                    <IconChevronRight size={12} />
                )}
            </button>

            {items.length === 0 ? (
                <span className={styles.categoryDataEmpty}>No entries</span>
            ) : (
                <>
                    {renderItems.map((item, index) => {
                        const key = `${sectionKey}${SELECTION_SEPARATOR}${item.id}`;
                        const isSelected = selectedItems.has(key);
                        const chipKey = `${item.id}-${index}`;

                        if (!selectable) {
                            return (
                                <span
                                    key={chipKey}
                                    className={`${styles.categoryDataChip} ${styles.categoryDataChipStatic}`}
                                    title={item.label}
                                >
                                    {item.label}
                                </span>
                            );
                        }

                        return (
                            <button
                                key={chipKey}
                                type="button"
                                className={`${styles.categoryDataChip} ${
                                    isSelected
                                        ? styles.categoryDataChipSelected
                                        : ''
                                }`}
                                title={item.label}
                                aria-pressed={isSelected}
                                onClick={() => {
                                    if (
                                        expanded &&
                                        !showAllPinned &&
                                        index >= limit
                                    ) {
                                        setShowAllPinned(true);
                                    }
                                    onToggleItem(key);
                                }}
                            >
                                {item.label}
                            </button>
                        );
                    })}

                    {expanded && hiddenCount > 0 && (
                        <button
                            type="button"
                            className={styles.dataMoreBtn}
                            title={`${items.length} entries in total`}
                            onMouseEnter={() => setShowAllHover(true)}
                            onFocus={() => setShowAllPinned(true)}
                            onClick={() => setShowAllPinned(true)}
                        >
                            <span>+{hiddenCount} more</span>
                            <IconChevronDown size={12} />
                        </button>
                    )}
                </>
            )}
        </div>
    );
});

function TimelineBottomDock({
    hasAnySelected,
    handleToggleAllOrClear,
    openTabsChecked,
    setOpenTabsChecked,
    timelineFilters,
    setTimelineFilters,
    tabs,
    categoryData,
    onAddEvent,
    onAutoDetect,
    unassignedEvents,
    selectedEvent,
    onSelectEvent,
    previewLimit = DEFAULT_PREVIEW_LIMIT,
    selectedItems,
    onToggleItem,
}: Props) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const dataScrollRef = useRef<HTMLDivElement>(null);
    const trayRef = useRef<HTMLDivElement>(null);
    const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const openTabsPillRef = useRef<HTMLDivElement>(null);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const detectResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null
    );
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [hoveredCat, setHoveredCat] = useState('');
    const [hoveredSubKey, setHoveredSubKey] = useState('');
    const [openTabsOpen, setOpenTabsOpen] = useState(false);
    const [popoverPos, setPopoverPos] = useState({ left: 0, top: 0 });
    const [trayExpanded, setTrayExpanded] = useState(false);

    const [detectPhase, setDetectPhase] = useState<
        'idle' | 'scanning' | 'done'
    >('idle');
    const [detectedCount, setDetectedCount] = useState<number | null>(null);

    const updateScrollIndicators = useCallback(() => {
        const el = scrollContainerRef.current;
        if (!el) return;

        const { scrollLeft, scrollWidth, clientWidth } = el;
        // 1px tolerance to handle subpixel or fractional zoom
        setCanScrollLeft(scrollLeft > 1);
        setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    }, []);

    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;

        updateScrollIndicators();

        const observer = new ResizeObserver(() => updateScrollIndicators());
        observer.observe(el);

        return () => observer.disconnect();
    }, [updateScrollIndicators]);

    useEffect(() => {
        const id = requestAnimationFrame(updateScrollIndicators);
        return () => cancelAnimationFrame(id);
    }, [hoveredCat, timelineFilters, updateScrollIndicators]);

    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;

        const handleWheel = (event: WheelEvent) => {
            if (event.deltaY === 0) return;
            if (el.scrollWidth <= el.clientWidth) return;
            event.preventDefault();
            el.scrollLeft += event.deltaY;
        };

        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, []);

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, []);

    const cancelOpenTabsClose = () => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    };

    const showOpenTabsPopover = () => {
        cancelOpenTabsClose();

        const rect = openTabsPillRef.current?.getBoundingClientRect();
        if (!rect) return;

        const popoverWidth = 280;
        const margin = 8;
        const left = Math.min(
            Math.max(rect.left, margin),
            window.innerWidth - popoverWidth - margin
        );

        setPopoverPos({ left, top: rect.top });
        setOpenTabsOpen(true);
    };

    const scheduleOpenTabsClose = () => {
        cancelOpenTabsClose();
        closeTimerRef.current = setTimeout(() => {
            setOpenTabsOpen(false);
            closeTimerRef.current = null;
        }, 120);
    };

    useEffect(() => {
        if (!openTabsOpen) return;

        const close = () => setOpenTabsOpen(false);
        window.addEventListener('resize', close);
        return () => window.removeEventListener('resize', close);
    }, [openTabsOpen]);

    const handleDetectEvents = useCallback(async () => {
        if (detectPhase === 'scanning') return;

        if (detectResetTimerRef.current) {
            clearTimeout(detectResetTimerRef.current);
            detectResetTimerRef.current = null;
        }

        setDetectPhase('scanning');
        setDetectedCount(null);

        let created: number | null = null;
        try {
            const result = await onAutoDetect?.();
            created = typeof result === 'number' ? result : 0;
        } catch (error) {
            console.error('Failed to detect timeline events:', error);
        }

        setDetectedCount(created);
        setDetectPhase('done');

        detectResetTimerRef.current = setTimeout(() => {
            setDetectPhase('idle');
            setDetectedCount(null);
            detectResetTimerRef.current = null;
        }, 2200);
    }, [detectPhase, onAutoDetect]);

    useEffect(() => {
        return () => {
            if (detectResetTimerRef.current) {
                clearTimeout(detectResetTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (unassignedEvents.length === 0) setTrayExpanded(false);
    }, [unassignedEvents.length]);

    useEffect(() => {
        const el = trayRef.current;
        if (!el) return;

        const handleWheel = (event: WheelEvent) => {
            if (event.deltaY === 0) return;
            if (el.scrollWidth <= el.clientWidth) return;
            event.preventDefault();
            el.scrollLeft += event.deltaY;
        };

        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, [unassignedEvents.length]);

    const handleScrollBy = (offset: number) => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({
                left: offset,
                behavior: 'smooth',
            });
        }
    };

    const handleFilterScroll = () => {
        updateScrollIndicators();
        if (openTabsOpen) setOpenTabsOpen(false);
    };

    const checkedKeys = useMemo(
        () => getCheckedSectionKeys(timelineFilters, openTabsChecked),
        [timelineFilters, openTabsChecked]
    );

    const tabItems = useMemo(
        () => tabs.map((tab) => ({ id: tab.id, label: tab.name })),
        [tabs]
    );

    const sectionKeys =
        hoveredSubKey && !checkedKeys.includes(hoveredSubKey)
            ? [...checkedKeys, hoveredSubKey]
            : checkedKeys;

    const sectionLimit =
        checkedKeys.length > 1 ? previewLimit : Number.POSITIVE_INFINITY;

    const sections = sectionKeys.map((key) => ({
        key,
        label: key,
        items:
            key === 'opened tabs'
                ? tabItems
                : (categoryData[key] ?? EMPTY_ITEMS),
    }));

    const showDataRow = sections.length > 0 || unassignedEvents.length > 0;

    const detectState =
        detectPhase === 'done' && detectedCount === null
            ? 'failed'
            : detectPhase;
    const detectLabel =
        detectPhase === 'scanning'
            ? 'Detecting events…'
            : detectPhase === 'done'
              ? detectedCount === null
                  ? 'Detection failed'
                  : detectedCount === 0
                    ? 'No new events'
                    : `${detectedCount} new event${
                          detectedCount === 1 ? '' : 's'
                      }`
              : 'Detect events';

    const registerSectionRef = useCallback(
        (key: string, el: HTMLDivElement | null) => {
            if (el) {
                sectionRefs.current.set(key, el);
            } else {
                sectionRefs.current.delete(key);
            }
        },
        []
    );

    const scrollToSection = useCallback(
        (key: string) => {
            if (trayExpanded) return;

            const container = dataScrollRef.current;
            const target = sectionRefs.current.get(key);
            if (!container || !target) return;

            container.scrollTo({
                left: Math.max(target.offsetLeft, 0),
                behavior: 'smooth',
            });
        },
        [trayExpanded]
    );

    const scrollRafRef = useRef<number | null>(null);
    const queueScrollToSection = useCallback(
        (key?: string) => {
            if (!key) return;
            if (scrollRafRef.current !== null) {
                cancelAnimationFrame(scrollRafRef.current);
            }
            scrollRafRef.current = requestAnimationFrame(() => {
                scrollRafRef.current = null;
                scrollToSection(key);
            });
        },
        [scrollToSection]
    );

    useEffect(() => {
        return () => {
            if (scrollRafRef.current !== null) {
                cancelAnimationFrame(scrollRafRef.current);
            }
        };
    }, []);

    const scrollToCategory = useCallback(
        (cat: string) => {
            if (cat === 'opened tabs') {
                if (openTabsChecked) queueScrollToSection('opened tabs');
                return;
            }

            const filt = timelineFilters.find((item) => item.cat === cat);
            const firstChecked = filt?.subCat?.find((sub) => sub.checked);
            if (firstChecked) queueScrollToSection(firstChecked.key);
        },
        [timelineFilters, openTabsChecked, queueScrollToSection]
    );

    useEffect(() => {
        if (!showDataRow || trayExpanded) return;

        const el = dataScrollRef.current;
        if (!el) return;

        const handleWheel = (event: WheelEvent) => {
            if (event.deltaY === 0) return;
            if (el.scrollWidth <= el.clientWidth) return;
            event.preventDefault();
            el.scrollLeft += event.deltaY;
        };

        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, [showDataRow, trayExpanded]);

    return (
        <div className={styles.timelineDock}>
            {showDataRow && (
                <div className={styles.categoryDataRow}>
                    {unassignedEvents.length > 0 && (
                        <div
                            className={`${styles.unassignedTrayWrap} ${
                                trayExpanded
                                    ? styles.unassignedTrayWrapExpanded
                                    : ''
                            }`}
                        >
                            <div
                                className={styles.unassignedTray}
                                ref={trayRef}
                            >
                                {unassignedEvents.map((eventNumber) => {
                                    const value = String(eventNumber);
                                    const isActive = selectedEvent === value;

                                    return (
                                        <button
                                            key={eventNumber}
                                            type="button"
                                            className={`${styles.unassignedEventChip} ${
                                                isActive
                                                    ? styles.unassignedEventActive
                                                    : ''
                                            }`}
                                            onClick={() =>
                                                onSelectEvent(
                                                    isActive ? '' : value
                                                )
                                            }
                                        >
                                            {isActive
                                                ? 'Cancel Selection'
                                                : `Event #${eventNumber}`}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                type="button"
                                className={styles.trayExpandBtn}
                                aria-pressed={trayExpanded}
                                aria-label={
                                    trayExpanded
                                        ? 'Shrink event tray'
                                        : 'Expand event tray'
                                }
                                title={
                                    trayExpanded
                                        ? 'Shrink event tray'
                                        : 'Expand event tray'
                                }
                                onClick={() => setTrayExpanded((prev) => !prev)}
                            >
                                {trayExpanded ? (
                                    <IconArrowBarToLeft size={13} />
                                ) : (
                                    <IconArrowBarToRight size={13} />
                                )}
                            </button>
                        </div>
                    )}

                    {sections.length > 0 && (
                        <div
                            className={`${styles.dataScroll} ${
                                trayExpanded ? styles.dataScrollFrozen : ''
                            }`}
                            ref={dataScrollRef}
                        >
                            {sections.map((section) => (
                                <DataSection
                                    key={section.key}
                                    sectionKey={section.key}
                                    label={section.label}
                                    items={section.items}
                                    limit={sectionLimit}
                                    selectedItems={selectedItems}
                                    onToggleItem={onToggleItem}
                                    selectable={checkedKeys.includes(
                                        section.key
                                    )}
                                    registerRef={registerSectionRef}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className={styles.bottomFilterBar}>
                <div className={styles.fixedActionArea}>
                    <div className={styles.comboBtn}>
                        {detectPhase === 'idle' && (
                            <button
                                type="button"
                                className={styles.comboMainBtn}
                                onClick={onAddEvent}
                            >
                                <IconPlus size={14} />
                                <span>Add Event</span>
                            </button>
                        )}
                        <button
                            type="button"
                            className={`${styles.detectEventscomboMinorBtn} ${
                                detectPhase !== 'idle'
                                    ? styles.detectEventscomboMinorBtnExpanded
                                    : ''
                            }`}
                            data-state={detectState}
                            disabled={detectPhase === 'scanning'}
                            aria-busy={detectPhase === 'scanning'}
                            aria-label={detectLabel}
                            title={detectLabel}
                            onClick={handleDetectEvents}
                        >
                            {detectPhase === 'done' &&
                            detectedCount !== null ? (
                                <IconCheck size={14} />
                            ) : (
                                <IconObjectScan
                                    size={14}
                                    className={
                                        detectPhase === 'scanning'
                                            ? styles.detectScanIcon
                                            : undefined
                                    }
                                />
                            )}
                            {detectPhase !== 'idle' && (
                                <span
                                    className={styles.detectEventsLabel}
                                    aria-live="polite"
                                >
                                    {detectLabel}
                                </span>
                            )}
                        </button>
                    </div>
                    <span className={styles.filterDivider}>|</span>
                    <button
                        type="button"
                        className={`${styles.clearAllBtn} ${hasAnySelected ? styles.clearActive : ''}`}
                        onClick={handleToggleAllOrClear}
                    >
                        {hasAnySelected ? 'Clear' : 'All'}
                    </button>
                    <span className={styles.filterDivider}>|</span>
                </div>

                <div className={styles.scrollTrackWrapper}>
                    {canScrollLeft && (
                        <div
                            className={`${styles.circleBlurContainer} ${styles.circleBlurLeft}`}
                        >
                            <button
                                type="button"
                                aria-label="Scroll left"
                                className={styles.navScrollBtn}
                                onClick={() => handleScrollBy(-200)}
                            >
                                <IconChevronLeft size={16} />
                            </button>
                        </div>
                    )}

                    <div
                        ref={scrollContainerRef}
                        className={styles.scrollableContent}
                        onScroll={handleFilterScroll}
                    >
                        <div className={styles.primaryFilterGroup}>
                            <div
                                ref={openTabsPillRef}
                                className={styles.categoryWrapper}
                                onMouseEnter={() => {
                                    setHoveredCat('opened tabs');
                                    setHoveredSubKey('opened tabs');
                                    showOpenTabsPopover();
                                }}
                                onMouseLeave={() => {
                                    setHoveredCat((prev) =>
                                        prev === 'opened tabs' ? '' : prev
                                    );
                                    setHoveredSubKey((prev) =>
                                        prev === 'opened tabs' ? '' : prev
                                    );
                                    scheduleOpenTabsClose();
                                }}
                            >
                                <div
                                    className={`${styles.filterCheckboxItem} ${
                                        openTabsChecked
                                            ? styles.highlightedPill
                                            : ''
                                    }`}
                                    onMouseEnter={() => {
                                        setHoveredSubKey('opened tabs');
                                        queueScrollToSection('opened tabs');
                                    }}
                                    onClick={() => {
                                        if (!openTabsChecked) {
                                            queueScrollToSection('opened tabs');
                                        }
                                        setOpenTabsChecked((prev) => !prev);
                                    }}
                                >
                                    <span
                                        className={`${styles.nodeIndicator} ${
                                            openTabsChecked
                                                ? styles.nodeIndicatorActive
                                                : ''
                                        }`}
                                    >
                                        {openTabsChecked && (
                                            <span
                                                className={
                                                    styles.nodeIndicatorActiveCheck
                                                }
                                            />
                                        )}
                                    </span>
                                    <span>Opened Tabs</span>
                                </div>
                            </div>

                            {timelineFilters
                                .filter((filt) => filt.cat !== 'opened tabs')
                                .map((filt) => {
                                    const hasCheckedSubs =
                                        (
                                            filt.subCat?.filter(
                                                (sub) => sub.checked
                                            ) ?? []
                                        ).length > 0;
                                    const isExpanded = hoveredCat === filt.cat;

                                    return (
                                        <div
                                            key={filt.cat}
                                            className={styles.categoryWrapper}
                                            onMouseEnter={() =>
                                                setHoveredCat(filt.cat)
                                            }
                                            onMouseLeave={() => {
                                                setHoveredCat((prev) =>
                                                    prev === filt.cat
                                                        ? ''
                                                        : prev
                                                );
                                                setHoveredSubKey('');
                                            }}
                                        >
                                            <div
                                                className={`${styles.filterCheckboxItem} ${
                                                    hasCheckedSubs
                                                        ? styles.highlightedPill
                                                        : ''
                                                }`}
                                                onMouseEnter={() => {
                                                    setHoveredSubKey('');
                                                    scrollToCategory(filt.cat);
                                                }}
                                            >
                                                <span>{filt.cat}</span>

                                                {filt.subCat &&
                                                    (isExpanded ? (
                                                        <IconChevronLeft
                                                            size={15}
                                                            className={
                                                                styles.chevronIcon
                                                            }
                                                        />
                                                    ) : (
                                                        <IconChevronRight
                                                            size={15}
                                                            className={
                                                                styles.chevronIcon
                                                            }
                                                        />
                                                    ))}
                                            </div>

                                            {filt.subCat && (
                                                <div
                                                    className={
                                                        styles.horizontalOptionsTrack
                                                    }
                                                >
                                                    {filt.subCat
                                                        .filter(
                                                            (sub) =>
                                                                sub.checked ||
                                                                isExpanded
                                                        )
                                                        .map((sub) => (
                                                            <div
                                                                key={sub.key}
                                                                className={`${styles.subCheckboxItem} ${
                                                                    sub.checked
                                                                        ? styles.subActive
                                                                        : ''
                                                                }`}
                                                                onMouseEnter={() => {
                                                                    setHoveredCat(
                                                                        filt.cat
                                                                    );
                                                                    setHoveredSubKey(
                                                                        sub.key
                                                                    );
                                                                    queueScrollToSection(
                                                                        sub.key
                                                                    );
                                                                }}
                                                                onClick={() => {
                                                                    if (
                                                                        !sub.checked
                                                                    ) {
                                                                        queueScrollToSection(
                                                                            sub.key
                                                                        );
                                                                    }
                                                                    setTimelineFilters(
                                                                        (
                                                                            prev
                                                                        ) =>
                                                                            prev.map(
                                                                                (
                                                                                    item
                                                                                ) =>
                                                                                    item.cat ===
                                                                                    filt.cat
                                                                                        ? {
                                                                                              ...item,
                                                                                              subCat: item.subCat?.map(
                                                                                                  (
                                                                                                      sc
                                                                                                  ) =>
                                                                                                      sc.key ===
                                                                                                      sub.key
                                                                                                          ? {
                                                                                                                ...sc,
                                                                                                                checked:
                                                                                                                    !sc.checked,
                                                                                                            }
                                                                                                          : sc
                                                                                              ),
                                                                                          }
                                                                                        : item
                                                                            )
                                                                    );
                                                                }}
                                                            >
                                                                <span
                                                                    className={`${styles.nodeIndicator} ${
                                                                        sub.checked
                                                                            ? styles.nodeIndicatorActive
                                                                            : ''
                                                                    }`}
                                                                >
                                                                    {sub.checked && (
                                                                        <span
                                                                            className={
                                                                                styles.nodeIndicatorActiveCheck
                                                                            }
                                                                        />
                                                                    )}
                                                                </span>
                                                                <span>
                                                                    {sub.key}
                                                                </span>
                                                            </div>
                                                        ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                    {canScrollRight && (
                        <div
                            className={`${styles.circleBlurContainer} ${styles.circleBlurRight}`}
                        >
                            <button
                                type="button"
                                aria-label="Scroll right"
                                className={styles.navScrollBtn}
                                onClick={() => handleScrollBy(200)}
                            >
                                <IconChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {openTabsOpen &&
                createPortal(
                    <div
                        className={styles.openTabsPopover}
                        style={{
                            left: popoverPos.left,
                            top: popoverPos.top - 8,
                        }}
                        onMouseEnter={cancelOpenTabsClose}
                        onMouseLeave={scheduleOpenTabsClose}
                        role="tooltip"
                    >
                        <div className={styles.openTabsPopoverHeader}>
                            Open tabs ({tabs.length})
                        </div>
                        {tabs.length === 0 ? (
                            <div className={styles.openTabsPopoverEmpty}>
                                No tabs open
                            </div>
                        ) : (
                            <div className={styles.openTabsPopoverList}>
                                {tabs.map((tab) => (
                                    <div
                                        key={tab.id}
                                        className={styles.openTabsPopoverItem}
                                        title={tab.name}
                                    >
                                        <span
                                            className={`${styles.openTabsPopoverDot} ${
                                                tab.isModified
                                                    ? styles.openTabsPopoverDotActive
                                                    : ''
                                            }`}
                                        />
                                        <span
                                            className={
                                                styles.openTabsPopoverName
                                            }
                                        >
                                            {tab.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>,
                    document.body
                )}
        </div>
    );
}

export default TimelineBottomDock;
