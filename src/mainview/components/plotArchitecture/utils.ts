import type { EntityItem, MentionCategory } from './types';

export function normalizeEntities(
    rawList: any[],
    categoryLabel: string
): EntityItem[] {
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
export function openInLeftSidebar(
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
            document.querySelectorAll(
                'button, [role="tab"], [role="button"], span, div'
            )
        ) as HTMLElement[];
        return els.some((el) => {
            if (el.children.length > 0) return false;
            const txt = el.textContent?.trim().toLowerCase();
            if (txt !== 'manuscript' && txt !== 'compendium') return false;
            const rect = el.getBoundingClientRect();
            return (
                rect.width > 0 &&
                rect.height > 0 &&
                rect.left >= 0 &&
                rect.left < 320
            );
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
            if (el.closest('[data-plot-architecture-view]')) return false;
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
                    if (el.closest('[data-plot-architecture-view]'))
                        return false;
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
                            el.textContent
                                ?.toLowerCase()
                                .includes('new chapter')
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
                if (btn.closest('[data-plot-architecture-view]')) return false;
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
                        if (el.closest('[data-plot-architecture-view]'))
                            return false;
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
                                el.textContent?.toLowerCase().includes('+ new')
                            );
                        });
                        if (newBtn) newBtn.click();
                    }

                    // 2. టాప్ బార్ లో ఆల్రెడీ ఆ ట్యాబ్ ఓపెన్ అయి ఉంటే దాన్ని కూడా ఆక్టివేట్ చేయి
                    const topTabEl = itemElements.find((el) => {
                        if (el.closest('[data-plot-architecture-view]'))
                            return false;
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

export function parseColonCommand(rawQuery: string): {
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
