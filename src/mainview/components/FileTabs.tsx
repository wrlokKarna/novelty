import { IconX, IconFileText, IconNotes } from '@tabler/icons-react';
import type { FileTab } from '../types/index';

interface FileTabsProps {
    tabs: FileTab[];
    activeTabId: string | null;
    isScratchOpen: boolean;
    onTabClick: (tabId: string) => void;
    onTabClose: (tabId: string) => void;
    onNewTabClick: () => void;
    onScratchClick: () => void;
}

export function FileTabs({
    tabs,
    activeTabId,
    isScratchOpen,
    onTabClick,
    onTabClose,
    onNewTabClick,
    onScratchClick,
}: FileTabsProps) {
    return (
        <nav className="file-tabs">
            <div className="tabs-actions-left">
                <button
                    className={`scratch-btn ${isScratchOpen ? 'active' : ''}`}
                    onClick={onScratchClick}
                    title="Scratch Note"
                >
                    <IconNotes size={16} stroke={2} />
                </button>
            </div>
            <div className="tabs-scroll">
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        className={`tab ${activeTabId === tab.id ? 'active' : ''} ${
                            tab.isModified ? 'modified' : ''
                        }`}
                        onClick={() => onTabClick(tab.id)}
                        title={tab.filePath}
                    >
                        <IconFileText size={14} />
                        <span className="tab-name">{tab.name}</span>
                        <span
                            className="tab-close"
                            onClick={(e) => {
                                e.stopPropagation();
                                onTabClose(tab.id);
                            }}
                        >
                            <IconX size={12} />
                        </span>
                    </div>
                ))}
            </div>
            <div className="tabs-actions">
                <button
                    className="new-tab-btn"
                    onClick={onNewTabClick}
                    title="Open File"
                >
                    +
                </button>
            </div>
        </nav>
    );
}

export default FileTabs;
