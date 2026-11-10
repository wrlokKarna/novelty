import React, {
    useState,
    useEffect,
    useCallback,
    useRef,
    type PointerEvent as ReactPointerEvent,
} from 'react';
import { useRPC } from '../contexts/RPCContext';
import { useCollapseState } from '../hooks/useCollapseState';
import {
    IconPlus,
    IconTrash,
    IconGripVertical,
    IconChevronDown,
    IconChevronRight,
    IconRefresh,
} from '@tabler/icons-react';
import SceneCardEditor from './SceneCardEditor';
import type { StoryAct, StorySequence } from '../../shared/types';
import type { Chapter } from '../../shared/types/project';
import type { Character } from '../../shared/types/project/compendium';
import type {
    PlotThread,
    StoryBeat,
    StoryScene,
} from '../../shared/types/project/manuscript';

interface EntityItem {
    id: string;
    name: string;
    category?: string;
}

type MentionCategory =
    | 'Chapter'
    | 'Character'
    | 'Location'
    | 'Organization'
    | 'Item'
    | 'Lore';

interface Props {
    projectId: string;
    chapters: Chapter[];
    characters: Character[];
    locations?: EntityItem[];
    organizations?: EntityItem[];
    items?: EntityItem[];
    lore?: EntityItem[];
    onNavigateChapter: (chapterId: string) => void;
    onSelectCharacter?: (characterId: string) => void;
    onSelectLocation?: (locationName: string) => void;
    onSelectCategory?: (category: string) => void;
    onSelectSidebarChapter?: (chapterId: string) => void;
    onSelectSidebarEntity?: (entityName: string, category: string) => void;
    onDataChange?: () => void;
}

interface MentionOption {
    id: string;
    name: string;
    category?: string;
    type?: 'category' | 'entity' | 'chapter' | 'create';
    targetCategory?: MentionCategory;
}

interface BeatDescriptionMentionInputProps {
    value: string;
    onChange: (newValue: string) => void;
    chapters: Chapter[];
    characters: Character[];
    locations: EntityItem[];
    organizations: EntityItem[];
    items: EntityItem[];
    lore: EntityItem[];
    pendingEntities: Record<string, MentionCategory>;
    knownCategoryMap: Record<string, MentionCategory>;
    onRegisterPending: (name: string, category: MentionCategory) => void;
    onRegisterKnownCategory: (name: string, category: MentionCategory) => void;
    onRemovePending: (name: string) => void;
    onCreateAndOpenEntity: (
        name: string,
        category: MentionCategory
    ) => Promise<void>;
    onNavigateChapter?: (id: string) => void;
    onSelectCharacter?: (id: string) => void;
    onSelectLocation?: (name: string) => void;
    onSelectCategory?: (category: string) => void;
    onSelectSidebarChapter?: (id: string) => void;
    onSelectSidebarEntity?: (name: string, category: string) => void;
    placeholder?: string;
}

function normalizeEntities(rawList: any[], categoryLabel: string): EntityItem[] {
    if (!Array.isArray(rawList)) return [];
    return rawList
        .map((item, idx) => ({
            id: String(item?.id || `${categoryLabel}-${idx}`),
            name: String(item?.name || item?.title || '').trim(),
            category: categoryLabel,
        }))
        .filter((item) => item.name.length > 0);
}

