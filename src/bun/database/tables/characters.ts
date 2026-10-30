import { eq, asc } from 'drizzle-orm';

import { characters } from '../../../shared/schema';
import type {
    Character,
    NewCharacter,
} from '@/shared/types/project/compendium';
import type { SQLiteDB } from '@/shared/types/db';

function parseCharacter(row: Record<string, unknown>): Character {
    return {
        ...row,
        templateData: row.templateData
            ? JSON.parse(row.templateData as string)
            : null,
    } as Character;
}

export async function getCharactersByProject(
    db: SQLiteDB,
    projectId: string
): Promise<Character[]> {
    const rows = await db
        .select()
        .from(characters)
        .where(eq(characters.projectId, projectId))
        .orderBy(asc(characters.name));
    return rows.map(parseCharacter);
}

export async function getCharacterById(
    db: SQLiteDB,
    id: string
): Promise<Character | undefined> {
    const result = await db
        .select()
        .from(characters)
        .where(eq(characters.id, id));
    if (!result[0]) return undefined;
    return parseCharacter(result[0]);
}

export async function createCharacter(
    db: SQLiteDB,
    character: NewCharacter
): Promise<Character> {
    const now = new Date();
    const newChar = {
        ...character,
        templateData: character.templateData
            ? JSON.stringify(character.templateData)
            : null,
        createdAt: now,
        updatedAt: now,
    };
    await db.insert(characters).values(newChar);
    return {
        ...newChar,
        templateData: character.templateData || null,
    } as Character;
}

export async function updateCharacter(
    db: SQLiteDB,
    id: string,
    data: Partial<NewCharacter>
): Promise<Character | undefined> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.filePath !== undefined) updateData.filePath = data.filePath;
    if (data.templateData !== undefined)
        updateData.templateData = data.templateData
            ? JSON.stringify(data.templateData)
            : null;

    await db.update(characters).set(updateData).where(eq(characters.id, id));
    return getCharacterById(db, id);
}

export async function deleteCharacter(db: SQLiteDB, id: string): Promise<void> {
    await db.delete(characters).where(eq(characters.id, id));
}
