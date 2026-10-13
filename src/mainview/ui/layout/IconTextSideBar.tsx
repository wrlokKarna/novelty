import React from 'react';
import styles from './IconTextSideBar.module.css';

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
    return (
        <div className={styles.sideBar}>
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
