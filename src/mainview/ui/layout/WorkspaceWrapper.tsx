import React from 'react';
import styles from './WorkspaceWrapper.module.css';

type Props = {
    tabType: string;
    tabName: string;
    tabNameEditable?: boolean;
    headerCenter?: React.ReactNode;
    headerRight?: React.ReactNode;

    children?: React.ReactNode;
};

function WorkspaceWrapper({
    tabType,
    tabName,
    tabNameEditable,
    headerCenter,
    headerRight,
    children,
}: Props) {
    return (
        <div className={styles.wsWrapper}>
            <div className={styles.wsHeader}>
                <div className={styles.headerLeft}>
                    {tabType}:{' '}
                    {tabNameEditable ? (
                        <input />
                    ) : (
                        <span className={styles.panelTitle}>{tabName}</span>
                    )}
                </div>
                <div className={styles.headerCenter}>{headerCenter}</div>
                <div className={styles.headerRight}>{headerRight}</div>
            </div>
            <div className={styles.wsCont}>{children}</div>
        </div>
    );
}
export default WorkspaceWrapper;
