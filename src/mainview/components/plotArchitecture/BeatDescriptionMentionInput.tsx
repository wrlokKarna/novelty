import React, { useEffect, useRef, useState } from 'react';
import styles from '../PlotArchitectureView.module.css';
import type {
    BeatDescriptionMentionInputProps,
    MentionCategory,
    MentionOption,
} from './types';
import { openInLeftSidebar, parseColonCommand } from './utils';

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
            const charBeforeAt =
                lastAtPos > 0 ? textBeforeCursor[lastAtPos - 1] : ' ';
            if (/\s/.test(charBeforeAt)) {
                const currentQuery = textBeforeCursor.slice(lastAtPos + 1);
                // క్వెరీలో స్పేస్ లేదా న్యూలైన్ లేనంత వరకు అది యాక్టివ్ టైపింగ్ క్వెరీగా పరిగణించబడుతుంది
                if (
                    !currentQuery.includes('\n') &&
                    !currentQuery.includes(' ')
                ) {
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
            className={styles['beat-desc-mention-wrapper']}
            style={{
                position: 'relative',
                width: '100%',
                minHeight: '34px',
            }}
        >
            <style>
                {`
                    .${styles['beat-desc-input']}::selection {
                        background-color: rgba(255, 140, 0, 0.25) !important;
                        color: transparent !important;
                        -webkit-text-fill-color: transparent !important;
                    }
                    .${styles['beat-desc-input']}::-moz-selection {
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
                className={styles['beat-desc-input']}
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

export default BeatDescriptionMentionInput;
