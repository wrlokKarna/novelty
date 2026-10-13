import {
    IconGeneralTab,
    IconTemplatesTab,
    IconCoversTab,
    IconDangerZoneTab,
    IconAboutTab,
    IconAppearanceTab,
    IconAssetsTab,
    IconContextTab,
    IconProjectsTab,
    IconProvidersTab,
    IconQuotaTab,
    IconStorageTab,
} from '../theme/icons';

// ------ <PROJECT_DIALOG_TABS> ----- //
export const PROJECT_DIALOG_TABS = [
    { label: 'general', description: '' },
    { label: 'templates', description: '' },
    { label: 'covers', description: '' },
    { label: 'danger zone', description: '' },
] as const;
export type ProjectDialogActiveTab =
    (typeof PROJECT_DIALOG_TABS)[number]['label'];

export const PROJECT_DIALOG_TABS_ICONS = [
    IconGeneralTab,
    IconTemplatesTab,
    IconCoversTab,
    IconDangerZoneTab,
] as const;

// ------ <SETTINGS_DIALOG_TABS> ----- //
export const SETTINGS_DIALOG_TABS = [
    {
        label: 'general',
        description: 'General settings for settings',
        //component: GeneralTab,
    },
    {
        label: 'appearance',
        description: 'Appearance settings',
        //component: AppearanceTab,
    },
    {
        label: 'projects',
        description: 'Manage projects',
        //component: ProjectsTab,
    },
    {
        label: 'asset library',
        description: 'Manage assets',
        //component: AssetLibraryTab,
    },
    {
        label: 'providers',
        description: 'Manage providers',
        //component: ProvidersTab,
    },
    {
        label: 'embeddings',
        description: 'Configure RAG and embeddings',
        //component: EmbeddingsTab,
    },
    {
        label: 'quota & usage',
        description: 'Monitor and control API usage',
        //component: QuotaTab,
    },
    {
        label: 'storage',
        description: 'Manage storage',
        //component: StorageTab,
    },
    {
        label: 'about',
        description: 'About this app',
        //component: AboutTab,
    },
] as const;
export type SettingsDialogActiveTab =
    (typeof SETTINGS_DIALOG_TABS)[number]['label'];

export const SETTINGS_DIALOG_TABS_ICONS = [
    IconGeneralTab,
    IconAppearanceTab,
    IconProjectsTab,
    IconAssetsTab,
    IconProvidersTab,
    IconContextTab,
    IconQuotaTab,
    IconStorageTab,
    IconAboutTab,
] as const;
