import type { Chapter } from '../../../shared/types/project';
import type { Character } from '../../../shared/types/project/compendium';
import type { PlotArchitectureViewTab } from '../../../shared/types/project/templates';

export interface EntityItem {
    id: string;
    name: string;
    category?: string;
}

export type MentionCategory =
    'Chapter' | 'Character' | 'Location' | 'Organization' | 'Item' | 'Lore';

export type PlotTab = PlotArchitectureViewTab;

export interface MentionOption {
    id: string;
    name: string;
    category?: string;
    type?: 'category' | 'entity' | 'chapter' | 'create';
    targetCategory?: MentionCategory;
}

export interface BeatDescriptionMentionInputProps {
    value: string;
    onChange: (newValue: string) => void;
    chapters: Chapter[];
    characters: Character[];
    locations: EntityItem[];
    organizations: EntityItem[];
    items: EntityItem[];
    lore: EntityItem[];
    pendingEntities: Record<string, MentionCategory>;
    knownCategoryMap: Record<string, MentionCategory>;
    onRegisterPending: (name: string, category: MentionCategory) => void;
    onRegisterKnownCategory: (name: string, category: MentionCategory) => void;
    onRemovePending: (name: string) => void;
    onCreateAndOpenEntity: (
        name: string,
        category: MentionCategory
    ) => Promise<void>;
    onNavigateChapter?: (id: string) => void;
    onSelectCharacter?: (id: string) => void;
    onSelectLocation?: (name: string) => void;
    onSelectCategory?: (category: string) => void;
    onSelectSidebarChapter?: (id: string) => void;
    onSelectSidebarEntity?: (name: string, category: string) => void;
    placeholder?: string;
}

export type DragItemType = 'act' | 'chapter' | 'sequence' | 'scene';
export type DropTargetType =
    | DragItemType
    | 'unassigned-sequence'
    | 'unassigned-scene'
    | 'unassigned-chapter';
export type DropPos = 'before' | 'after' | 'inside';
export type DropTarget = {
    type: DropTargetType;
    id: string | null;
    pos: DropPos;
    zone: string;
};

export interface PlotArchitectureDataProps {
    projectId: string;
    chapters: Chapter[];
    characters: Character[];
    locations?: EntityItem[];
    organizations?: EntityItem[];
    items?: EntityItem[];
    lore?: EntityItem[];
    onNavigateChapter: (chapterId: string) => void;
    onSelectCharacter?: (characterId: string) => void;
    onSelectLocation?: (locationName: string) => void;
    onSelectCategory?: (category: string) => void;
    onSelectSidebarChapter?: (chapterId: string) => void;
    onSelectSidebarEntity?: (entityName: string, category: string) => void;
    onDataChange?: () => void;
}

export interface Props extends PlotArchitectureDataProps {
    view: PlotTab;
}
