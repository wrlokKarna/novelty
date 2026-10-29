// needs refactor
//export type Character = InferSelectModel<typeof characters>;
//export type NewCharacter = InferInsertModel<typeof characters>;
/*
/**
 * Character entity representing a character in the story world.
 
 * export class Character {
 *     constructor(
 *         public id: string,
 *         public name: string,
 *         public description: string,
 *         public currentLocationId: string | null,
 *         public backgroundLocationId: string | null,
 *         public organizationId: string | null,
 *         public bgmId: string | null,
 *         public playlistId: string | null,
 *         public galleryImageIds: string[],
 *         public createdAt: Date,
 *         public updatedAt: Date
 *     ) {}
}*/

export type Character = {
    id: string;
    projectId: string | null;
    name: string;
    filePath: string | null;
    templateData: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
};

export type NewCharacter = Omit<Character, 'createdAt' | 'updatedAt'>;

export type Organization = {
    id: string;
    projectId: string | null;
    name: string;
    filePath: string | null;
    templateData: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
};

export type NewOrganization = Omit<Organization, 'createdAt' | 'updatedAt'>;

export type LoreEntry = {
    id: string;
    projectId: string | null;
    name: string;
    filePath: string | null;
    templateData: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
};

export type NewLoreEntry = Omit<LoreEntry, 'createdAt' | 'updatedAt'>;

export type CompendiumCategory =
    'character' | 'location' | 'organization' | 'item' | 'lore';
