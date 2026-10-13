import { db } from './index';
import {
    projects,
    projectGenres,
    projectTags,
    projectThemes,
    genres,
    tags,
    themes,
} from '../schema';
import { eq, asc, desc, or } from 'drizzle-orm';
import { getAllSettings, setSetting } from '../settings';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import type {
    ProjectScope,
    SeriesArchitecture,
    PointOfView,
    PacingType,
    WorkType,
    ProjectStructure,
    TargetAgeGroup,
    ProjectStatus,
} from '../../mainview/types';

export type Project = {
    id: string;
    name: string;
    path: string | null;
    metadata: string | null;
    description: string | null;
    systemPrompt: string | null;
    coverImageId: string | null;
    coverImagesArray: string[];
    projectScope: ProjectScope | null;
    seriesArch: SeriesArchitecture | null;
    seriesId: string | null;
    pov: PointOfView | null;
    pacing: PacingType | null;
    workType: WorkType | null;
    projectStructure: ProjectStructure | null;
    targetAge: TargetAgeGroup | null;
    projectStatus: ProjectStatus;
    tonalType: string | null;
    contentRating: string;
    primaryGenre: string | null;
    primaryTheme: string | null;
    genres: string[];
    tags: string[];
    themes: string[];
    createdAt: Date;
    updatedAt: Date;
};

export type NewProject = Omit<Project, 'createdAt' | 'updatedAt'>;

function safeParse(val: string | null) {
    if (!val || val === 'null') return [];
    try {
        return JSON.parse(val) as string[];
    } catch {
        return [];
    }
}

function parseProject(row: typeof projects.$inferSelect): Project {
    return {
        id: row.id,
        name: row.name,
        path: row.path,
        metadata: row.metadata,
        description: row.description,
        systemPrompt: row.systemPrompt,
        coverImageId: row.coverImageId,
        coverImagesArray: safeParse(row.cover_images_array),
        projectScope: (row.projectScope || null) as ProjectScope | null,
        seriesArch: (row.seriesArch || null) as SeriesArchitecture | null,
        seriesId: row.seriesId || null,
        pov: (row.pov || null) as PointOfView | null,
        pacing: (row.pacing || null) as PacingType | null,
        workType: (row.workType || null) as WorkType | null,
        projectStructure: (row.projectStructure ||
            null) as ProjectStructure | null,
        targetAge: (row.targetAge || null) as TargetAgeGroup | null,
        projectStatus: (row.projectStatus || 'planning') as ProjectStatus,
        tonalType: row.tonalType || null,
        contentRating: row.contentRating || 'Unrated',
        primaryGenre: null,
        primaryTheme: null,
        genres: [],
        tags: [],
        themes: [],
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

async function resolveProjectJunctions(
    row: typeof projects.$inferSelect,
    parsed: Project
) {
    const genreRows = await db
        .select({ name: genres.name, isPrimary: projectGenres.isPrimary })
        .from(projectGenres)
        .innerJoin(genres, eq(projectGenres.genreId, genres.id))
        .where(eq(projectGenres.projectId, row.id))
        .orderBy(desc(projectGenres.isPrimary), asc(genres.name));
    const primaryG = genreRows.find((g) => g.isPrimary);
    parsed.primaryGenre = primaryG?.name ?? null;
    parsed.genres = genreRows.map((g) => g.name);

    const tagRows = await db
        .select({ name: tags.name })
        .from(projectTags)
        .innerJoin(tags, eq(projectTags.tagId, tags.id))
        .where(eq(projectTags.projectId, row.id))
        .orderBy(asc(tags.name));
    parsed.tags = tagRows.map((t) => t.name);

    const themeRows = await db
        .select({ name: themes.name, isPrimary: projectThemes.isPrimary })
        .from(projectThemes)
        .innerJoin(themes, eq(projectThemes.themeId, themes.id))
        .where(eq(projectThemes.projectId, row.id))
        .orderBy(desc(projectThemes.isPrimary), asc(themes.name));
    const primaryT = themeRows.find((t) => t.isPrimary);
    parsed.primaryTheme = primaryT?.name ?? null;
    parsed.themes = themeRows.map((t) => t.name);
}

export async function getAllProjects(): Promise<Project[]> {
    const rows = await db
        .select()
        .from(projects)
        .orderBy(asc(projects.updatedAt));
    const projectsWithMeta = await Promise.all(
        rows.map(async (row) => {
            const parsed = parseProject(row);
            await resolveProjectJunctions(row, parsed);
            return parsed;
        })
    );
    return projectsWithMeta;
}

export async function getProjectById(id: string): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id));
    if (!result[0]) return undefined;
    const row = result[0];
    const parsed = parseProject(row);
    await resolveProjectJunctions(row, parsed);
    return parsed;
}

