import React from 'react';
import styles from './SettingsCard.module.css';

type Props = {
    children: React.JSX.Element;
};

export default function SettingsCard({ children }: Props) {
    return (
        <div id="" className={styles.SettingsCard}>
            {children}
        </div>
    );
}
