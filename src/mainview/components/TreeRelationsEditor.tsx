import { TREE_PRESETS } from '../templates/tree';
import type { TreeRelationPair } from '../templates/tree';

const PRESET_OPTIONS = [
    { id: 'family', label: 'Family' },
    { id: 'containment', label: 'Containment (Items)' },
    { id: 'geography', label: 'Geography (Locations)' },
    { id: 'organization', label: 'Organization' },
];

export default function TreeRelationsEditor({
    relations,
    onChange,
}: {
    relations: TreeRelationPair[];
    onChange: (relations: TreeRelationPair[]) => void;
}) {
    const list = relations || [];

    function loadPreset(id: string) {
        if (!id) return;
        onChange(TREE_PRESETS[id] || []);
    }

    function updateRow(i: number, patch: Partial<TreeRelationPair>) {
        const next = [...list];
        next[i] = { ...next[i], ...patch };
        onChange(next);
    }

    function removeRow(i: number) {
        onChange(list.filter((_, idx) => idx !== i));
    }

    function addRow() {
        onChange([...list, { relation: '', inverse: '' }]);
    }

    return (
        <div className="tree-relations-editor">
            <div className="tree-relations-header">
                <label style={{ fontSize: '0.85em' }}>Relations:</label>
                <select
                    onChange={(e) => loadPreset(e.target.value)}
                    defaultValue=""
                >
                    <option value="">Load preset…</option>
                    {PRESET_OPTIONS.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.label}
                        </option>
                    ))}
                </select>
            </div>
            {list.length === 0 && (
                <div style={{ fontSize: '0.8em', color: '#888' }}>
                    No relations yet — load a preset or add one below.
                </div>
            )}
            {list.map((r, i) => (
                <div key={i} className="tree-relation-row">
                    <input
                        placeholder="Relation"
                        value={r.relation}
                        onChange={(e) =>
                            updateRow(i, { relation: e.target.value })
                        }
                    />
                    <span className="tree-relation-arrow">↔</span>
                    <input
                        placeholder="Inverse"
                        value={r.inverse}
                        onChange={(e) =>
                            updateRow(i, { inverse: e.target.value })
                        }
                    />
                    <button
                        type="button"
                        className="tree-relation-remove danger"
                        aria-label="Remove"
                        onClick={() => removeRow(i)}
                    >
                        ×
                    </button>
                </div>
            ))}
            <button
                type="button"
                className="tree-add-relation-btn"
                onClick={addRow}
            >
                + Add relation
            </button>
        </div>
    );
}
