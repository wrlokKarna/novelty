import React, { useRef, useState } from 'react';
import { IconLinkOff } from '@tabler/icons-react';

type Props = {
    mock?: string;
};

type TabItem = {
    id: string;
    name: string;
    linkedTo?: string | null;
};

export default function TabCont({ mock = '' }: Props) {
    const [tabs, setTabs] = useState<TabItem[]>([
        { id: 'tab1', name: 'Tab 1', linkedTo: 'tab2' },
        { id: 'tab2', name: 'Tab 2', linkedTo: null },
        { id: 'tab3', name: 'Tab 3', linkedTo: null },
        { id: 'tab4', name: 'Tab 4', linkedTo: 'tab6' },
        { id: 'tab5', name: 'Tab 5', linkedTo: null },
        { id: 'tab6', name: 'Tab 6', linkedTo: null },
    ]);

    const [activeMainTab, setActiveMainTab] = useState<string>('tab1');
    const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);

    const [tabContents, setTabContents] = useState<{ [key: string]: string }>({
        tab1: mock || 'Content for Tab 1...',
        tab2: 'Content for Tab 2...',
        tab3: 'Content for Tab 3...',
        tab4: 'Content for Tab 4...',
        tab5: 'Content for Tab 5...',
        tab6: 'Content for Tab 6...',
    });

    const [isCenterHovered, setIsCenterHovered] = useState<boolean>(false);

    const leftScrollRef = useRef<HTMLTextAreaElement>(null);
    const rightScrollRef = useRef<HTMLTextAreaElement>(null);
    const isScrollingRef = useRef<boolean>(false);

    const handleScrollSync = (source: 'left' | 'right') => {
        if (isScrollingRef.current) return;
        isScrollingRef.current = true;

        const leftElem = leftScrollRef.current;
        const rightElem = rightScrollRef.current;

        if (leftElem && rightElem) {
            if (source === 'left') {
                const percentage =
                    leftElem.scrollTop /
                    (leftElem.scrollHeight - leftElem.clientHeight || 1);
                rightElem.scrollTop =
                    percentage *
                    (rightElem.scrollHeight - rightElem.clientHeight);
            } else {
                const percentage =
                    rightElem.scrollTop /
                    (rightElem.scrollHeight - rightElem.clientHeight || 1);
                leftElem.scrollTop =
                    percentage *
                    (leftElem.scrollHeight - leftElem.clientHeight);
            }
        }

        setTimeout(() => {
            isScrollingRef.current = false;
        }, 50);
    };

    const handleAddTab = () => {
        const newNum = tabs.length + 1;
        const newId = `tab_${Date.now()}`;
        const newName = `Tab ${newNum}`;
        setTabs([...tabs, { id: newId, name: newName, linkedTo: null }]);
        setTabContents({
            ...tabContents,
            [newId]: `Content for ${newName}...`,
        });
        setActiveMainTab(newId);
    };

    const handleStartLinking = (tabId: string) => {
        setLinkingSourceId(tabId);
    };

    const handleCompleteLink = (sourceId: string, targetId: string) => {
        if (sourceId === targetId) {
            setLinkingSourceId(null);
            return;
        }
        setTabs(
            tabs.map((t) => {
                if (t.id === sourceId) {
                    return { ...t, linkedTo: targetId };
                }
                return t;
            })
        );
        setLinkingSourceId(null);
    };

    const handleUnlink = (tabId: string) => {
        setTabs(
            tabs.map((t) => {
                if (t.id === tabId || t.linkedTo === tabId) {
                    return { ...t, linkedTo: null };
                }
                return t;
            })
        );
    };

    const handleTextChange = (value: string, tabId: string) => {
        setTabContents((prev) => ({ ...prev, [tabId]: value }));
        tabs.forEach((t) => {
            if (t.linkedTo === tabId) {
                setTabContents((prev) => ({ ...prev, [t.id]: value }));
            }
        });
    };

    const currentTab = tabs.find((t) => t.id === activeMainTab);

    // Helper to find if a tab is linked to another or targeted by another
    const getLinkedPartner = (tabId: string) => {
        const tab = tabs.find((t) => t.id === tabId);
        if (tab?.linkedTo)
            return {
                source: tab,
                target: tabs.find((t) => t.id === tab.linkedTo),
            };
        const targetingTab = tabs.find((t) => t.linkedTo === tabId);
        if (targetingTab) return { source: targetingTab, target: tab };
        return null;
    };

    const linkedPair = currentTab ? getLinkedPartner(currentTab.id) : null;
    const renderedTabIds = new Set<string>();

    return (
        <div style={styles.container}>
            {/* Linking Mode Active Notification Banner */}
            {linkingSourceId && (
                <div style={styles.linkingBanner}>
                    <span>
                        Linking mode active: Click another tab to link with{' '}
                        <strong>
                            {tabs.find((t) => t.id === linkingSourceId)?.name}
                        </strong>
                    </span>
                    <button
                        style={styles.cancelLinkBtn}
                        onClick={() => setLinkingSourceId(null)}
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Top Tabs Bar */}
            <div style={styles.topContainer}>
                <div style={styles.tabsGroupDiv}>
                    {tabs.map((tab) => {
                        if (renderedTabIds.has(tab.id)) return null;

                        const partner = getLinkedPartner(tab.id);
                        if (partner) {
                            renderedTabIds.add(partner.source.id);
                            renderedTabIds.add(partner.target.id);
                            const isSourceActive =
                                activeMainTab === partner.source.id;
                            const isTargetActive =
                                activeMainTab === partner.target.id;

                            return (
                                <div
                                    key={`pair-${partner.source.id}-${partner.target.id}`}
                                    style={styles.tabPairWrapper}
                                >
                                    <button
                                        style={{
                                            ...styles.topTab,
                                            backgroundColor: isSourceActive
                                                ? '#b19cd9'
                                                : '#1e1e1e',
                                            color: isSourceActive
                                                ? '#121212'
                                                : '#fff',
                                        }}
                                        onClick={() => {
                                            if (linkingSourceId) {
                                                handleCompleteLink(
                                                    linkingSourceId,
                                                    partner.source.id
                                                );
                                            } else {
                                                setActiveMainTab(
                                                    partner.source.id
                                                );
                                            }
                                        }}
                                    >
                                        {partner.source.name}
                                    </button>
                                    <div style={styles.pairIconContainer}>
                                        <IconLinkOff
                                            size={16}
                                            color="#b19cd9"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() =>
                                                handleUnlink(partner.source.id)
                                            }
                                            title="Unlink tabs"
                                        />
                                    </div>
                                    <button
                                        style={{
                                            ...styles.topTab,
                                            backgroundColor: isTargetActive
                                                ? '#b19cd9'
                                                : '#1e1e1e',
                                            color: isTargetActive
                                                ? '#121212'
                                                : '#fff',
                                        }}
                                        onClick={() => {
                                            if (linkingSourceId) {
                                                handleCompleteLink(
                                                    linkingSourceId,
                                                    partner.target.id
                                                );
                                            } else {
                                                setActiveMainTab(
                                                    partner.target.id
                                                );
                                            }
                                        }}
                                    >
                                        {partner.target.name}
                                    </button>
                                </div>
                            );
                        } else {
                            renderedTabIds.add(tab.id);
                            const isActive = activeMainTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    style={{
                                        ...styles.topTab,
                                        backgroundColor: isActive
                                            ? '#b19cd9'
                                            : '#1e1e1e',
                                        color: isActive ? '#121212' : '#fff',
                                        border:
                                            linkingSourceId === tab.id
                                                ? '2px dashed #b19cd9'
                                                : '1px solid #b19cd9',
                                    }}
                                    onClick={() => {
                                        if (linkingSourceId) {
                                            handleCompleteLink(
                                                linkingSourceId,
                                                tab.id
                                            );
                                        } else {
                                            setActiveMainTab(tab.id);
                                        }
                                    }}
                                >
                                    {tab.name}
                                </button>
                            );
                        }
                    })}
                    <button
                        style={styles.addBtn}
                        onClick={handleAddTab}
                        title="Add Tab"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div style={styles.contentArea}>
                {linkedPair ? (
                    <div style={styles.tabContentContainer}>
                        <div style={styles.tabHeaderBar}>
                            <span style={styles.tabHeaderTitle}>
                                {linkedPair.source.name} &amp;{' '}
                                {linkedPair.target.name} (Linked Preview Mode)
                            </span>
                            <button
                                style={styles.linkToggleBtn}
                                onClick={() =>
                                    handleUnlink(linkedPair.source.id)
                                }
                            >
                                Unlink Tab
                            </button>
                        </div>

                        <div style={styles.workspace}>
                            <textarea
                                ref={leftScrollRef}
                                style={styles.leftTextBox}
                                value={tabContents[linkedPair.source.id] || ''}
                                onChange={(e) =>
                                    handleTextChange(
                                        e.target.value,
                                        linkedPair.source.id
                                    )
                                }
                                onScroll={() => handleScrollSync('left')}
                                placeholder="Tab content (Left)..."
                            />

                            <div
                                style={styles.centerHoverZone}
                                onMouseEnter={() => setIsCenterHovered(true)}
                                onMouseLeave={() => setIsCenterHovered(false)}
                            >
                                {isCenterHovered && (
                                    <button
                                        style={styles.hoverUnlinkBtn}
                                        onClick={() =>
                                            handleUnlink(linkedPair.source.id)
                                        }
                                    >
                                        Unlink
                                    </button>
                                )}
                            </div>

                            <textarea
                                ref={rightScrollRef}
                                style={{
                                    ...styles.rightTextBox,
                                    backgroundColor: '#1a1824',
                                }}
                                value={tabContents[linkedPair.target.id] || ''}
                                onChange={(e) =>
                                    handleTextChange(
                                        e.target.value,
                                        linkedPair.target.id
                                    )
                                }
                                onScroll={() => handleScrollSync('right')}
                                placeholder="Linked tab content (Right)..."
                            />
                        </div>
                    </div>
                ) : (
                    <div style={styles.tabContentContainer}>
                        <div style={styles.tabHeaderBar}>
                            <span style={styles.tabHeaderTitle}>
                                {currentTab?.name} (Standard Mode)
                            </span>
                            <button
                                style={styles.linkToggleBtn}
                                onClick={() =>
                                    currentTab &&
                                    handleStartLinking(currentTab.id)
                                }
                            >
                                Enable Preview Link
                            </button>
                        </div>

                        <textarea
                            style={styles.fullTextBox}
                            value={
                                activeMainTab
                                    ? tabContents[activeMainTab] || ''
                                    : ''
                            }
                            onChange={(e) =>
                                activeMainTab &&
                                handleTextChange(e.target.value, activeMainTab)
                            }
                            placeholder="Type content for this tab..."
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        backgroundColor: '#121212',
        color: '#ffffff',
        padding: '1.5vw',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100vh',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        overflow: 'hidden',
    },
    linkingBanner: {
        background: '#2a2238',
        border: '1px solid #b19cd9',
        padding: '8px 16px',
        borderRadius: '8px',
        marginBottom: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '13px',
        color: '#b19cd9',
    },
    cancelLinkBtn: {
        background: '#1e1e1e',
        border: '1px solid #b19cd9',
        color: '#fff',
        padding: '4px 10px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '11px',
    },
    topContainer: {
        width: '100%',
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginBottom: '15px',
        flexWrap: 'wrap',
        gap: '10px',
    },
    tabsGroupDiv: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: '#1a1a1a',
        border: '1px solid #b19cd9',
        borderRadius: '10px',
        padding: '6px 10px',
        overflowX: 'auto',
        maxWidth: '100%',
    },
    tabPairWrapper: {
        display: 'flex',
        alignItems: 'center',
        background: '#252030',
        border: '1px solid #b19cd9',
        borderRadius: '8px',
        padding: '2px 6px',
        gap: '6px',
    },
    pairIconContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 2px',
    },
    topTab: {
        border: '1px solid #b19cd9',
        borderRadius: '6px',
        padding: '6px 16px',
        fontSize: '13px',
        cursor: 'pointer',
        outline: 'none',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s ease',
        background: '#1e1e1e',
        color: '#fff',
    },
    addBtn: {
        border: '1px dashed #b19cd9',
        borderRadius: '6px',
        padding: '6px 12px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        background: 'transparent',
        color: '#b19cd9',
        outline: 'none',
    },
    contentArea: {
        width: '100%',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 90px)',
    },
    workspace: {
        width: '100%',
        flex: 1,
        display: 'flex',
        gap: '0px',
        height: '100%',
        position: 'relative',
    },
    tabContentContainer: {
        width: '100%',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: '10px',
    },
    tabHeaderBar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 10px',
        background: '#1e1e1e',
        border: '1px solid #b19cd9',
        borderRadius: '8px',
    },
    tabHeaderTitle: {
        fontSize: '13px',
        color: '#b19cd9',
        fontWeight: 'bold',
    },
    linkToggleBtn: {
        background: '#2a2a2a',
        border: '1px solid #b19cd9',
        color: '#fff',
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '11px',
        cursor: 'pointer',
    },
    centerHoverZone: {
        position: 'absolute',
        left: '50%',
        top: 0,
        transform: 'translateX(-50%)',
        width: '40px',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        cursor: 'pointer',
    },
    hoverUnlinkBtn: {
        background: '#2a2a2a',
        border: '1px solid #b19cd9',
        color: '#fff',
        padding: '6px 12px',
        borderRadius: '20px',
        cursor: 'pointer',
        fontSize: '11px',
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
    },
    leftTextBox: {
        flex: 1,
        background: '#1a1a1a',
        border: '1px solid #b19cd9',
        borderTopRightRadius: '0px',
        borderBottomRightRadius: '0px',
        borderTopLeftRadius: '12px',
        borderBottomLeftRadius: '12px',
        padding: '20px',
        color: '#fff',
        fontSize: '16px',
        outline: 'none',
        resize: 'none',
        boxSizing: 'border-box',
        height: '100%',
    },
    rightTextBox: {
        flex: 1,
        background: '#1a1a1a',
        border: '1px solid #b19cd9',
        borderTopLeftRadius: '0px',
        borderBottomLeftRadius: '0px',
        borderTopRightRadius: '12px',
        borderBottomRightRadius: '12px',
        padding: '20px',
        color: '#fff',
        fontSize: '16px',
        outline: 'none',
        resize: 'none',
        boxSizing: 'border-box',
        height: '100%',
    },
    fullTextBox: {
        width: '100%',
        flex: 1,
        background: '#1a1a1a',
        border: '1px solid #b19cd9',
        borderRadius: '12px',
        padding: '20px',
        color: '#fff',
        fontSize: '16px',
        outline: 'none',
        resize: 'none',
        boxSizing: 'border-box',
        height: '100%',
    },
};