export async function createProject(project: NewProject): Promise<Project> {
    const settings = getAllSettings();
    const projectsDir = settings.projects.defaultProjectsDir;

    let projectPath: string | undefined;
    if (projectsDir && project.id) {
        projectPath = join(projectsDir, project.id);
        if (!existsSync(projectPath)) {
            mkdirSync(projectPath, { recursive: true });
            mkdirSync(join(projectPath, 'Manuscript'), { recursive: true });
            mkdirSync(join(projectPath, 'Compendium', 'characters'), {
                recursive: true,
            });
            mkdirSync(join(projectPath, 'Compendium', 'locations'), {
                recursive: true,
            });
            mkdirSync(join(projectPath, 'Compendium', 'organizations'), {
                recursive: true,
            });
            mkdirSync(join(projectPath, 'Compendium', 'items'), {
                recursive: true,
            });
            mkdirSync(join(projectPath, 'References'), { recursive: true });
        }
        const updatedProjectDirs = [
            ...settings.projects.projectDirs,
            projectPath,
        ];
        setSetting('projects', {
            ...settings.projects,
            projectDirs: updatedProjectDirs,
        });
    }

    const {
        genres: _pg,
        tags: _pt,
        themes: _pth,
        primaryGenre: _pG,
        primaryTheme: _pT,
        ...projectRest
    } = project;
    await db.insert(projects).values({
        ...projectRest,
        path: projectPath,
        cover_images_array: JSON.stringify(project.coverImagesArray || []),
    });
    return project as Project;
}

export async function updateProject(
    id: string,
    data: Partial<NewProject> & {
        primaryGenre?: string | null;
        primaryTheme?: string | null;
    }
): Promise<Project | undefined> {
    const {
        genres: newGenres,
        tags: newTags,
        themes: newThemes,
        primaryGenre,
        primaryTheme,
        ...rest
    } = data;
    const updateData: Record<string, unknown> = {
        ...rest,
        updatedAt: new Date(),
    };
    if (data.coverImagesArray) {
        updateData.cover_images_array = JSON.stringify(data.coverImagesArray);
    }
    await db.update(projects).set(updateData).where(eq(projects.id, id));

    if (newGenres) {
        const genreRows = await db
            .select()
            .from(genres)
            .where(
                or(...newGenres.map((name: string) => eq(genres.name, name)))
            );
        await db.delete(projectGenres).where(eq(projectGenres.projectId, id));
        if (genreRows.length > 0) {
            await db.insert(projectGenres).values(
                genreRows.map((g) => ({
                    projectId: id,
                    genreId: g.id,
                    isPrimary: g.name === primaryGenre,
                }))
            );
        }
    }

    if (newTags) {
        const tagRows = await db
            .select()
            .from(tags)
            .where(or(...newTags.map((name: string) => eq(tags.name, name))));
        await db.delete(projectTags).where(eq(projectTags.projectId, id));
        if (tagRows.length > 0) {
            await db
                .insert(projectTags)
                .values(tagRows.map((t) => ({ projectId: id, tagId: t.id })));
        }
    }

    if (newThemes) {
        const themeRows = await db
            .select()
            .from(themes)
            .where(
                or(...newThemes.map((name: string) => eq(themes.name, name)))
            );
        await db.delete(projectThemes).where(eq(projectThemes.projectId, id));
        if (themeRows.length > 0) {
            await db.insert(projectThemes).values(
                themeRows.map((t) => ({
                    projectId: id,
                    themeId: t.id,
                    isPrimary: t.name === primaryTheme,
                }))
            );
        }
    }

    return getProjectById(id);
}

export async function deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
}
