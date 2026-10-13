import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from 'react';
import { getRPC } from './RPCContext';
import type { Settings, Provider } from '../types/index';

interface SettingsContextType {
    settings: Settings | null;
    loading: boolean;
    isLocked: boolean;
    encryptionMode: 'machine' | 'password' | 'none';
    updateSetting: <K extends keyof Settings>(
        key: K,
        value: Settings[K]
    ) => Promise<void>;
    updateGeneral: <K extends keyof Settings['general']>(
        key: K,
        value: Settings['general'][K]
    ) => Promise<void>;
    updateProjects: <K extends keyof Settings['projects']>(
        key: K,
        value: Settings['projects'][K]
    ) => Promise<void>;
    updateAssetLibrary: <K extends keyof Settings['assetLibrary']>(
        key: K,
        value: Settings['assetLibrary'][K]
    ) => Promise<void>;
    updateProviders: <K extends keyof Settings['providers']>(
        key: K,
        value: Settings['providers'][K]
    ) => Promise<boolean>;
    updateProviderConf: (index: number, config: Provider) => Promise<boolean>;
    deleteProvider: (index: number) => Promise<boolean>;
    updateStorage: <K extends keyof Settings['storage']>(
        key: K,
        value: Settings['storage'][K]
    ) => Promise<void>;
    updateAppearance: <K extends keyof Settings['appearance']>(
        key: K,
        value: Settings['appearance'][K]
    ) => Promise<void>;
    updateEmbeddings: <K extends keyof Settings['embeddings']>(
        key: K,
        value: Settings['embeddings'][K]
    ) => Promise<void>;
    setEncryption: (
        mode: 'machine' | 'password',
        password?: string
    ) => Promise<void>;
    unlock: (password: string) => Promise<boolean>;
    lock: () => Promise<void>;
    reset: () => Promise<void>;
    clearCache: () => Promise<number>;
    getCacheSize: () => Promise<number>;
    openDirectory: (title: string) => Promise<string | null>;
    openProjectFolder: (projectId: string) => Promise<void>;
    revealInExplorer: (path: string) => Promise<void>;
    saveFile: (
        title: string,
        defaultPath: string,
        filters: { name: string; extensions: string[] }[]
    ) => Promise<string | null>;
    openFile: (
        title: string,
        filters: { name: string; extensions: string[] }[]
    ) => Promise<string | null>;
    refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLocked, setIsLocked] = useState(false);
    const [encryptionMode, setEncryptionMode] = useState<
        'machine' | 'password' | 'none'
    >('none');

    const loadSettings = useCallback(async () => {
        await new Promise((r) => setTimeout(r, 1000));
        const rpc = getRPC();
        console.log('Loading settings...');
        try {
            const [loadedSettings, locked, mode] = await Promise.all([
                rpc.request['settings:get-all'](),
                rpc.request['settings:is-locked'](),
                rpc.request['settings:get-encryption-mode'](),
                console.log(
                    'Settings loaded',
                    rpc.request['settings:get-all']()
                ),
            ]);
            console.log('Settings loaded', loadedSettings, locked, mode);
            setSettings(loadedSettings);
            setIsLocked(locked);
            setEncryptionMode(mode);
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const updateSetting = useCallback(
        async <K extends keyof Settings>(
            key: K,
            value: Settings[K]
        ): Promise<void> => {
            const rpc = getRPC();
            if (isLocked) throw new Error('Settings are locked');

            await rpc.request['settings:set']({ key, value });
            await loadSettings();
        },
        [isLocked, loadSettings]
    );

    const updateGeneral = useCallback(
        async <K extends keyof Settings['general']>(
            key: K,
            value: Settings['general'][K]
        ) => {
            if (!settings || isLocked) return;
            const newGeneral = { ...settings.general, [key]: value };
            await updateSetting('general', newGeneral);
        },
        [settings, isLocked, updateSetting]
    );

    const updateProjects = useCallback(
        async <K extends keyof Settings['projects']>(
            key: K,
            value: Settings['projects'][K]
        ) => {
            if (!settings || isLocked) return;
            const newProjects = { ...settings.projects, [key]: value };
            await updateSetting('projects', newProjects);
        },
        [settings, isLocked, updateSetting]
    );

    const updateAssetLibrary = useCallback(
        async <K extends keyof Settings['assetLibrary']>(
            key: K,
            value: Settings['assetLibrary'][K]
        ) => {
            if (!settings || isLocked) return;
            const newAssetLibrary = { ...settings.assetLibrary, [key]: value };
            await updateSetting('assetLibrary', newAssetLibrary);
        },
        [settings, isLocked, updateSetting]
    );

    const updateProviders = useCallback(
        async <K extends keyof Settings['providers']>(
            key: K,
            value: Settings['providers'][K]
        ): Promise<boolean> => {
            if (!settings || isLocked) return false;
            try {
                const newProviders = { ...settings.providers, [key]: value };
                await updateSetting('providers', newProviders);
                return true;
            } catch (error) {
                console.error('Failed to update providers setting', error);
                return false;
            }
        },
        [settings, isLocked, updateSetting]
    );

    const updateProviderConf = useCallback(
        async (index: number, conf: Provider): Promise<boolean> => {
            if (!settings || isLocked) return false;
            try {
                const newConfigs = [...settings.providers.configs];
                if (index === -1) {
                    newConfigs.push(conf);
                } else {
                    newConfigs[index] = conf;
                }
                return await updateProviders('configs', newConfigs);
            } catch (error) {
                console.error(
                    'Failed to update provider configuration:',
                    error
                );
                return false;
            }
        },
        [settings, isLocked, updateProviders]
    );

    const deleteProvider = useCallback(
        async (index: number): Promise<boolean> => {
            if (!settings || isLocked) return false;
            try {
                const newConfigs = settings.providers.configs.filter(
                    (_, i) => i !== index
                );
                return await updateProviders('configs', newConfigs);
            } catch (error) {
                console.error('Failed to delete provider:', error);
                return false;
            }
        },
        [settings, isLocked, updateProviders]
    );

    const updateStorage = useCallback(
        async <K extends keyof Settings['storage']>(
            key: K,
            value: Settings['storage'][K]
        ) => {
            if (!settings || isLocked) return;
            const newStorage = { ...settings.storage, [key]: value };
            await updateSetting('storage', newStorage);
        },
        [settings, isLocked, updateSetting]
    );

    const updateAppearance = useCallback(
        async <K extends keyof Settings['appearance']>(
            key: K,
            value: Settings['appearance'][K]
        ) => {
            if (!settings || isLocked) return;
            const newAppearance = { ...settings.appearance, [key]: value };
            await updateSetting('appearance', newAppearance);
        },
        [settings, isLocked, updateSetting]
    );

    const updateEmbeddings = useCallback(
        async <K extends keyof Settings['embeddings']>(
            key: K,
            value: Settings['embeddings'][K]
        ) => {
            if (!settings || isLocked) return;
            const current = settings.embeddings ?? {
                enabled: false,
                endpoint: 'http://localhost:1234/v1',
                model: 'nomic-embed-text',
                dimension: 768,
                chunkSize: 500,
                chunkOverlap: 50,
                autoIndexOnSave: true,
            };
            const newEmbeddings = { ...current, [key]: value };
            await updateSetting('embeddings', newEmbeddings);
        },
        [settings, isLocked, updateSetting]
    );

    const setEncryption = useCallback(
        async (mode: 'machine' | 'password', password?: string) => {
            const rpc = getRPC();
            await rpc.request['settings:set-encryption']({ mode, password });
            await loadSettings();
        },
        [loadSettings]
    );

    const unlock = useCallback(
        async (password: string): Promise<boolean> => {
            const rpc = getRPC();
            const success = await rpc.request['settings:unlock']({ password });
            if (success) {
                await loadSettings();
            }
            return success;
        },
        [loadSettings]
    );

    const lock = useCallback(async () => {
        const rpc = getRPC();
        await rpc.request['settings:lock']();
        setIsLocked(true);
        setSettings(null);
    }, []);

    const reset = useCallback(async () => {
        const rpc = getRPC();
        await rpc.request['settings:reset']();
        await loadSettings();
    }, [loadSettings]);

    const clearCache = useCallback(async (): Promise<number> => {
        const rpc = getRPC();
        return await rpc.request['storage:clear-cache']();
    }, []);

    const getCacheSize = useCallback(async (): Promise<number> => {
        const rpc = getRPC();
        return await rpc.request['storage:get-cache-size']();
    }, []);

    const openDirectory = useCallback(
        async (title: string): Promise<string | null> => {
            const rpc = getRPC();
            return await rpc.request['dialog:open-directory']({ title });
        },
        []
    );

    const openProjectFolder = useCallback(
        async (projectId: string): Promise<void> => {
            const rpc = getRPC();
            await rpc.request['open-project-folder'](projectId);
        },
        []
    );

    const revealInExplorer = useCallback(
        async (path: string): Promise<void> => {
            const rpc = getRPC();
            await rpc.request['reveal-in-explorer'](path);
        },
        []
    );

    const saveFile = useCallback(
        async (
            title: string,
            defaultPath: string,
            filters: { name: string; extensions: string[] }[]
        ): Promise<string | null> => {
            const rpc = getRPC();
            return await rpc.request['dialog:save-file']({
                title,
                defaultPath,
                filters,
            });
        },
        []
    );

    const openFile = useCallback(
        async (
            title: string,
            filters: { name: string; extensions: string[] }[]
        ): Promise<string | null> => {
            const rpc = getRPC();
            return await rpc.request['dialog:open-file']({ title, filters });
        },
        []
    );

    const value: SettingsContextType = {
        settings,
        loading,
        isLocked,
        encryptionMode,
        updateSetting,
        updateGeneral,
        updateProjects,
        updateAssetLibrary,
        updateProviders,
        updateProviderConf,
        deleteProvider,
        updateStorage,
        updateAppearance,
        updateEmbeddings,
        setEncryption,
        unlock,
        lock,
        reset,
        clearCache,
        getCacheSize,
        openDirectory,
        openProjectFolder,
        revealInExplorer,
        saveFile,
        openFile,
        refreshSettings: loadSettings,
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
