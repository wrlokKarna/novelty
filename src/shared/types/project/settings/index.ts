import type { Provider } from '../../ai/provider';

export type GeneralSettings = {
    enableAutoSave: boolean;
    autoSaveInterval: number;
    enableAutoBackup: boolean;
    autoBackupInterval: number;
    enableAutoSync: boolean;
    autoSyncInterval: number;
    enableAutoUpdate: boolean;
    autoUpdateInterval: number;
    theme: 'light' | 'dark' | 'system';
    chatViewMode: 'full' | 'truncate' | 'accordion';
    confirmBeforeDelete: boolean;
    autoNamingMethod: 'ai-summarizer' | 'smart-truncation';
    maxContextTokens: number;
    chapterContextMode: 'brief' | 'full';
    dailyTokenLimit: number;
    monthlyTokenLimit: number;
    dailyRequestLimit: number;
    monthlyRequestLimit: number;
};

export type ProjectSettings = {
    defaultProjectsDir: string | null;
    projectDirs: string[];
    openRecentProjectOnStartup: boolean;
    recentProjects: string[];
};

export type AssetLibrarySettings = {
    storagePath: string | null;
    autoCleanupEnabled: boolean;
    cleanupIntervalDays: number;
};

export type ModelDisplayMode = 'label' | 'alias' | 'both';
export type ProviderSettings = {
    configs: Provider[];
    modelDisplayMode: ModelDisplayMode;
};

export type EmbeddingSettings = {
    enabled: boolean;
    endpoint: string;
    model: string;
    dimension: number;
    chunkSize: number;
    chunkOverlap: number;
    autoIndexOnSave: boolean;
};

export type ContextSource = {
    entityType: string;
    entityId: string;
    label: string;
    score?: number;
};

export type StorageSettings = {
    encryptionMode: 'machine' | 'password';
    dataLocation: string;
    cacheSize: number;
};

export type SidebarConstraints = {
    enableCustomWidthCap: boolean;
    maxLeftWidth: number;
    maxRightWidth: number;
    leftWidth: number;
    rightWidth: number;
    enableAutoExpandLeft: boolean;
    leftPanelCollapsed: boolean;
    rightPanelCollapsed: boolean;
    enableAutoSwitchPanel: boolean;
};

export type AppearanceSettings = {
    theme: 'light' | 'dark' | 'system';
    fontSize: number;
    fontFamily: string;
    lineHeight: number;
    sidebarConstraints: SidebarConstraints;
    editorWidthMode: 'full' | 'fixed';
    editorMaxWidth: number;
    previewWidth: number;
    previewPosition: 'left' | 'right';
};

export type Settings = {
    general: GeneralSettings;
    projects: ProjectSettings;
    assetLibrary: AssetLibrarySettings;
    providers: ProviderSettings;
    storage: StorageSettings;
    appearance: AppearanceSettings;
    embeddings: EmbeddingSettings;
};
