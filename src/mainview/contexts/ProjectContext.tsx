import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
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

    const projectRequestIdRef = useRef<number>(0);
    const chaptersRequestIdRef = useRef<number>(0);

    const runProjectFetch = useCallback(
        async (isCancelled?: () => boolean) => {
            const requestId = ++projectRequestIdRef.current;
            const isStale = () =>
                Boolean(isCancelled?.()) ||
                requestId !== projectRequestIdRef.current;

            setIsLoadingProject(true);
            setError(null);

            try {
                const currentProject =
                    (await rpc.request['project:get-current']()) ?? null;
                if (isStale()) return;
                setProject(currentProject);
            } catch (err) {
                if (isStale()) return;
                console.error('Failed to fetch current project:', err);
                setError(err);
                setProject(null);
            } finally {
                if (requestId === projectRequestIdRef.current) {
                    setIsLoadingProject(false);
                }
            }
        },
        [rpc]
    );

    const runChaptersFetch = useCallback(
        async (projectId: string | undefined, isCancelled?: () => boolean) => {
            const requestId = ++chaptersRequestIdRef.current;
            const isStale = () =>
                Boolean(isCancelled?.()) ||
                requestId !== chaptersRequestIdRef.current;

            if (!projectId) {
                setChapters([]);
                setIsLoadingChapters(false);
                return;
            }

            setIsLoadingChapters(true);
            setError(null);

            try {
                const nextChapters =
                    await rpc.request['db:get-chapters'](projectId);
                if (isStale()) return;
                setChapters(nextChapters ?? []);
            } catch (err) {
                if (isStale()) return;
                console.error('Failed to fetch chapters:', err);
                setError(err);
            } finally {
                if (requestId === chaptersRequestIdRef.current) {
                    setIsLoadingChapters(false);
                }
            }
        },
        [rpc]
    );

    const refreshProject = useCallback(async () => {
        await runProjectFetch();
    }, [runProjectFetch]);

    const refreshChapters = useCallback(async () => {
        await runChaptersFetch(project?.id);
    }, [runChaptersFetch, project?.id]);

    useEffect(() => {
        let cancelled = false;
        void runProjectFetch(() => cancelled);

        return () => {
            cancelled = true;
            // Invalidate in-flight project requests on unmount
            ++projectRequestIdRef.current;
        };
    }, [runProjectFetch]);

    useEffect(() => {
        let cancelled = false;
        setChapters([]);
        void runChaptersFetch(project?.id, () => cancelled);

        return () => {
            cancelled = true;
            // Invalidate in-flight chapter requests when project changes or unmounts
            ++chaptersRequestIdRef.current;
        };
    }, [project?.id, runChaptersFetch]);

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
