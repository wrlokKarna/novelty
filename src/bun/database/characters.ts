import { db } from './index';
import { characters } from '../schema';
import { eq, asc } from 'drizzle-orm';

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

function parseCharacter(row: Record<string, unknown>): Character {
    return {
        ...row,
        templateData: row.templateData
            ? JSON.parse(row.templateData as string)
            : null,
    } as Character;
}

export async function getCharactersByProject(
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
    return getCharacterById(id);
}

export async function deleteCharacter(id: string): Promise<void> {
    await db.delete(characters).where(eq(characters.id, id));
}
