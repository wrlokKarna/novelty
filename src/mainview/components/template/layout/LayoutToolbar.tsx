import type { ReactNode } from 'react';
import { MAX_COLUMNS } from '../../../types';

export function LayoutToolbar({
    columns,
    onColumns,
    onAutoArrange,
    matrix,
}: {
    columns: number;
    onColumns: (columns: number) => void;
    onAutoArrange: () => void;
    matrix?: ReactNode;
}) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                flexWrap: 'wrap',
                fontSize: '0.85em',
                color: '#ccc',
            }}
        >
            <label
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                }}
            >
                Columns
                <select
                    value={columns}
                    onChange={(e) => onColumns(Number(e.target.value))}
                >
                    {Array.from({ length: MAX_COLUMNS }, (_, i) => i + 1).map(
                        (n) => (
                            <option key={n} value={n}>
                                {n}
                            </option>
                        )
                    )}
                </select>
            </label>
            <button
                type="button"
                onClick={onAutoArrange}
                title="Reset widths from field types"
            >
                Auto-arrange
            </button>
            {matrix}
        </div>
    );
}
