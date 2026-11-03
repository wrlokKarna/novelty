import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import styles from './TimelineBottomDock.module.css';
import type { timelineFilterBtn } from '@/shared/types/timeline';

import type { CompendiumDataType } from '@/shared/types/project/compendium';
import type { ManuscriptDataType } from '@/shared/types/project/manuscript';
type Props = {
    hasAnySelected: boolean;
    handleToggleAllOrClear: () => void;
    openTabsChecked: boolean;
    setOpenTabsChecked: React.Dispatch<React.SetStateAction<boolean>>;
    handleChipHover: (chip: string, cat?: boolean | undefined) => void;
    timelineFilters: timelineFilterBtn[];
    setTimelineFilters: React.Dispatch<
        React.SetStateAction<timelineFilterBtn[]>
    >;
    expandedCat: string;
    hoveredCat: string;
    toggleExpand: (cat: string) => void;
    manuscriptData: ManuscriptDataType;
    compendiumData: CompendiumDataType;
};

function TimelineBottomDock({
    hasAnySelected,
    handleToggleAllOrClear,
    openTabsChecked,
    setOpenTabsChecked,
    handleChipHover,
    timelineFilters,
    setTimelineFilters,
    expandedCat,
    hoveredCat,
    toggleExpand,
    manuscriptData,
    compendiumData,
}: Props) {
    console.log(manuscriptData, compendiumData);

    return (
        <div
            className={`${styles.TimelineBottomDock} ${styles.bottomFilterBar}`}
            onWheel={(e) => {
                if (e.deltaY !== 0) {
                    e.preventDefault();
                    e.currentTarget.scrollLeft += e.deltaY;
                }
            }}
        >
            <div className={styles.primaryFilterGroup}>
                {/* Clear / All Toggle Button (No circle/checkbox) */}
                <button
                    type="button"
                    className={`${styles.clearAllBtn} ${hasAnySelected ? styles.clearActive : ''}`}
                    onClick={handleToggleAllOrClear}
                >
                    {hasAnySelected ? 'Clear' : 'All'}
                </button>

                <span className={styles.filterDivider}>|</span>

                {/* Opened Tabs Pill */}
                <div
                    className={`${styles.filterCheckboxItem} ${
                        openTabsChecked ? styles.highlightedPill : ''
                    }`}
                    onClick={() => setOpenTabsChecked((prev) => !prev)}
                    onMouseEnter={() => handleChipHover('opened tabs', true)}
                    onMouseLeave={() => handleChipHover('', true)}
                >
                    {/* ADD THIS INDICATOR */}
                    <span
                        className={`${styles.nodeIndicator} ${
                            openTabsChecked ? styles.nodeIndicatorActive : ''
                        }`}
                    >
                        {openTabsChecked && (
                            <span className={styles.nodeIndicatorActiveCheck} />
                        )}
                    </span>

                    <span>Opened Tabs</span>
                </div>
                {/* Filter Categories: Manuscript & Compendium */}
                {timelineFilters
                    .filter((filt) => filt.cat !== 'opened tabs')
                    .map((filt) => {
                        const hasCheckedSubs =
                            (filt.subCat?.filter((sub) => sub.checked) ?? [])
                                .length > 0;
                        const isExpanded =
                            expandedCat === filt.cat || hoveredCat === filt.cat;

                        return (
                            <div
                                key={filt.cat}
                                className={styles.categoryWrapper}
                                onMouseEnter={() =>
                                    handleChipHover(filt.cat, true)
                                }
                                onMouseLeave={() => handleChipHover('', true)}
                            >
                                {/* Main Pill: Manuscript / Compendium */}
                                <div
                                    className={`${styles.filterCheckboxItem} ${
                                        hasCheckedSubs
                                            ? styles.highlightedPill
                                            : ''
                                    }`}
                                    onMouseEnter={() => toggleExpand(filt.cat)}
                                    onMouseLeave={() => toggleExpand('')}
                                >
                                    <span>{filt.cat}</span>

                                    {filt.subCat &&
                                        (isExpanded ? (
                                            <IconChevronLeft
                                                size={15}
                                                className={styles.chevronIcon}
                                            />
                                        ) : (
                                            <IconChevronRight
                                                size={15}
                                                className={styles.chevronIcon}
                                            />
                                        ))}
                                </div>

                                {/* Options placed horizontally beside */}
                                {filt.subCat && (
                                    <div
                                        className={
                                            styles.horizontalOptionsTrack
                                        }
                                    >
                                        {filt.subCat
                                            .filter(
                                                (sub) =>
                                                    sub.checked || isExpanded
                                            )
                                            .map((sub) => (
                                                <div
                                                    key={sub.key}
                                                    className={`${styles.subCheckboxItem} ${
                                                        sub.checked
                                                            ? styles.subActive
                                                            : ''
                                                    }`}
                                                    onMouseEnter={() =>
                                                        handleChipHover(sub.key)
                                                    }
                                                    onMouseLeave={() =>
                                                        handleChipHover('')
                                                    }
                                                    onClick={() =>
                                                        setTimelineFilters(
                                                            (prev) =>
                                                                prev.map(
                                                                    (item) =>
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
                                                        )
                                                    }
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
                                                    <span>{sub.key}</span>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}

export default TimelineBottomDock;
