import React, { useRef } from 'react';
import { IconCheck } from '@tabler/icons-react';

import type { Model } from '../../utils/ai/providerHelpers';
import type { ModelDisplayMode } from '../../types';
import { getModelDisplayName } from '../../utils/ai/helper';

import styles from './ModelPillBtn.module.css';

type ModelPillBtnProps = {
    model: Model;
    isEditing: boolean;
    displayMode: ModelDisplayMode;
    onToggle: () => void;
    onEditToggle: () => void;
    onAliasChange: (val: string) => void;
    onSave: () => void;
};

export default function ModelPillBtn({
    model,
    isEditing,
    displayMode,
    onToggle,
    onEditToggle,
    onAliasChange,
    onSave,
}: ModelPillBtnProps) {
    const pillText = getModelDisplayName(model, displayMode);

    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const handleClick = (e: React.MouseEvent<HTMLElement>) => {
        const detailValue = e.detail;

        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
            onEditToggle();
        } else {
            clickTimeoutRef.current = setTimeout(() => {
                clickTimeoutRef.current = null;

                if (detailValue === 1) {
                    onToggle();
                }
            }, 190);
        }
    };

    return (
        <div
            className={`${styles.modelPill} ${model.enabled ? styles.active : ''} ${isEditing && styles.editing}`}
        >
            {isEditing ? (
                <form onSubmit={() => onSave()}>
                    <input
                        name="model alias input"
                        placeholder={pillText}
                        value={model.alias}
                        type="text"
                        onChange={(e) => onAliasChange(e.target.value)}
                        autoFocus
                    />
                    <button
                        type="submit"
                        className={`${styles.iconBtn} ${styles.save}`}
                    >
                        <IconCheck />
                    </button>
                </form>
            ) : (
                <button
                    type="button"
                    title="click to Activate or double click to Edit"
                    onClick={handleClick}
                >
                    {pillText}
                </button>
            )}
        </div>
    );
}
