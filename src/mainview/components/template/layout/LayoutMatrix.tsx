import type { ReactNode } from 'react';

export function LayoutMatrix({
    columns,
    rowCount,
    cells,
    activeField,
    onHoverField,
    onPickField,
}: {
    columns: number;
    rowCount: number;
    cells: Map<string, string>;
    activeField: string | null;
    onHoverField: (name: string | null) => void;
    onPickField: (name: string) => void;
}) {
    if (rowCount <= 0 || columns <= 0) return null;

    const grid: ReactNode[] = [];
    for (let r = 1; r <= rowCount; r++) {
        for (let c = 1; c <= columns; c++) {
            const name = cells.get(`${r},${c}`) ?? null;
            const active = name != null && name === activeField;
            grid.push(
                <button
                    key={`${r},${c}`}
                    type="button"
                    className={
                        'field-layout-matrix-cell' +
                        (name ? ' is-filled' : '') +
                        (active ? ' is-active' : '')
                    }
                    title={name ?? `row ${r}, col ${c}`}
                    onMouseEnter={() => onHoverField(name)}
                    onMouseLeave={() => onHoverField(null)}
                    onClick={() => name && onPickField(name)}
                    disabled={!name}
                />
            );
        }
    }

    return (
        <div className="field-layout-matrix-wrap">
            <span className="field-layout-matrix-caption">
                {columns}
                {' \u00d7 '}
                {rowCount}
            </span>
            <div
                className="field-layout-matrix"
                style={{
                    gridTemplateColumns: `repeat(${columns}, 14px)`,
                    gridTemplateRows: `repeat(${rowCount}, 14px)`,
                }}
            >
                {grid}
            </div>
        </div>
    );
}
