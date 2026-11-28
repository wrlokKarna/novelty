import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';
import { useRPC } from '@/mainview/contexts/RPCContext';
import type { Project } from '@/shared/types';
import type { Chapter } from '@/shared/types/project';

interface ProjectContextValue {
    project: Project | null;
    listChapters: Chapter[];
}

const ProjectContext = createContext<ProjectContextValue | undefined>(
    undefined
);

export default function ProjectProvider({ children }: { children: ReactNode }) {
    const rpc = useRPC();
    const [project, setProject] = useState<Project | null>(null);
    const [chaptersList, setChaptersList] = useState<Chapter[] | null>(null);

    async function fetchProject() {
        setProject((await rpc.request['project:get-current']()) ?? null);
    }
    if (!project) {
        fetchProject();
    }

    function fetchAndSetChaptersList() {
        if (!project) return console.error('project was not set');
        const chapters = rpc.request['db:get-chapters'](project?.id);
        chapters.then((ch) => {
            setChaptersList(ch);
        });
    }

    function listChaptersCtx() {
        if (!chaptersList) {
            fetchAndSetChaptersList();
        }
        return chaptersList ?? [];
    }
    const value: ProjectContextValue = {
        project,
        listChapters: listChaptersCtx(),
    };

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
}

export function useProject(): ProjectContextValue {
    const ctx = useContext(ProjectContext);

    if (!ctx) {
        throw new Error('useProject must be used inside a ProjectProvider');
    }
    return ctx;
}
