import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

interface ProjectContextValue {
    listChapters: number[];
}

const ProjectContext = createContext<ProjectContextValue | undefined>(
    undefined
);

export default function ProjectProvider({ children }: { children: ReactNode }) {
    const value = { listChapters: [1, 2, 3, 4] };

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
