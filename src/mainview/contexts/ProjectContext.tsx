import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { useRPC } from '@/mainview/contexts/RPCContext';
import type { Project } from '@/shared/types';
import type { Chapter } from '@/shared/types/project';

interface ProjectContextValue {
    project: Project | null;
    chapters: Chapter[];
    isLoadingProject: boolean;
    isLoadingChapters: boolean;
    error: unknown;
    refreshProject: () => Promise<void>;
    refreshChapters: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(
    undefined
);

export function ProjectProvider({ children }: { children: ReactNode }) {
    const rpc = useRPC();

    const [project, setProject] = useState<Project | null>(null);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [isLoadingProject, setIsLoadingProject] = useState<boolean>(true);
    const [isLoadingChapters, setIsLoadingChapters] = useState<boolean>(false);
    const [error, setError] = useState<unknown>(null);

    const refreshProject = useCallback(async () => {
        setIsLoadingProject(true);
        setError(null);
        try {
            const currentProject =
                (await rpc.request['project:get-current']()) ?? null;
            setProject(currentProject);
        } catch (err) {
            console.error('Failed to fetch current project:', err);
            setError(err);
            setProject(null);
        } finally {
            setIsLoadingProject(false);
        }
    }, [rpc]);

    const refreshChapters = useCallback(async () => {
        if (!project?.id) {
            setChapters([]);
            return;
        }

        setIsLoadingChapters(true);
        setError(null);
        try {
            const nextChapters = await rpc.request['db:get-chapters'](
                project.id
            );
            setChapters(nextChapters ?? []);
        } catch (err) {
            console.error('Failed to fetch chapters:', err);
            setError(err);
        } finally {
            setIsLoadingChapters(false);
        }
    }, [rpc, project?.id]);

    useEffect(() => {
        void refreshProject();
    }, [refreshProject]);

    useEffect(() => {
        if (!project?.id) {
            setChapters([]);
            return;
        }
        void refreshChapters();
    }, [project?.id, refreshChapters]);

    const value = useMemo<ProjectContextValue>(
        () => ({
            project,
            chapters,
            isLoadingProject,
            isLoadingChapters,
            error,
            refreshProject,
            refreshChapters,
        }),
        [
            project,
            chapters,
            isLoadingProject,
            isLoadingChapters,
            error,
            refreshProject,
            refreshChapters,
        ]
    );

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
