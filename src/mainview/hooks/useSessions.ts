import { useState, useEffect, useCallback, useMemo } from 'react';
import { getRPC } from '../contexts/RPCContext';
import type { ChatSession, NewChatSession } from '../types/index';

interface UseSessionsReturn {
    sessions: ChatSession[];
    sessionsLoading: boolean;
    setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
    activeSessionId: string | null;
    setActiveSessionId: (id: string | null) => void;
    activeSessions: ChatSession[];
    archivedSessions: ChatSession[];
    createSession: (title?: string) => Promise<ChatSession>;
    renameSession: (id: string, title: string) => Promise<void>;
    archiveSession: (id: string) => Promise<void>;
    unarchiveSession: (id: string) => Promise<void>;
    deleteSession: (id: string) => Promise<void>;
}

export function useSessions(projectId?: string | null): UseSessionsReturn {
    const rpc = getRPC();
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    const loadSessions = useCallback(async () => {
        try {
            const result = projectId
                ? await rpc.request['db:get-sessions-by-project'](projectId)
                : await rpc.request['db:get-sessions']();
            setSessions(result || []);
        } catch (e) {
            console.error('Failed to load sessions:', e);
        } finally {
            setSessionsLoading(false);
        }
    }, [rpc, projectId]);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    const activeSessions = useMemo(
        () => sessions.filter((s) => !s.isArchived),
        [sessions]
    );

    const archivedSessions = useMemo(
        () => sessions.filter((s) => s.isArchived),
        [sessions]
    );

    const createSession = useCallback(
        async (title?: string): Promise<ChatSession> => {
            const newSession: NewChatSession = {
                id: crypto.randomUUID(),
                projectId: projectId ?? null,
                title: title || 'New Chat',
                isArchived: false,
                isManuallyNamed: false,
            };
            const created = await rpc.request['db:create-session'](newSession);
            setSessions((prev) => [...prev, created]);
            return created;
        },
        [rpc, projectId]
    );

    const archiveSession = useCallback(
        async (id: string) => {
            await rpc.request['db:update-session']({
                id,
                data: { isArchived: true } as Partial<NewChatSession>,
            });
            setSessions((prev) =>
                prev.map((s) => (s.id === id ? { ...s, isArchived: true } : s))
            );
        },
        [rpc]
    );

    const unarchiveSession = useCallback(
        async (id: string) => {
            await rpc.request['db:update-session']({
                id,
                data: { isArchived: false } as Partial<NewChatSession>,
            });
            setSessions((prev) =>
                prev.map((s) => (s.id === id ? { ...s, isArchived: false } : s))
            );
        },
        [rpc]
    );

    const renameSession = useCallback(
        async (id: string, title: string) => {
            await rpc.request['db:update-session']({
                id,
                data: {
                    title,
                    isManuallyNamed: true,
                } as Partial<NewChatSession>,
            });
            setSessions((prev) =>
                prev.map((s) =>
                    s.id === id ? { ...s, title, isManuallyNamed: true } : s
                )
            );
        },
        [rpc]
    );

    const deleteSession = useCallback(
        async (id: string) => {
            await rpc.request['db:delete-session'](id);
            setSessions((prev) => prev.filter((s) => s.id !== id));
            setActiveSessionId((prev) => (prev === id ? null : prev));
        },
        [rpc]
    );

    return {
        sessions,
        sessionsLoading,
        setSessions,
        activeSessionId,
        setActiveSessionId,
        activeSessions,
        archivedSessions,
        createSession,
        renameSession,
        archiveSession,
        unarchiveSession,
        deleteSession,
    };
}