// సైడ్ బార్ క్లోజ్ అయి ఉన్నా సరే ఆటోమేటిక్ గా ఓపెన్ చేసి, సంబంధిత ట్యాబ్ & ఐటమ్ ని సెలెక్ట్ చేసే ఫంక్షన్
function openInLeftSidebar(
    targetCategory: MentionCategory,
    specificItemName?: string,
    specificItemId?: string,
    triggerNewButtonIfMissing: boolean = false
) {
    // 1. గ్లోబల్ కస్టమ్ ఈవెంట్స్ డిస్పాచ్ చేయి
    window.dispatchEvent(
        new CustomEvent('novelty:open-sidebar', {
            detail: {
                category: targetCategory,
                itemName: specificItemName,
                itemId: specificItemId,
                forceExpand: true,
            },
        })
    );

    // 2. సైడ్ బార్ క్లోజ్ (Collapse) అయి ఉందో లేదో చెక్ చేయి
    const checkIsSidebarOpen = () => {
        const els = Array.from(
            document.querySelectorAll('button, [role="tab"], [role="button"], span, div')
        ) as HTMLElement[];
        return els.some((el) => {
            if (el.children.length > 0) return false;
            const txt = el.textContent?.trim().toLowerCase();
            if (txt !== 'manuscript' && txt !== 'compendium') return false;
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && rect.left >= 0 && rect.left < 320;
        });
    };

    let needsDelayForExpand = false;

    if (!checkIsSidebarOpen()) {
        needsDelayForExpand = true;
        const allCandidates = Array.from(
            document.querySelectorAll('button, [role="button"], div, span, svg')
        ) as HTMLElement[];

        // A. టాప్ బార్ లో లేదా లెఫ్ట్ ఎడ్జ్ లో ఉన్న Sidebar Toggle / Expand బటన్ ని వెతుకు
        const expandBtn = allCandidates.find((el) => {
            if (el.closest('.plot-architecture-view')) return false;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return false;

            const title = (
                el.getAttribute('title') ||
                el.getAttribute('aria-label') ||
                el.className?.toString() ||
                ''
            ).toLowerCase();

            // లెఫ్ట్ సైడ్ ఎడ్జ్ లో ఉండే `>` ఆరో బటన్ (x < 40, middle of screen)
            const isLeftEdgeArrow =
                rect.left >= 0 &&
                rect.left <= 36 &&
                rect.width <= 44 &&
                rect.height <= 80 &&
                rect.top > 120 &&
                rect.top < window.innerHeight - 80;

            const isExplicitSidebarToggle =
                title.includes('sidebar') ||
                title.includes('left-panel') ||
                title.includes('expand') ||
                title.includes('drawer');

            return isLeftEdgeArrow || isExplicitSidebarToggle;
        });

        if (expandBtn) {
            const clickable =
                (expandBtn.closest('button, [role="button"]') as HTMLElement) ||
                expandBtn;
            clickable.click();
        } else {
            // B. ఒకవేళ టాప్ రైట్ టూల్ బార్ లో లెఫ్ట్ సైడ్ బార్ ఐకాన్ ఉంటే (PLOT / SKELETON / ANALYZE పక్కన ఉండే మొదటి ఐకాన్)
            const topBarButtons = Array.from(
                document.querySelectorAll('button, [role="button"]')
            ) as HTMLElement[];
            const analyzeBtn = topBarButtons.find(
                (b) => b.textContent?.trim().toUpperCase() === 'ANALYZE'
            );
            if (analyzeBtn) {
                const analyzeRect = analyzeBtn.getBoundingClientRect();
                const sidebarIconBtn = topBarButtons.find((b) => {
                    const r = b.getBoundingClientRect();
                    return (
                        Math.abs(r.top - analyzeRect.top) < 20 &&
                        r.left > analyzeRect.right &&
                        r.left < analyzeRect.right + 65
                    );
                });
                if (sidebarIconBtn) sidebarIconBtn.click();
            }
        }
    }

    const baseDelay = needsDelayForExpand ? 160 : 20;

    setTimeout(() => {
        const allClickable = Array.from(
            document.querySelectorAll(
                'button, [role="tab"], [role="button"], a, li, div, span'
            )
        ) as HTMLElement[];

        if (targetCategory === 'Chapter') {
            const manuscriptBtn = allClickable.find((el) => {
                const rect = el.getBoundingClientRect();
                return (
                    rect.width > 0 &&
                    rect.left < 350 &&
                    el.children.length === 0 &&
                    el.textContent?.trim().toLowerCase() === 'manuscript'
                );
            });
            if (manuscriptBtn) manuscriptBtn.click();

            setTimeout(() => {
                const refreshed = Array.from(
                    document.querySelectorAll('button, a, li, div, span')
                ) as HTMLElement[];
                const chapEl = refreshed.find((el) => {
                    if (el.closest('.plot-architecture-view')) return false;
                    const rect = el.getBoundingClientRect();
                    return (
                        rect.width > 0 &&
                        rect.left < 350 &&
                        rect.top > 70 &&
                        rect.top < window.innerHeight - 90 &&
                        el.children.length === 0 &&
                        specificItemName &&
                        el.textContent?.trim().toLowerCase() ===
                            specificItemName.toLowerCase()
                    );
                });
                if (chapEl) {
                    chapEl.click();
                } else if (triggerNewButtonIfMissing) {
                    const newChapBtn = refreshed.find((el) => {
                        const rect = el.getBoundingClientRect();
                        return (
                            rect.width > 0 &&
                            rect.left < 350 &&
                            el.textContent?.toLowerCase().includes('new chapter')
                        );
                    });
                    if (newChapBtn) newChapBtn.click();
                }
            }, 90);
            return;
        }

        // Compendium ట్యాబ్ ని క్లిక్ చేయి
        const compendiumBtn = allClickable.find((el) => {
            const rect = el.getBoundingClientRect();
            return (
                rect.width > 0 &&
                rect.left < 350 &&
                el.children.length === 0 &&
                el.textContent?.trim().toLowerCase() === 'compendium'
            );
        });
        if (compendiumBtn) compendiumBtn.click();

        setTimeout(() => {
            const toolbarButtons = Array.from(
                document.querySelectorAll('button, [role="button"]')
            ) as HTMLElement[];

            const bottomToolbarButtons = toolbarButtons.filter((btn) => {
                if (btn.closest('.plot-architecture-view')) return false;
                const rect = btn.getBoundingClientRect();
                const txt = btn.textContent?.trim().toLowerCase() || '';
                if (txt === 'manuscript' || txt === 'compendium') return false;
                return (
                    rect.width > 0 &&
                    rect.left >= 0 &&
                    rect.left < 300 &&
                    rect.top > window.innerHeight - 160 &&
                    rect.top < window.innerHeight - 40
                );
            });

            const categoryMap: Record<string, number> = {
                character: 0,
                location: 1,
                organization: 2,
                item: 3,
                lore: 4,
            };

            const targetIndex = categoryMap[targetCategory.toLowerCase()];
            if (
                targetIndex !== undefined &&
                bottomToolbarButtons[targetIndex]
            ) {
                bottomToolbarButtons[targetIndex].click();
            } else {
                const allIcons = Array.from(
                    document.querySelectorAll('svg, button')
                ) as HTMLElement[];
                const matchingIcon = allIcons.find((el) => {
                    const label = (
                        el.getAttribute('title') ||
                        el.getAttribute('aria-label') ||
                        el.textContent ||
                        ''
                    ).toLowerCase();
                    return label.includes(targetCategory.toLowerCase());
                });
                if (matchingIcon) {
                    const clickableParent =
                        matchingIcon.closest('button, [role="button"]') ||
                        matchingIcon;
                    (clickableParent as HTMLElement).click();
                }
            }

            if (specificItemName) {
                setTimeout(() => {
                    // 1. లెఫ్ట్ సైడ్ బార్ లిస్ట్ లో ఉన్న ఎంట్రీని సెలెక్ట్ చేసి క్లిక్ చేయి
                    const itemElements = Array.from(
                        document.querySelectorAll('button, a, li, div, span')
                    ) as HTMLElement[];
                    const targetItemEl = itemElements.find((el) => {
                        if (el.closest('.plot-architecture-view')) return false;
                        const rect = el.getBoundingClientRect();
                        return (
                            rect.width > 0 &&
                            rect.left >= 0 &&
                            rect.left < 350 &&
                            rect.top > 80 &&
                            rect.top < window.innerHeight - 110 &&
                            el.children.length === 0 &&
                            el.textContent?.trim().toLowerCase() ===
                                specificItemName.toLowerCase()
                        );
                    });

                    if (targetItemEl) {
                        targetItemEl.click();
                        const parentRow = targetItemEl.closest(
                            'li, button, [role="button"], a, div'
                        ) as HTMLElement | null;
                        if (parentRow && parentRow !== targetItemEl) {
                            parentRow.click();
                        }
                    } else if (triggerNewButtonIfMissing) {
                        const newBtn = itemElements.find((el) => {
                            const rect = el.getBoundingClientRect();
                            return (
                                rect.width > 0 &&
                                rect.left < 350 &&
                                el.textContent
                                    ?.toLowerCase()
                                    .includes('+ new')
                            );
                        });
                        if (newBtn) newBtn.click();
                    }

                    // 2. టాప్ బార్ లో ఆల్రెడీ ఆ ట్యాబ్ ఓపెన్ అయి ఉంటే దాన్ని కూడా ఆక్టివేట్ చేయి
                    const topTabEl = itemElements.find((el) => {
                        if (el.closest('.plot-architecture-view')) return false;
                        const rect = el.getBoundingClientRect();
                        return (
                            rect.width > 0 &&
                            rect.top >= 25 &&
                            rect.top <= 95 &&
                            rect.left > 180 &&
                            el.children.length === 0 &&
                            el.textContent?.trim().toLowerCase() ===
                                specificItemName.toLowerCase()
                        );
                    });
                    if (topTabEl) {
                        const clickableTab =
                            (topTabEl.closest(
                                'button, [role="tab"], [role="button"], div'
                            ) as HTMLElement) || topTabEl;
                        clickableTab.click();
                    }
                }, 110);
            }
        }, 80);
    }, baseDelay);
}

