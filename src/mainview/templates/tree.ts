import type { FieldDefinition } from '../types/index';

export type TreeEdge = {
    relation: string;
    inverseRelation: string;
    targetType: string;
    targetId: string;
};

export type TreeRelationPair = { relation: string; inverse: string };

export function isTreeEdge(v: unknown): v is TreeEdge {
    return (
        typeof v === 'object' &&
        v !== null &&
        typeof (v as TreeEdge).relation === 'string' &&
        typeof (v as TreeEdge).inverseRelation === 'string' &&
        typeof (v as TreeEdge).targetId === 'string'
    );
}

export const TREE_PRESETS: Record<string, TreeRelationPair[]> = {
    family: [
        { relation: 'father', inverse: 'child' },
        { relation: 'mother', inverse: 'child' },
        { relation: 'parent', inverse: 'child' },
        { relation: 'grandfather', inverse: 'grandchild' },
        { relation: 'grandmother', inverse: 'grandchild' },
        { relation: 'grandparent', inverse: 'grandchild' },
        { relation: 'brother', inverse: 'brother' },
        { relation: 'sister', inverse: 'sister' },
        { relation: 'sibling', inverse: 'sibling' },
        { relation: 'twin', inverse: 'twin' },
        { relation: 'husband', inverse: 'wife' },
        { relation: 'spouse', inverse: 'spouse' },
        { relation: 'partner', inverse: 'partner' },
        { relation: 'uncle', inverse: 'nephew or niece' },
        { relation: 'aunt', inverse: 'nephew or niece' },
        { relation: 'cousin', inverse: 'cousin' },
        { relation: 'godfather', inverse: 'godchild' },
        { relation: 'godmother', inverse: 'godchild' },
        { relation: 'adoptive parent', inverse: 'adopted child' },
    ],
    containment: [
        { relation: 'contains', inverse: 'contained in' },
        { relation: 'has part', inverse: 'part of' },
        { relation: 'made from', inverse: 'component of' },
        { relation: 'requires', inverse: 'required by' },
        { relation: 'produces', inverse: 'produced from' },
        { relation: 'upgrades to', inverse: 'upgrades from' },
        { relation: 'related to', inverse: 'related to' },
    ],
    geography: [
        { relation: 'contains', inverse: 'within' },
        { relation: 'borders', inverse: 'bordered by' },
        { relation: 'connects to', inverse: 'connects to' },
        { relation: 'leads to', inverse: 'leads from' },
        { relation: 'near', inverse: 'near' },
    ],
    organization: [
        { relation: 'leads', inverse: 'member of' },
        { relation: 'oversees', inverse: 'reports to' },
        { relation: 'employs', inverse: 'employed by' },
        { relation: 'founded', inverse: 'founded by' },
        { relation: 'has part', inverse: 'part of' },
        { relation: 'allied with', inverse: 'allied with' },
        { relation: 'rival of', inverse: 'rival of' },
    ],
};

export function inverseOf(
    relation: string,
    relations: TreeRelationPair[]
): string {
    const pair = relations.find((p) => p.relation === relation);
    if (pair) return pair.inverse;
    const reverse = relations.find((p) => p.inverse === relation);
    if (reverse) return reverse.relation;
    return relation;
}

export function treeEdgeKey(edge: TreeEdge): string {
    return `${edge.targetId}::${edge.relation}`;
}

export function buildTreeGraph(
    entries: Array<{
        id: string;
        templateData?: Record<string, unknown> | null;
    }>
) {
    const graph = new Map<string, TreeEdge[]>();
    for (const entry of entries) {
        const data = entry.templateData as
            Record<string, unknown> | null | undefined;
        if (!data) continue;
        for (const [, value] of Object.entries(data)) {
            if (Array.isArray(value) && value.every(isTreeEdge)) {
                const existing = graph.get(entry.id) || [];
                graph.set(entry.id, [...existing, ...(value as TreeEdge[])]);
            }
        }
    }
    return graph;
}

export function findTreeField(
    templateFields: Array<{ type: string; name: string }>
): string | null {
    return (
        templateFields.find((f) => f.type === 'tree' || f.type === 'lineage')
            ?.name ?? null
    );
}

export function getTreeRelations(
    field?: Pick<FieldDefinition, 'treeRelations'> | null
): TreeRelationPair[] {
    if (field?.treeRelations && field.treeRelations.length > 0)
        return field.treeRelations;
    return TREE_PRESETS.family;
}

export function normalizeTreeFields<
    T extends { type: string; treeRelations?: TreeRelationPair[] },
>(fields: T[]): T[] {
    return fields.map((f) => {
        if (f.type === 'lineage') {
            return {
                ...f,
                type: 'tree',
                treeRelations:
                    f.treeRelations && f.treeRelations.length > 0
                        ? f.treeRelations
                        : TREE_PRESETS.family,
            } as T;
        }
        return f;
    });
}
