import React from 'react';
import styles from './IconTextSideBar.module.css';
import { useDialogSidebar } from '../../components/DialogSidebarContext';

type Props<T extends string> = {
    activeTab: T;
    setActiveTab: React.Dispatch<React.SetStateAction<T>>;
    tabsArray: readonly {
        label: T;
        description?: string;
        [key: string]: any;
    }[];
    iconsArray?: readonly React.ComponentType[];
};

export default function IconTextSideBar<T extends string>({
    activeTab,
    setActiveTab,
    tabsArray,
    iconsArray = [],
}: Props<T>) {
    const sidebar = useDialogSidebar();
    const mode = sidebar?.mode ?? 'expanded';

    if (mode === 'hidden') {
        return null;
    }

    return (
        <div
            className={`${styles.sideBar} ${mode === 'collapsed' ? styles.collapsed : ''}`}
        >
            {tabsArray.map((t, index) => {
                const TabIcon = iconsArray[index];

                return (
                    <button
                        key={t.label}
                        className={activeTab === t.label ? styles.active : ''}
                        onClick={() => setActiveTab(t.label)}
                    >
                        {TabIcon && (
                            <span>
                                <TabIcon />
                            </span>
                        )}
                        <span>{t.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