function parseColonCommand(rawQuery: string): {
    category: MentionCategory;
    prefix: string;
    name: string;
} | null {
    const match = rawQuery.match(
        /^(chapter|chap|character|char|location|loc|organization|org|item|lore):(.*)$/i
    );
    if (!match) return null;
    const rawCat = match[1].toLowerCase();
    const name = match[2];

    let category: MentionCategory = 'Lore';
    if (rawCat.startsWith('chap')) category = 'Chapter';
    else if (rawCat.startsWith('char')) category = 'Character';
    else if (rawCat.startsWith('loc')) category = 'Location';
    else if (rawCat.startsWith('org')) category = 'Organization';
    else if (rawCat === 'item') category = 'Item';
    else if (rawCat === 'lore') category = 'Lore';

    return {
        category,
        prefix: `${match[1]}:`,
        name,
    };
}

function BeatDescriptionMentionInput({
    value,
    onChange,
    chapters,
    characters,
    locations,
    organizations,
    items,
    lore,
    pendingEntities,
    knownCategoryMap,
    onRegisterPending,
    onRegisterKnownCategory,
    onCreateAndOpenEntity,
    onNavigateChapter,
    onSelectCharacter,
    onSelectLocation,
    onSelectCategory,
    onSelectSidebarChapter,
    onSelectSidebarEntity,
    placeholder = 'Description... (Type @ to mention)',
}: BeatDescriptionMentionInputProps) {
    const [text, setText] = useState<string>(value || '');
    const [showOptions, setShowOptions] = useState<boolean>(false);
    const [query, setQuery] = useState<string>('');
    const [mentionIndex, setMentionIndex] = useState<number | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [dropdownCoords, setDropdownCoords] = useState<{
        top: number;
        left: number;
    }>({
        top: 28,
        left: 8,
    });

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const backdropRef = useRef<HTMLDivElement | null>(null);
    const atMarkerRef = useRef<HTMLSpanElement | null>(null);

    useEffect(() => {
        setText(value || '');
    }, [value]);

    const doesEntityExist = (
        name: string,
        category?: MentionCategory
    ): boolean => {
        const lower = name.trim().toLowerCase();
        if (!lower) return false;

        if (!category || category === 'Chapter') {
            if ((chapters || []).some((c) => c.title.toLowerCase() === lower))
                return true;
        }
        if (!category || category === 'Character') {
            if ((characters || []).some((c) => c.name.toLowerCase() === lower))
                return true;
        }
        if (!category || category === 'Location') {
            if ((locations || []).some((l) => l.name.toLowerCase() === lower))
                return true;
        }
        if (!category || category === 'Organization') {
            if (
                (organizations || []).some(
                    (o) => o.name.toLowerCase() === lower
                )
            )
                return true;
        }
        if (!category || category === 'Item') {
            if ((items || []).some((i) => i.name.toLowerCase() === lower))
                return true;
        }
        if (!category || category === 'Lore') {
            if ((lore || []).some((lr) => lr.name.toLowerCase() === lower))
                return true;
        }
        return false;
    };

    const getDynamicOptions = (): MentionOption[] => {
        const lowerQuery = query.toLowerCase();
        const parsed = parseColonCommand(query);

        if (parsed) {
            const searchTerm = parsed.name.trim().toLowerCase();
            let sourceList: { id: string; name: string }[] = [];
            const badge = parsed.category.toUpperCase();
            const optType: 'chapter' | 'entity' =
                parsed.category === 'Chapter' ? 'chapter' : 'entity';

            if (parsed.category === 'Chapter') {
                sourceList = (chapters || []).map((c) => ({
                    id: c.id,
                    name: c.title,
                }));
            } else if (parsed.category === 'Character') {
                sourceList = (characters || []).map((ch) => ({
                    id: ch.id,
                    name: ch.name,
                }));
            } else if (parsed.category === 'Location') {
                sourceList = locations || [];
            } else if (parsed.category === 'Organization') {
                sourceList = organizations || [];
            } else if (parsed.category === 'Item') {
                sourceList = items || [];
            } else if (parsed.category === 'Lore') {
                sourceList = lore || [];
            }

            const matched = sourceList
                .filter(
                    (entry) =>
                        !searchTerm ||
                        entry.name.toLowerCase().includes(searchTerm)
                )
                .map((entry) => ({
                    id: entry.id,
                    name: entry.name,
                    category: badge,
                    type: optType,
                    targetCategory: parsed.category,
                }));

            const cleanName = parsed.name.trim();
            if (
                cleanName &&
                !sourceList.some(
                    (e) => e.name.toLowerCase() === cleanName.toLowerCase()
                )
            ) {
                return [
                    {
                        id: `create-${parsed.category}-${cleanName}`,
                        name: cleanName,
                        category: `NEW ${badge}`,
                        type: 'create',
                        targetCategory: parsed.category,
                    },
                    ...matched,
                ];
            }

            return matched;
        }

        const allEntities: MentionOption[] = [
            ...(chapters || []).map((c) => ({
                id: c.id,
                name: c.title,
                category: 'CHAPTER',
                type: 'chapter' as const,
                targetCategory: 'Chapter' as const,
            })),
            ...(characters || []).map((ch) => ({
                id: ch.id,
                name: ch.name,
                category: 'CHARACTER',
                type: 'entity' as const,
                targetCategory: 'Character' as const,
            })),
            ...(locations || []).map((l) => ({
                id: l.id,
                name: l.name,
                category: 'LOCATION',
                type: 'entity' as const,
                targetCategory: 'Location' as const,
            })),
            ...(organizations || []).map((o) => ({
                id: o.id,
                name: o.name,
                category: 'ORGANIZATION',
                type: 'entity' as const,
                targetCategory: 'Organization' as const,
            })),
            ...(items || []).map((i) => ({
                id: i.id,
                name: i.name,
                category: 'ITEM',
                type: 'entity' as const,
                targetCategory: 'Item' as const,
            })),
            ...(lore || []).map((lr) => ({
                id: lr.id,
                name: lr.name,
                category: 'LORE',
                type: 'entity' as const,
                targetCategory: 'Lore' as const,
            })),
        ];

        if (!lowerQuery) return allEntities;

        return allEntities.filter((item) =>
            item.name.toLowerCase().includes(lowerQuery)
        );
    };

    const filteredOptions = getDynamicOptions();

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    const updateDropdownPosition = () => {
        if (atMarkerRef.current && backdropRef.current) {
            const top =
                atMarkerRef.current.offsetTop -
                backdropRef.current.scrollTop +
                atMarkerRef.current.offsetHeight +
                4;
            const left =
                atMarkerRef.current.offsetLeft - backdropRef.current.scrollLeft;

            setDropdownCoords({ top, left });
        }
    };

    useEffect(() => {
        if (showOptions) {
            updateDropdownPosition();
        }
    }, [text, showOptions, mentionIndex, query]);

    const handleScroll = () => {
        if (textareaRef.current && backdropRef.current) {
            backdropRef.current.scrollTop = textareaRef.current.scrollTop;
            backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
            if (showOptions) {
                updateDropdownPosition();
            }
        }
    };

    const checkTrigger = (val: string, cursorPos: number) => {
        const textBeforeCursor = val.slice(0, cursorPos);
        const lastAtPos = textBeforeCursor.lastIndexOf('@');

        if (lastAtPos !== -1) {
            // `@` కి ముందు స్పేస్ లేదా లైన్ స్టార్ట్ ఉంటేనే ట్రిగ్గర్ అవ్వాలి
            const charBeforeAt = lastAtPos > 0 ? textBeforeCursor[lastAtPos - 1] : ' ';
            if (/\s/.test(charBeforeAt)) {
                const currentQuery = textBeforeCursor.slice(lastAtPos + 1);
                // క్వెరీలో స్పేస్ లేదా న్యూలైన్ లేనంత వరకు అది యాక్టివ్ టైపింగ్ క్వెరీగా పరిగణించబడుతుంది
                if (!currentQuery.includes('\n') && !currentQuery.includes(' ')) {
                    setShowOptions(true);
                    setQuery(currentQuery);
                    setMentionIndex(lastAtPos);
                    return;
                }
            }
        }

        setShowOptions(false);
        setQuery('');
        setMentionIndex(null);
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        const cursorPos = e.target.selectionStart ?? val.length;
        setText(val);
        onChange(val);
        checkTrigger(val, cursorPos);
    };

    const finalizeColonMention = (
        entityName: string,
        category: MentionCategory,
        appendSpace: boolean = true
    ) => {
        if (mentionIndex === null || !textareaRef.current) return;

        const cleanName = entityName.trim();
        if (!cleanName) return;

        onRegisterKnownCategory(cleanName, category);

        if (!doesEntityExist(cleanName, category)) {
            onRegisterPending(cleanName, category);
        }

        const cursorPos = textareaRef.current.selectionStart ?? text.length;
        const beforeMention = text.slice(0, mentionIndex);
        const afterMention = text.slice(cursorPos);

        const needsLeadingSpace =
            beforeMention.length > 0 && !/\s$/.test(beforeMention);
        const leadingSpace = needsLeadingSpace ? ' ' : '';
        const trailingSpace = appendSpace ? ' ' : '';
        const insertStr = `${leadingSpace}${cleanName}${trailingSpace}`;

        const updatedText = `${beforeMention}${insertStr}${afterMention}`;
        setText(updatedText);
        onChange(updatedText);
        setShowOptions(false);
        setQuery('');
        setMentionIndex(null);

        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                const newPos = beforeMention.length + insertStr.length;
                textareaRef.current.setSelectionRange(newPos, newPos);
            }
        }, 0);
    };

    const selectOption = (option: MentionOption) => {
        if (mentionIndex === null || !textareaRef.current) return;

        if (option.category === 'COMMAND') {
            const cursorPos = textareaRef.current.selectionStart ?? text.length;
            const beforeMention = text.slice(0, mentionIndex);
            const afterMention = text.slice(cursorPos);
            const updatedText = `${beforeMention}@${option.name}${afterMention}`;
            setText(updatedText);
            onChange(updatedText);
            setQuery(option.name);
            setShowOptions(true);

            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    const newPos =
                        beforeMention.length + option.name.length + 1;
                    textareaRef.current.setSelectionRange(newPos, newPos);
                }
            }, 0);
            return;
        }

        if (option.targetCategory) {
            onRegisterKnownCategory(option.name, option.targetCategory);
        }

        if (option.type === 'create' && option.targetCategory) {
            finalizeColonMention(option.name, option.targetCategory, true);
            return;
        }

        const cursorPos = textareaRef.current.selectionStart ?? text.length;
        const beforeMention = text.slice(0, mentionIndex);
        const afterMention = text.slice(cursorPos);

        const needsLeadingSpace =
            beforeMention.length > 0 && !/\s$/.test(beforeMention);
        const leadingSpace = needsLeadingSpace ? ' ' : '';
        const insertName = `${leadingSpace}${option.name} `;
        const updatedText = `${beforeMention}${insertName}${afterMention}`;
        setText(updatedText);
        onChange(updatedText);
        setShowOptions(false);
        setQuery('');
        setMentionIndex(null);

        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                const newPos = beforeMention.length + insertName.length;
                textareaRef.current.setSelectionRange(newPos, newPos);
            }
        }, 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (
            (e.key === ' ' || e.key === 'Enter') &&
            showOptions &&
            mentionIndex !== null
        ) {
            const parsed = parseColonCommand(query);
            if (parsed && parsed.name.trim().length > 0) {
                e.preventDefault();
                if (
                    e.key === 'Enter' &&
                    filteredOptions[selectedIndex] &&
                    filteredOptions[selectedIndex].type !== 'create'
                ) {
                    selectOption(filteredOptions[selectedIndex]);
                } else {
                    finalizeColonMention(
                        parsed.name.trim(),
                        parsed.category,
                        true
                    );
                }
                return;
            }
        }

        if (e.key === 'Backspace' && textareaRef.current && !showOptions) {
            const cursorPos = textareaRef.current.selectionStart;
            const selectionEnd = textareaRef.current.selectionEnd;

            if (cursorPos !== selectionEnd) {
                return;
            }

            const allKnownNames = [
                ...(characters || []).map((c) => c.name),
                ...(chapters || []).map((c) => c.title),
                ...(locations || []).map((l) => l.name),
                ...(organizations || []).map((o) => o.name),
                ...(items || []).map((i) => i.name),
                ...(lore || []).map((lr) => lr.name),
                ...Object.keys(pendingEntities),
                ...Object.keys(knownCategoryMap),
            ].sort((a, b) => b.length - a.length);

            for (const name of allKnownNames) {
                const nameIndex = text.lastIndexOf(name, cursorPos);
                if (
                    nameIndex !== -1 &&
                    cursorPos > nameIndex &&
                    cursorPos <= nameIndex + name.length + 1
                ) {
                    const charBefore =
                        nameIndex > 0 ? text[nameIndex - 1] : ' ';
                    const charAfter =
                        nameIndex + name.length < text.length
                            ? text[nameIndex + name.length]
                            : ' ';
                    if (/\s/.test(charBefore) && /\s/.test(charAfter)) {
                        e.preventDefault();
                        const updatedText =
                            text.slice(0, nameIndex) +
                            text.slice(nameIndex + name.length);
                        setText(updatedText);
                        onChange(updatedText);
                        setTimeout(() => {
                            if (textareaRef.current) {
                                textareaRef.current.setSelectionRange(
                                    nameIndex,
                                    nameIndex
                                );
                            }
                        }, 0);
                        return;
                    }
                }
            }
        }

        if (!showOptions || filteredOptions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % filteredOptions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(
                (prev) =>
                    (prev - 1 + filteredOptions.length) % filteredOptions.length
            );
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            selectOption(filteredOptions[selectedIndex]);
        } else if (e.key === 'Escape') {
            setShowOptions(false);
        }
    };

    // ఏదైనా లింక్ (`lore22`, `1`, `5`, etc.) మీద క్లిక్ చేసినప్పుడు Sidebar (క్లోజ్ అయి ఉన్నా ఓపెన్ చేసి) + Top Bar రెండింటిలోనూ ఓపెన్ చేస్తుంది!
    const handleMentionClick = async (part: string) => {
        const cleanPart = part.trim();
        const lowerPart = cleanPart.toLowerCase();

        // 1. ముందుగా ఈ ఎంట్రీకి మనం సేవ్ చేసిన ఖచ్చితమైన కేటగిరీ ఉందేమో చెక్ చేయి
        const savedCatKey = Object.keys(knownCategoryMap).find(
            (k) => k.toLowerCase() === lowerPart
        );
        const preferredCategory = savedCatKey
            ? knownCategoryMap[savedCatKey]
            : undefined;

        const openMatchedByCategory = (cat: MentionCategory): boolean => {
            if (cat === 'Chapter') {
                const matched = (chapters || []).find(
                    (c) => c.title.toLowerCase() === lowerPart
                );
                if (matched) {
                    openInLeftSidebar('Chapter', matched.title, matched.id);
                    onSelectSidebarChapter?.(matched.id);
                    onNavigateChapter?.(matched.id);
                    return true;
                }
            } else if (cat === 'Character') {
                const matched = (characters || []).find(
                    (ch) => ch.name.toLowerCase() === lowerPart
                );
                if (matched) {
                    openInLeftSidebar('Character', matched.name, matched.id);
                    onSelectCategory?.('Character');
                    onSelectSidebarEntity?.(matched.name, 'Character');
                    onSelectCharacter?.(matched.id);
                    return true;
                }
            } else if (cat === 'Lore') {
                const matched = (lore || []).find(
                    (lr) => lr.name.toLowerCase() === lowerPart
                );
                if (matched) {
                    openInLeftSidebar('Lore', matched.name, matched.id);
                    onSelectCategory?.('Lore');
                    onSelectSidebarEntity?.(matched.name, 'Lore');
                    return true;
                }
            } else if (cat === 'Location') {
                const matched = (locations || []).find(
                    (l) => l.name.toLowerCase() === lowerPart
                );
                if (matched) {
                    openInLeftSidebar('Location', matched.name, matched.id);
                    onSelectCategory?.('Location');
                    onSelectSidebarEntity?.(matched.name, 'Location');
                    onSelectLocation?.(matched.name);
                    return true;
                }
            } else if (cat === 'Organization') {
                const matched = (organizations || []).find(
                    (o) => o.name.toLowerCase() === lowerPart
                );
                if (matched) {
                    openInLeftSidebar('Organization', matched.name, matched.id);
                    onSelectCategory?.('Organization');
                    onSelectSidebarEntity?.(matched.name, 'Organization');
                    return true;
                }
            } else if (cat === 'Item') {
                const matched = (items || []).find(
                    (i) => i.name.toLowerCase() === lowerPart
                );
                if (matched) {
                    openInLeftSidebar('Item', matched.name, matched.id);
                    onSelectCategory?.('Item');
                    onSelectSidebarEntity?.(matched.name, 'Item');
                    return true;
                }
            }
            return false;
        };

        if (preferredCategory && openMatchedByCategory(preferredCategory)) {
            return;
        }

        // 2. అన్ని కేటగిరీలలో చెక్ చేయి
        const categoriesOrder: MentionCategory[] = [
            'Lore',
            'Character',
            'Item',
            'Location',
            'Organization',
            'Chapter',
        ];
        for (const cat of categoriesOrder) {
            if (openMatchedByCategory(cat)) {
                return;
            }
        }

        // 3. ఒకవేళ ఇంకా డేటాబేస్ లో క్రియేట్ అవ్వని ఎంట్రీ (Red లేదా `1`, `5` లాంటివి) అయితే, వెంటనే క్రియేట్ చేసి Sidebar + Top Bar లో ఓపెన్ చేయి!
        const pendingKey = Object.keys(pendingEntities).find(
            (k) => k.toLowerCase() === lowerPart
        );
        const targetCategory: MentionCategory = pendingKey
            ? pendingEntities[pendingKey]
            : preferredCategory || 'Lore';

        await onCreateAndOpenEntity(cleanPart, targetCategory);
    };

    const highlightSegment = (segment: string, keyPrefix: string) => {
        if (!segment) return null;

        const existingNames = [
            ...(characters || []).map((c) => c.name),
            ...(chapters || []).map((c) => c.title),
            ...(locations || []).map((l) => l.name),
            ...(organizations || []).map((o) => o.name),
            ...(items || []).map((i) => i.name),
            ...(lore || []).map((lr) => lr.name),
        ];

        const pendingNames = Object.keys(pendingEntities);
        const knownNames = Object.keys(knownCategoryMap);
        const allKnownNames = [
            ...existingNames,
            ...pendingNames,
            ...knownNames,
        ];

        const escapedNames = Array.from(new Set(allKnownNames))
            .map((name) => name.trim())
            .filter(Boolean)
            .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .sort((a, b) => b.length - a.length);

        if (escapedNames.length === 0) {
            return <span key={keyPrefix}>{segment}</span>;
        }

        // ఖచ్చితమైన Word Boundary (`(?<![\w@:])` మరియు `(?![\w:])`) ఉండటం వల్ల:
        // 1. `@lor` టైప్ చేస్తున్నప్పుడు అందులో ఉన్న `lo` అస్సలు హైలైట్ అవ్వదు!
        // 2. ఒకే లైన్ లో ఉన్న `lore22 1 5` లోని `lore22`, `1`, `5` అన్నీ వేర్వేరుగా హైలైట్ అవుతాయి & క్లిక్ పనిచేస్తుంది!
        const regex = new RegExp(
            `(?<![\\w@:])(${escapedNames.join('|')})(?![\\w:])`,
            'g'
        );
        const parts = segment.split(regex);

        return parts.map((part, index) => {
            // odd indices in split with a single capturing group are the exact matched tokens
            const isMatchedToken = index % 2 === 1;
            if (!isMatchedToken) {
                return <span key={`${keyPrefix}-${index}`}>{part}</span>;
            }

            const existsInDb = existingNames.some(
                (n) => n.toLowerCase() === part.toLowerCase()
            );
            const isPending = pendingNames.some(
                (n) => n.toLowerCase() === part.toLowerCase()
            );
            const isKnown = knownNames.some(
                (n) => n.toLowerCase() === part.toLowerCase()
            );

            if (existsInDb || isPending || isKnown) {
                const linkColor = existsInDb ? '#ff8c00' : '#ef4444';

                return (
                    <span
                        key={`${keyPrefix}-${index}`}
                        onMouseDown={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            await handleMentionClick(part);
                        }}
                        style={{
                            color: linkColor,
                            backgroundColor: 'transparent',
                            textDecoration: 'underline',
                            textDecorationColor: linkColor,
                            textUnderlineOffset: '3px',
                            fontWeight: 'inherit',
                            letterSpacing: 'inherit',
                            cursor: 'pointer',
                            pointerEvents: 'auto',
                            position: 'relative',
                            zIndex: 4,
                        }}
                        title={
                            existsInDb
                                ? `Open ${part} in sidebar & top bar`
                                : `Click to create "${part}" and open in sidebar & top bar`
                        }
                    >
                        {part}
                    </span>
                );
            }
            return <span key={`${keyPrefix}-${index}`}>{part}</span>;
        });
    };

    const renderBackdropContent = () => {
        if (!text) return null;

        // యూజర్ `@` టైప్ చేసి ఇంకా ఎంటర్/స్పేస్ ఇవ్వకుండా టైప్ చేస్తున్నంత సేపు (`@lor`),
        // ఆ యాక్టివ్ `@` పదం అసలు ఆరెంజ్/రెడ్ కలర్ లోకి మారకూడదు, అండర్లైన్ రాకూడదు!
        if (
            showOptions &&
            mentionIndex !== null &&
            text[mentionIndex] === '@'
        ) {
            const beforeAt = text.slice(0, mentionIndex);
            const activeTokenEnd = mentionIndex + 1 + query.length;
            const activeTypingText = text.slice(mentionIndex, activeTokenEnd);
            const afterActiveToken = text.slice(activeTokenEnd);

            return (
                <>
                    {highlightSegment(beforeAt, 'before')}
                    <span
                        ref={atMarkerRef}
                        style={{
                            color: '#d4d4d4',
                            textDecoration: 'none',
                        }}
                    >
                        {activeTypingText}
                    </span>
                    {highlightSegment(afterActiveToken, 'after')}
                </>
            );
        }

        return highlightSegment(text, 'full');
    };

    const sharedTextStyles: React.CSSProperties = {
        width: '100%',
        minHeight: '34px',
        height: '100%',
        padding: '6px 8px',
        fontSize: '13px',
        fontFamily: 'inherit',
        fontWeight: 400,
        letterSpacing: 'normal',
        lineHeight: '1.5',
        boxSizing: 'border-box',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        margin: 0,
        border: '1px solid transparent',
    };

    return (
        <div
            className="beat-desc-mention-wrapper"
            style={{
                position: 'relative',
                width: '100%',
                minHeight: '34px',
            }}
        >
            <style>
                {`
                    .beat-desc-input::selection {
                        background-color: rgba(255, 140, 0, 0.25) !important;
                        color: transparent !important;
                        -webkit-text-fill-color: transparent !important;
                    }
                    .beat-desc-input::-moz-selection {
                        background-color: rgba(255, 140, 0, 0.25) !important;
                        color: transparent !important;
                    }
                `}
            </style>
            <div
                ref={backdropRef}
                style={{
                    ...sharedTextStyles,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    color: '#d4d4d4',
                    pointerEvents: 'none',
                    overflowY: 'auto',
                    zIndex: 3,
                }}
            >
                {renderBackdropContent()}
            </div>

            <textarea
                ref={textareaRef}
                className="beat-desc-input"
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                onScroll={handleScroll}
                onBlur={() => setTimeout(() => setShowOptions(false), 150)}
                onClick={(e) =>
                    checkTrigger(
                        e.currentTarget.value,
                        e.currentTarget.selectionStart ?? 0
                    )
                }
                placeholder={placeholder}
                rows={1}
                style={{
                    ...sharedTextStyles,
                    position: 'relative',
                    backgroundColor: 'transparent',
                    color: 'transparent',
                    WebkitTextFillColor: 'transparent',
                    caretColor: '#ffffff',
                    resize: 'none',
                    overflowY: 'auto',
                    zIndex: 2,
                    display: 'block',
                }}
            />

            {showOptions && filteredOptions.length > 0 && (
                <ul
                    style={{
                        position: 'absolute',
                        top: `${dropdownCoords.top}px`,
                        left: `${dropdownCoords.left}px`,
                        margin: 0,
                        width: '240px',
                        maxHeight: '220px',
                        overflowY: 'auto',
                        backgroundColor: '#222222',
                        border: '1px solid #383838',
                        borderRadius: '8px',
                        padding: '4px',
                        listStyle: 'none',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
                        zIndex: 9999,
                    }}
                >
                    {filteredOptions.map((item, index) => (
                        <li
                            key={item.id}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                selectOption(item);
                            }}
                            onMouseEnter={() => setSelectedIndex(index)}
                            style={{
                                padding: '7px 10px',
                                fontSize: '13px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                color:
                                    item.type === 'create'
                                        ? '#ef4444'
                                        : index === selectedIndex
                                          ? '#ffffff'
                                          : '#d4d4d4',
                                backgroundColor:
                                    index === selectedIndex
                                        ? '#3a3a3a'
                                        : 'transparent',
                                borderRadius: '5px',
                                cursor: 'pointer',
                            }}
                        >
                            <span>{item.name}</span>
                            {item.category && (
                                <span
                                    style={{
                                        fontSize: '10px',
                                        color:
                                            item.type === 'create'
                                                ? '#ef4444'
                                                : '#888',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    {item.category}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
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
}: Props) {
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
                } catch {}
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
                } catch {}
                return next;
            });
        },
        [projectId]
    );

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
        const req = rpc.request as Record<string, any>;

        const tryRpc = async (keys: string[]) => {
            for (const key of keys) {
                if (typeof req[key] === 'function') {
                    try {
                        const res = await req[key](projectId);
                        if (Array.isArray(res) && res.length > 0) return res;
                    } catch {}
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
            .map((dc) => ({ id: dc.id, name: dc.name } as Character)),
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
                            } catch {}
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
                } catch {}
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
                characters={effectiveCharacters}
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
                        <div
                            key={beat.id}
                            className="beat-card"
                            style={{ overflow: 'visible' }}
                        >
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

                            <BeatDescriptionMentionInput
                                value={beat.description || ''}
                                onChange={(newVal) =>
                                    handleUpdateBeat(
                                        beat.id,
                                        'description',
                                        newVal
                                    )
                                }
                                chapters={chapters}
                                characters={effectiveCharacters}
                                locations={effectiveLocations}
                                organizations={effectiveOrganizations}
                                items={effectiveItems}
                                lore={effectiveLore}
                                pendingEntities={pendingEntities}
                                knownCategoryMap={knownCategoryMap}
                                onRegisterPending={handleRegisterPending}
                                onRegisterKnownCategory={
                                    handleRegisterKnownCategory
                                }
                                onRemovePending={(name) => {
                                    setPendingEntities((prev) => {
                                        const next = { ...prev };
                                        delete next[name];
                                        return next;
                                    });
                                }}
                                onCreateAndOpenEntity={
                                    handleCreateAndOpenEntity
                                }
                                onNavigateChapter={onNavigateChapter}
                                onSelectCharacter={onSelectCharacter}
                                onSelectLocation={onSelectLocation}
                                onSelectCategory={onSelectCategory}
                                onSelectSidebarChapter={onSelectSidebarChapter}
                                onSelectSidebarEntity={onSelectSidebarEntity}
                                placeholder="Description... (Type @ to mention)"
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