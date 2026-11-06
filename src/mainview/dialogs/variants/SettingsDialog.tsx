import { useState, useEffect } from 'react';
import Dialog from '../Dialog';
import localStyles from '../Dialog.module.css';
import { useSettings } from '../../contexts/SettingsContext';
import { getRPC } from '../../contexts/RPCContext';
import {
    SETTINGS_DIALOG_TABS,
    SETTINGS_DIALOG_TABS_ICONS,
    type SettingsDialogActiveTab,
} from '../../constants/layout_tabs';
import { IconFolder, IconChevronDown } from '@tabler/icons-react';
import IconTextSideBar from '../../ui/layout/IconTextSideBar';
import SettingsCard from '../../components/cards/SettingsCard';

import styles from './SettingsDialog.module.css';
import SplitDialogLayout from '../../ui/layout/SplitDialogLayout';

import ProviderCard from '../../components/cards/ProviderCard';
import ProvidersList from '../../components/lists/ProvidersList';

interface SettingsRoute {
    tab: SettingsDialogActiveTab;
    section?: string;
    focus?: string;
}

interface SettingsDialogProps {
    open: boolean;
    onClose: () => void;
    defaultRoute?: SettingsRoute;
}

function Toggle({
    checked,
    onChange,
    disabled,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            className={`${styles.toggleSwitch} ${checked ? styles.toggleActive : ''}`}
            onClick={() => onChange(!checked)}
            disabled={disabled}
        >
            <span className={styles.toggleThumb} />
        </button>
    );
}

function NumberInput({
    value,
    onChange,
    min,
    max,
    disabled,
    id,
}: {
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    disabled?: boolean;
    id: string;
}) {
    return (
        <input
            id={id}
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            min={min}
            max={max}
            disabled={disabled}
            className={styles.numberInput}
        />
    );
}

function GeneralTab() {
    const { settings, updateGeneral, isLocked } = useSettings();
    if (!settings) return null;

    return (
        <div className={styles.tabContent}>
            <SettingsCard>
                <div className={styles.settingsSectionLabel}>General</div>
                <div className={styles.settingRow}>
                    <span>Enable Auto Save</span>
                    <Toggle
                        checked={settings.general.enableAutoSave}
                        onChange={(v) => updateGeneral('enableAutoSave', v)}
                        disabled={isLocked}
                    />
                </div>
                <div className={styles.settingRow}>
                    <span>Auto Save Interval (minutes)</span>
                    <NumberInput
                        id="autoSaveInterval"
                        value={settings.general.autoSaveInterval}
                        onChange={(v) => updateGeneral('autoSaveInterval', v)}
                        min={1}
                        max={60}
                        disabled={isLocked || !settings.general.enableAutoSave}
                    />
                </div>
                <div className={styles.settingRow}>
                    <span>Enable Auto Backup</span>
                    <Toggle
                        checked={settings.general.enableAutoBackup}
                        onChange={(v) => updateGeneral('enableAutoBackup', v)}
                        disabled={isLocked}
                    />
                </div>
                <div className={styles.settingRow}>
                    <span>Auto Backup Interval (hours)</span>
                    <NumberInput
                        id="autoBackupInterval"
                        value={settings.general.autoBackupInterval}
                        onChange={(v) => updateGeneral('autoBackupInterval', v)}
                        min={1}
                        max={168}
                        disabled={
                            isLocked || !settings.general.enableAutoBackup
                        }
                    />
                </div>
                <div className={styles.settingRow}>
                    <span>Enable Auto Sync</span>
                    <Toggle
                        checked={settings.general.enableAutoSync}
                        onChange={(v) => updateGeneral('enableAutoSync', v)}
                        disabled={isLocked}
                    />
                </div>
                <div className={styles.settingRow}>
                    <span>Auto Sync Interval (minutes)</span>
                    <NumberInput
                        id="autoSyncInterval"
                        value={settings.general.autoSyncInterval}
                        onChange={(v) => updateGeneral('autoSyncInterval', v)}
                        min={1}
                        max={60}
                        disabled={isLocked || !settings.general.enableAutoSync}
                    />
                </div>
                <div className={styles.settingRow}>
                    <span>Enable Auto Update</span>
                    <Toggle
                        checked={settings.general.enableAutoUpdate}
                        onChange={(v) => updateGeneral('enableAutoUpdate', v)}
                        disabled={isLocked}
                    />
                </div>
                <div className={styles.settingRow}>
                    <span>Auto Update Interval (hours)</span>
                    <NumberInput
                        id="autoUpdateInterval"
                        value={settings.general.autoUpdateInterval}
                        onChange={(v) => updateGeneral('autoUpdateInterval', v)}
                        min={1}
                        max={168}
                        disabled={
                            isLocked || !settings.general.enableAutoUpdate
                        }
                    />
                </div>
            </SettingsCard>

            <SettingsCard>
                <div className={styles.settingsSectionLabel}>Chat</div>
                <div className={styles.settingRow}>
                    <span>Chat View</span>
                    <div className={styles.selectWrapper}>
                        <select
                            value={settings.general.chatViewMode}
                            onChange={(e) =>
                                updateGeneral(
                                    'chatViewMode',
                                    e.target.value as
                                        'full' | 'truncate' | 'accordion'
                                )
                            }
                            disabled={isLocked}
                            className={styles.select}
                        >
                            <option value="full">Full</option>
                            <option value="truncate">Truncate</option>
                            <option value="accordion">Accordion</option>
                        </select>
                        <IconChevronDown
                            size={14}
                            className={styles.selectIcon}
                        />
                    </div>
                </div>
                <div className={styles.settingRow}>
                    <span>Ask me before deleting sessions</span>
                    <Toggle
                        checked={settings.general.confirmBeforeDelete}
                        onChange={(v) =>
                            updateGeneral('confirmBeforeDelete', v)
                        }
                        disabled={isLocked}
                    />
                </div>
                <div className={styles.settingRow}>
                    <span>Auto-naming method</span>
                    <div className={styles.selectWrapper}>
                        <select
                            value={settings.general.autoNamingMethod}
                            onChange={(e) =>
                                updateGeneral(
                                    'autoNamingMethod',
                                    e.target.value as
                                        'ai-summarizer' | 'smart-truncation'
                                )
                            }
                            disabled={isLocked}
                            className={styles.select}
                        >
                            <option value="ai-summarizer">
                                AI Summarizer (Smart)
                            </option>
                            <option value="smart-truncation">
                                Smart Truncation (Local)
                            </option>
                        </select>
                        <IconChevronDown
                            size={14}
                            className={styles.selectIcon}
                        />
                    </div>
                </div>
            </SettingsCard>

            <SettingsCard>
                <div className={styles.settingsSectionLabel}>AI Context</div>
                <div className={styles.settingRow}>
                    <span>Max Context Tokens</span>
                    <NumberInput
                        id="maxContextTokens"
                        value={settings.general.maxContextTokens}
                        onChange={(v) => updateGeneral('maxContextTokens', v)}
                        min={1024}
                        max={32000}
                        disabled={isLocked}
                    />
                </div>
                <div className={styles.settingRow}>
                    <span>Chapter Context Mode</span>
                    <div className={styles.selectWrapper}>
                        <select
                            value={settings.general.chapterContextMode}
                            onChange={(e) =>
                                updateGeneral(
                                    'chapterContextMode',
                                    e.target.value as 'brief' | 'full'
                                )
                            }
                            disabled={isLocked}
                            className={styles.select}
                        >
                            <option value="brief">
                                Brief (first ~800 chars)
                            </option>
                            <option value="full">Full Chapter</option>
                        </select>
                        <IconChevronDown
                            size={14}
                            className={styles.selectIcon}
                        />
                    </div>
                </div>
                <div className={styles.settingRow}>
                    <span>Theme</span>
                    <div className={styles.selectWrapper}>
                        <select
                            value={settings.general.theme}
                            onChange={(e) =>
                                updateGeneral(
                                    'theme',
                                    e.target.value as
                                        'light' | 'dark' | 'system'
                                )
                            }
                            disabled={isLocked}
                            className={styles.select}
                        >
                            <option value="system">System</option>
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                        </select>
                        <IconChevronDown
                            size={14}
                            className={styles.selectIcon}
                        />
                    </div>
                </div>
            </SettingsCard>
        </div>
    );
}

function AppearanceTab() {
    const { settings, updateAppearance, isLocked } = useSettings();
    if (!settings) return null;
    const c = settings.appearance.sidebarConstraints ?? {
        enableCustomWidthCap: false,
        maxLeftWidth: 400,
        maxRightWidth: 700,
        leftWidth: 280,
        rightWidth: 550,
        enableAutoExpandLeft: false,
        enableAutoSwitchPanel: true,
    };

    return (
        <div className={styles.tabContent}>
            <SettingsCard>
                <div className={styles.settingsSectionLabel}>
                    Sidebar Constraints
                </div>
                <div className={styles.settingRow}>
                    <span>Enable Custom Width Cap</span>
                    <Toggle
                        checked={c.enableCustomWidthCap}
                        onChange={(v) =>
                            updateAppearance('sidebarConstraints', {
                                ...c,
                                enableCustomWidthCap: v,
                            })
                        }
                        disabled={isLocked}
                    />
                </div>
                {c.enableCustomWidthCap && (
                    <>
                        <div className={styles.settingRow}>
                            <span>Max Left Sidebar Width (px)</span>
                            <NumberInput
                                id="maxLeftWidth"
                                value={c.maxLeftWidth}
                                onChange={(v) =>
                                    updateAppearance('sidebarConstraints', {
                                        ...c,
                                        maxLeftWidth: v || 400,
                                    })
                                }
                                min={220}
                                max={1200}
                                disabled={isLocked}
                            />
                        </div>
                        <div className={styles.settingRow}>
                            <span>Max Right Sidebar Width (px)</span>
                            <NumberInput
                                id="maxRightWidth"
                                value={c.maxRightWidth}
                                onChange={(v) =>
                                    updateAppearance('sidebarConstraints', {
                                        ...c,
                                        maxRightWidth: v || 700,
                                    })
                                }
                                min={400}
                                max={2000}
                                disabled={isLocked}
                            />
                        </div>
                    </>
                )}
                <div className={styles.settingRow}>
                    <span>Enable Auto Expand Left on Hover</span>
                    <Toggle
                        checked={c.enableAutoExpandLeft}
                        onChange={(v) =>
                            updateAppearance('sidebarConstraints', {
                                ...c,
                                enableAutoExpandLeft: v,
                            })
                        }
                        disabled={isLocked}
                    />
                </div>
                <div className={styles.settingRow}>
                    <span>
                        Auto-switch Left Panel to Match Active Editor Tab
                    </span>
                    <Toggle
                        checked={c.enableAutoSwitchPanel}
                        onChange={(v) =>
                            updateAppearance('sidebarConstraints', {
                                ...c,
                                enableAutoSwitchPanel: v,
                            })
                        }
                        disabled={isLocked}
                    />
                </div>
            </SettingsCard>

            <SettingsCard>
                <div className={styles.settingsSectionLabel}>Editor Width</div>
                <div className={styles.settingRow}>
                    <span>Editor Width Mode</span>
                    <div className={styles.segmentedToggle}>
                        <button
                            type="button"
                            className={
                                settings.appearance.editorWidthMode !== 'fixed'
                                    ? styles.activeSegment
                                    : ''
                            }
                            onClick={() =>
                                updateAppearance('editorWidthMode', 'full')
                            }
                            disabled={isLocked}
                        >
                            Full Width (100%)
                        </button>
                        <button
                            type="button"
                            className={
                                settings.appearance.editorWidthMode === 'fixed'
                                    ? styles.activeSegment
                                    : ''
                            }
                            onClick={() =>
                                updateAppearance('editorWidthMode', 'fixed')
                            }
                            disabled={isLocked}
                        >
                            Fixed Width
                        </button>
                    </div>
                </div>
                {settings.appearance.editorWidthMode === 'fixed' && (
                    <div className={styles.settingRow}>
                        <span>Max Editor Width (px)</span>
                        <NumberInput
                            id="editorMaxWidth"
                            value={settings.appearance.editorMaxWidth}
                            onChange={(v) =>
                                updateAppearance('editorMaxWidth', v || 800)
                            }
                            min={400}
                            max={1600}
                            disabled={isLocked}
                        />
                    </div>
                )}
            </SettingsCard>

            <SettingsCard>
                <div className={styles.settingsSectionLabel}>Preview</div>
                <div className={styles.settingRow}>
                    <span>Preview Position</span>
                    <div className={styles.segmentedToggle}>
                        <button
                            type="button"
                            className={
                                settings.appearance.previewPosition !== 'left'
                                    ? styles.activeSegment
                                    : ''
                            }
                            onClick={() =>
                                updateAppearance('previewPosition', 'right')
                            }
                            disabled={isLocked}
                        >
                            Right
                        </button>
                        <button
                            type="button"
                            className={
                                settings.appearance.previewPosition === 'left'
                                    ? styles.activeSegment
                                    : ''
                            }
                            onClick={() =>
                                updateAppearance('previewPosition', 'left')
                            }
                            disabled={isLocked}
                        >
                            Left
                        </button>
                    </div>
                </div>
            </SettingsCard>
        </div>
    );
}

function ProjectsTab() {
    const {
        settings,
        updateProjects,
        openDirectory,
        revealInExplorer,
        isLocked,
    } = useSettings();
    if (!settings) return null;

    const handleSelectPath = async () => {
        const path = await openDirectory('Select Default Projects Directory');
        if (path) {
            updateProjects('defaultProjectsDir', path);
        }
    };

    const handleOpenProjects = async () => {
        const rpc = getRPC();
        await rpc.request['open-projects']();
    };

    const handleOpenProjectFolder = async () => {
        if (settings.projects.defaultProjectsDir) {
            await revealInExplorer(settings.projects.defaultProjectsDir);
        }
    };

    const handleOpenProject = async (projectId: string) => {
        const rpc = getRPC();
        await rpc.request['open-project-folder'](projectId);
    };

    return (
        <div className={styles.tabContent}>
            <SettingsCard>
                <div className={styles.settingsSectionLabel}>
                    Project Directory
                </div>
                <div className={styles.settingRowStacked}>
                    <div className={styles.labelMuted}>
                        Default Projects Directory
                    </div>
                    <div className={styles.pathRow}>
                        <input
                            type="text"
                            value={settings.projects.defaultProjectsDir || ''}
                            readOnly
                            placeholder="Not set"
                            className={styles.textInput}
                        />
                        <button
                            type="button"
                            onClick={handleSelectPath}
                            disabled={isLocked}
                            className={styles.btnSecondary}
                        >
                            Browse
                        </button>
                    </div>
                </div>
                <div className={styles.buttonRow}>
                    <button
                        type="button"
                        onClick={handleOpenProjects}
                        disabled={isLocked}
                        className={styles.btnSecondary}
                    >
                        Open Projects
                    </button>
                    <button
                        type="button"
                        onClick={handleOpenProjectFolder}
                        disabled={
                            isLocked || !settings.projects.defaultProjectsDir
                        }
                        className={styles.btnSecondary}
                    >
                        Open Projects Folder
                    </button>
                </div>
                <div className={styles.settingRow}>
                    <span>Open Recent Project on Startup</span>
                    <Toggle
                        checked={settings.projects.openRecentProjectOnStartup}
                        onChange={(v) =>
                            updateProjects('openRecentProjectOnStartup', v)
                        }
                        disabled={isLocked}
                    />
                </div>
            </SettingsCard>

            <SettingsCard>
                <div className={styles.settingsSectionLabel}>
                    <span>Recent Projects</span>
                    <span className={styles.counterBadge}>
                        {settings.projects.recentProjects.length}
                    </span>
                </div>
                {settings.projects.recentProjects.length > 0 ? (
                    <div className={styles.listSection}>
                        {settings.projects.recentProjects.map((id) => (
                            <div key={id} className={styles.listItem}>
                                <span className={styles.monoId}>{id}</span>
                                <button
                                    type="button"
                                    onClick={() => handleOpenProject(id)}
                                    disabled={isLocked}
                                    className={styles.btnIcon}
                                    title="Open project folder"
                                >
                                    <IconFolder size={15} />
                                </button>
                            </div>
                        ))}
                        <div className={styles.listFooter}>
                            <button
                                type="button"
                                onClick={() =>
                                    updateProjects('recentProjects', [])
                                }
                                disabled={isLocked}
                                className={styles.btnDanger}
                            >
                                Clear Recent
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        No recent projects found.
                    </div>
                )}
            </SettingsCard>
        </div>
    );
}

function AssetLibraryTab() {
    const { settings, updateAssetLibrary, openDirectory, isLocked } =
        useSettings();
    if (!settings) return null;

    const handleSelectPath = async () => {
        const path = await openDirectory('Select Asset Library Path');
        if (path) {
            updateAssetLibrary('storagePath', path);
        }
    };

    return (
        <div className={styles.tabContent}>
            <SettingsCard>
                <div className={styles.settingsSectionLabel}>
                    Storage Configuration
                </div>
                <div className={styles.settingRowStacked}>
                    <div className={styles.labelMuted}>Storage Path</div>
                    <div className={styles.pathRow}>
                        <input
                            type="text"
                            value={settings.assetLibrary.storagePath || ''}
                            readOnly
                            placeholder="Not set"
                            className={styles.textInput}
                        />
                        <button
                            type="button"
                            onClick={handleSelectPath}
                            disabled={isLocked}
                            className={styles.btnSecondary}
                        >
                            Browse
                        </button>
                    </div>
                </div>
                <div className={styles.settingRow}>
                    <span>Enable Auto Cleanup</span>
                    <Toggle
                        checked={settings.assetLibrary.autoCleanupEnabled}
                        onChange={(v) =>
                            updateAssetLibrary('autoCleanupEnabled', v)
                        }
                        disabled={isLocked}
                    />
                </div>
                <div className={styles.settingRow}>
                    <span>Cleanup Interval (days)</span>
                    <NumberInput
                        id="cleanupIntervalDays"
                        value={settings.assetLibrary.cleanupIntervalDays}
                        onChange={(v) =>
                            updateAssetLibrary('cleanupIntervalDays', v)
                        }
                        min={1}
                        max={365}
                        disabled={
                            isLocked ||
                            !settings.assetLibrary.autoCleanupEnabled
                        }
                    />
                </div>
            </SettingsCard>
        </div>
    );
}

function ProvidersTab() {
    const { settings, updateProviders, isLocked } = useSettings();
    const [showNewProvider, setShowNewProvider] = useState(false);

    return (
        <div className={styles.tabContent} id="settings-section-providers-list">
            <SettingsCard>
                <div className={styles.settingRow}>
                    <label
                        htmlFor="modelDisplayMode"
                        className={styles.rowLabel}
                    >
                        Model Labeling
                    </label>
                    <div className={styles.selectWrapper}>
                        <select
                            id="modelDisplayMode"
                            value={
                                settings?.providers?.modelDisplayMode || 'label'
                            }
                            onChange={(e) =>
                                updateProviders(
                                    'modelDisplayMode',
                                    e.target.value as 'label' | 'alias' | 'both'
                                )
                            }
                            className={styles.select}
                        >
                            <option value="label">Label</option>
                            <option value="alias">Alias</option>
                            <option value="both">Both</option>
                        </select>
                        <IconChevronDown
                            size={14}
                            className={styles.selectIcon}
                        />
                    </div>
                </div>
            </SettingsCard>

            <div className={styles.providerSectionHeader}>
                <h3 className={styles.sectionHeaderTitle}>
                    Configured Providers
                </h3>
                <button
                    type="button"
                    onClick={() => setShowNewProvider(!showNewProvider)}
                    disabled={isLocked}
                    className={
                        showNewProvider ? styles.btnSecondary : styles.btnAccent
                    }
                >
                    {showNewProvider ? 'Cancel' : '+ Add Provider'}
                </button>
            </div>

            {showNewProvider && (
                <ProviderCard
                    cardType="add"
                    setShowNewProvider={setShowNewProvider}
                />
            )}
            <ProvidersList arr={[...(settings?.providers.configs ?? [])]} />
        </div>
    );
}

function EmbeddingsTab() {
    const { settings, updateEmbeddings, isLocked } = useSettings();
    const rpc = getRPC();
    const [indexStatus, setIndexStatus] = useState<{
        total: number;
        byType: Record<string, number>;
    } | null>(null);
    const [isIndexing, setIsIndexing] = useState(false);
    const [indexProgress, setIndexProgress] = useState<string>('');
    const [vecAvailable, setVecAvailable] = useState<boolean | null>(null);

    useEffect(() => {
        rpc.request['embeddings:check-availability']()
            .then(setVecAvailable)
            .catch(() => setVecAvailable(false));
    }, [rpc]);

    useEffect(() => {
        if (settings?.embeddings?.enabled) {
            rpc.request['settings:get-all']()
                .then((s) => {
                    const recentProjects = s.projects?.recentProjects;
                    if (recentProjects && recentProjects.length > 0) {
                        rpc.request['embeddings:status'](recentProjects[0])
                            .then(setIndexStatus)
                            .catch(() => {});
                    }
                })
                .catch(() => {});
        }
    }, [settings?.embeddings?.enabled, rpc]);

    if (!settings) return null;

    const emb = settings.embeddings ?? {
        enabled: false,
        endpoint: 'http://localhost:1234/v1',
        model: 'nomic-embed-text',
        dimension: 768,
        chunkSize: 500,
        chunkOverlap: 50,
        autoIndexOnSave: true,
    };

    const handleTestConnection = async () => {
        try {
            const result = await rpc.request['embeddings:test-server']();
            if (result.ok) {
                alert('Embedding server is reachable!');
            } else {
                alert(`Connection failed: ${result.error}`);
            }
        } catch (e) {
            alert(`Connection failed: ${e}`);
        }
    };

    const handleRebuildIndex = async () => {
        const recentProjects = settings.projects.recentProjects;
        if (!recentProjects || recentProjects.length === 0) {
            alert('No project open to index.');
            return;
        }
        const projectId = recentProjects[0];
        setIsIndexing(true);
        setIndexProgress('Starting index...');
        try {
            await rpc.request['embeddings:rebuild'](projectId);
            const result = await rpc.request['embeddings:index-project']({
                projectId,
            });
            setIndexStatus(await rpc.request['embeddings:status'](projectId));
            setIndexProgress(
                `Indexed ${result.indexed} chunks (${result.skipped} skipped, ${result.failed} failed)`
            );
        } catch (e) {
            setIndexProgress(`Error: ${e}`);
        } finally {
            setIsIndexing(false);
        }
    };

    return (
        <div className={styles.tabContent}>
            <SettingsCard>
                <div className={styles.settingsSectionLabel}>
                    Context Engine (RAG)
                </div>

                {vecAvailable === false && (
                    <div className={styles.alertWarning}>
                        <strong>sqlite-vec not available.</strong> Vector
                        features are disabled. On macOS, install Homebrew SQLite
                        and restart the app.
                    </div>
                )}

                <div className={styles.settingRow}>
                    <span>Enable Context Engine</span>
                    <Toggle
                        checked={emb.enabled}
                        disabled={isLocked || vecAvailable === false}
                        onChange={async (enabled) => {
                            await updateEmbeddings('enabled', enabled);
                            if (enabled) {
                                const recentProjects =
                                    settings.projects.recentProjects;
                                if (
                                    recentProjects &&
                                    recentProjects.length > 0
                                ) {
                                    const projectId = recentProjects[0];
                                    try {
                                        const status =
                                            await rpc.request[
                                                'embeddings:status'
                                            ](projectId);
                                        if (status.total === 0) {
                                            const confirmed = confirm(
                                                'Index your project for semantic search? This will embed all chapters, characters, locations, and other compendium entries.'
                                            );
                                            if (confirmed) {
                                                setIsIndexing(true);
                                                setIndexProgress(
                                                    'Starting initial index...'
                                                );
                                                const result =
                                                    await rpc.request[
                                                        'embeddings:index-project'
                                                    ]({ projectId });
                                                setIndexStatus(
                                                    await rpc.request[
                                                        'embeddings:status'
                                                    ](projectId)
                                                );
                                                setIndexProgress(
                                                    `Indexed ${result.indexed} chunks (${result.failed} failed)`
                                                );
                                                setIsIndexing(false);
                                            }
                                        } else {
                                            setIndexStatus(status);
                                        }
                                    } catch (err) {
                                        console.error(
                                            'Auto-index failed:',
                                            err
                                        );
                                    }
                                }
                            }
                        }}
                    />
                </div>

                <div className={styles.settingRow}>
                    <span>Server Preset</span>
                    <div className={styles.segmentedToggle}>
                        <button
                            type="button"
                            disabled={isLocked || !emb.enabled}
                            className={
                                emb.endpoint.includes(':1234')
                                    ? styles.activeSegment
                                    : ''
                            }
                            onClick={() =>
                                updateEmbeddings(
                                    'endpoint',
                                    'http://localhost:1234/v1'
                                )
                            }
                        >
                            LM Studio
                        </button>
                        <button
                            type="button"
                            disabled={isLocked || !emb.enabled}
                            className={
                                emb.endpoint.includes(':11434')
                                    ? styles.activeSegment
                                    : ''
                            }
                            onClick={() =>
                                updateEmbeddings(
                                    'endpoint',
                                    'http://localhost:11434'
                                )
                            }
                        >
                            Ollama
                        </button>
                    </div>
                </div>

                <div className={styles.settingRow}>
                    <span>Endpoint URL</span>
                    <input
                        type="text"
                        value={emb.endpoint}
                        disabled={isLocked || !emb.enabled}
                        placeholder="http://localhost:1234/v1"
                        onChange={(e) =>
                            updateEmbeddings('endpoint', e.target.value)
                        }
                        className={styles.textInputFull}
                    />
                </div>

                <div className={styles.settingRow}>
                    <span>Embedding Model</span>
                    <input
                        type="text"
                        value={emb.model}
                        disabled={isLocked || !emb.enabled}
                        placeholder="nomic-embed-text"
                        onChange={(e) =>
                            updateEmbeddings('model', e.target.value)
                        }
                        className={styles.textInputFull}
                    />
                </div>

                <div className={styles.settingRow}>
                    <span>Vector Dimension</span>
                    <NumberInput
                        id="dimension"
                        value={emb.dimension}
                        disabled={isLocked || !emb.enabled}
                        onChange={(v) =>
                            updateEmbeddings('dimension', v || 768)
                        }
                    />
                </div>

                <div className={styles.settingRow}>
                    <span>Chunk Size (tokens)</span>
                    <NumberInput
                        id="chunkSize"
                        value={emb.chunkSize}
                        disabled={isLocked || !emb.enabled}
                        min={128}
                        max={2048}
                        onChange={(v) =>
                            updateEmbeddings('chunkSize', v || 500)
                        }
                    />
                </div>

                <div className={styles.settingRow}>
                    <span>Chunk Overlap (tokens)</span>
                    <NumberInput
                        id="chunkOverlap"
                        value={emb.chunkOverlap}
                        disabled={isLocked || !emb.enabled}
                        min={0}
                        max={200}
                        onChange={(v) =>
                            updateEmbeddings('chunkOverlap', v || 50)
                        }
                    />
                </div>

                <div className={styles.settingRow}>
                    <span>Auto-index on chapter save</span>
                    <Toggle
                        checked={emb.autoIndexOnSave}
                        disabled={isLocked || !emb.enabled}
                        onChange={(v) => updateEmbeddings('autoIndexOnSave', v)}
                    />
                </div>
            </SettingsCard>

            <SettingsCard>
                <div className={styles.settingsSectionLabel}>Index Status</div>
                <div className={styles.buttonRow}>
                    <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={isLocked || !emb.enabled}
                        className={styles.btnSecondary}
                    >
                        Test Connection
                    </button>
                    <button
                        type="button"
                        onClick={handleRebuildIndex}
                        disabled={isLocked || !emb.enabled || isIndexing}
                        className={styles.btnSecondary}
                    >
                        {isIndexing ? 'Indexing...' : 'Rebuild Index'}
                    </button>
                </div>

                {indexStatus && (
                    <div className={styles.statusBox}>
                        <div className={styles.statusBoxTotal}>
                            Total indexed: <strong>{indexStatus.total}</strong>{' '}
                            chunks
                        </div>
                        <div className={styles.statusBreakdown}>
                            {Object.entries(indexStatus.byType).map(
                                ([type, count]) => (
                                    <div
                                        key={type}
                                        className={styles.statusItem}
                                    >
                                        <span>{type}</span>
                                        <span>{count}</span>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                )}

                {isIndexing && indexProgress && (
                    <div className={styles.progressNotification}>
                        {indexProgress}
                    </div>
                )}
            </SettingsCard>
        </div>
    );
}

function QuotaTab() {
    const { settings, updateGeneral, isLocked } = useSettings();
    const rpc = getRPC();
    const [period, setPeriod] = useState<'today' | 'month'>('today');
    const [stats, setStats] = useState<{
        tokensConsumed: number;
        requestCount: number;
    } | null>(null);

    useEffect(() => {
        async function loadStats() {
            try {
                const result = await rpc.request['usage:get-stats']({
                    period,
                    projectId: null,
                });
                setStats(result);
            } catch (e) {
                console.error('Failed to load usage stats:', e);
            }
        }
        loadStats();
    }, [period, rpc]);

    if (!settings) return null;

    const tokenLimit =
        (period === 'today'
            ? settings.general.dailyTokenLimit
            : settings.general.monthlyTokenLimit) ?? 100000;
    const requestLimit =
        (period === 'today'
            ? settings.general.dailyRequestLimit
            : settings.general.monthlyRequestLimit) ?? 100;
    const tokens = stats?.tokensConsumed ?? 0;
    const requests = stats?.requestCount ?? 0;
    const tokenPct =
        tokenLimit > 0 ? Math.min((tokens / tokenLimit) * 100, 100) : 0;
    const requestPct =
        requestLimit > 0 ? Math.min((requests / requestLimit) * 100, 100) : 0;

    const progressColor = (pct: number) => {
        if (pct > 95) return '#f43f5e';
        if (pct > 80) return '#f97316';
        if (pct > 50) return '#eab308';
        return '#10b981';
    };

    return (
        <div className={styles.tabContent}>
            <div className={styles.quotaHeader}>
                <div
                    className={styles.settingsSectionLabel}
                    style={{ marginBottom: 0 }}
                >
                    Quota & Usage Control
                </div>
                <div className={styles.segmentedToggle}>
                    <button
                        type="button"
                        className={
                            period === 'today' ? styles.activeSegment : ''
                        }
                        onClick={() => setPeriod('today')}
                    >
                        Today
                    </button>
                    <button
                        type="button"
                        className={
                            period === 'month' ? styles.activeSegment : ''
                        }
                        onClick={() => setPeriod('month')}
                    >
                        Month
                    </button>
                </div>
            </div>

            <div className={styles.usageGrid}>
                <div className={styles.usageCard}>
                    <div className={styles.usageLabel}>Tokens Consumed</div>
                    <div className={styles.usageValue}>
                        <span>{tokens.toLocaleString()}</span>
                        <span className={styles.usageMax}>
                            / {tokenLimit.toLocaleString()}
                        </span>
                    </div>
                    <div className={styles.progressBar}>
                        <div
                            className={styles.progressFill}
                            style={{
                                width: `${tokenPct}%`,
                                backgroundColor: progressColor(tokenPct),
                            }}
                        />
                    </div>
                </div>

                <div className={styles.usageCard}>
                    <div className={styles.usageLabel}>API Requests</div>
                    <div className={styles.usageValue}>
                        <span>{requests.toLocaleString()}</span>
                        <span className={styles.usageMax}>
                            / {requestLimit.toLocaleString()}
                        </span>
                    </div>
                    <div className={styles.progressBar}>
                        <div
                            className={styles.progressFill}
                            style={{
                                width: `${requestPct}%`,
                                backgroundColor: progressColor(requestPct),
                            }}
                        />
                    </div>
                </div>
            </div>

            <SettingsCard>
                <div className={styles.settingsSectionLabel}>
                    Limits Configuration
                </div>

                <div className={styles.settingRow}>
                    <span>Daily Token Limit</span>
                    <NumberInput
                        id="dailyTokenLimit"
                        value={settings.general.dailyTokenLimit}
                        onChange={(v) => updateGeneral('dailyTokenLimit', v)}
                        min={1000}
                        max={10000000}
                        disabled={isLocked}
                    />
                </div>
                <div className={styles.settingRow}>
                    <span>Monthly Token Limit</span>
                    <NumberInput
                        id="monthlyTokenLimit"
                        value={settings.general.monthlyTokenLimit}
                        onChange={(v) => updateGeneral('monthlyTokenLimit', v)}
                        min={1000}
                        max={100000000}
                        disabled={isLocked}
                    />
                </div>
                <div className={styles.settingRow}>
                    <span>Daily Request Limit</span>
                    <NumberInput
                        id="dailyRequestLimit"
                        value={settings.general.dailyRequestLimit}
                        onChange={(v) => updateGeneral('dailyRequestLimit', v)}
                        min={1}
                        max={100000}
                        disabled={isLocked}
                    />
                </div>
                <div className={styles.settingRow}>
                    <span>Monthly Request Limit</span>
                    <NumberInput
                        id="monthlyRequestLimit"
                        value={settings.general.monthlyRequestLimit}
                        onChange={(v) =>
                            updateGeneral('monthlyRequestLimit', v)
                        }
                        min={1}
                        max={1000000}
                        disabled={isLocked}
                    />
                </div>
            </SettingsCard>
        </div>
    );
}

function StorageTab() {
    const {
        settings,
        setEncryption,
        encryptionMode,
        isLocked,
        unlock,
        lock,
        reset,
        clearCache,
        getCacheSize,
    } = useSettings();
    const [cacheSize, setCacheSize] = useState(0);
    const [password, setPassword] = useState('');
    const [unlockPassword, setUnlockPassword] = useState('');
    const [unlockError, setUnlockError] = useState('');

    useEffect(() => {
        getCacheSize().then(setCacheSize);
    }, [getCacheSize]);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleClearCache = async () => {
        const cleared = await clearCache();
        setCacheSize(0);
        alert(`Cleared ${formatBytes(cleared)} from cache`);
    };

    const handleSetEncryption = async (mode: 'machine' | 'password') => {
        if (mode === 'password' && password) {
            await setEncryption(mode, password);
            setPassword('');
        } else {
            await setEncryption(mode);
        }
    };

    const handleUnlock = async () => {
        const success = await unlock(unlockPassword);
        if (!success) {
            setUnlockError('Incorrect master password');
        } else {
            setUnlockPassword('');
            setUnlockError('');
        }
    };

    if (!settings) return null;

    if (isLocked) {
        return (
            <div className={styles.tabContent}>
                <div className={styles.lockedContainer}>
                    <div className={styles.lockedTitle}>
                        Settings are Locked
                    </div>
                    <p className={styles.lockedDesc}>
                        Enter your master encryption password to modify
                        settings.
                    </p>
                    <div className={styles.unlockForm}>
                        <input
                            type="password"
                            value={unlockPassword}
                            onChange={(e) => setUnlockPassword(e.target.value)}
                            placeholder="Enter master password"
                            className={styles.textInputFull}
                        />
                        <button
                            type="button"
                            onClick={handleUnlock}
                            className={styles.btnAccent}
                        >
                            Unlock
                        </button>
                    </div>
                    {unlockError && (
                        <div className={styles.errorMessage}>{unlockError}</div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.tabContent}>
            <SettingsCard>
                <div className={styles.settingsSectionLabel}>
                    Security & Storage
                </div>
                <div className={styles.settingRow}>
                    <span>Encryption Mode</span>
                    <div className={styles.segmentedToggle}>
                        <button
                            type="button"
                            onClick={() => handleSetEncryption('machine')}
                            className={
                                encryptionMode === 'machine'
                                    ? styles.activeSegment
                                    : ''
                            }
                        >
                            Machine Key
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSetEncryption('password')}
                            className={
                                encryptionMode === 'password'
                                    ? styles.activeSegment
                                    : ''
                            }
                        >
                            Password
                        </button>
                    </div>
                </div>

                {encryptionMode === 'password' && (
                    <div className={styles.settingRow}>
                        <span>Set Master Password</span>
                        <div className={styles.pathRow}>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter new password"
                                className={styles.textInput}
                            />
                            <button
                                type="button"
                                onClick={() => handleSetEncryption('password')}
                                disabled={!password}
                                className={styles.btnSecondary}
                            >
                                Update
                            </button>
                        </div>
                    </div>
                )}

                <div className={styles.settingRow}>
                    <span>Data Location</span>
                    <span className={styles.pathBadge}>
                        {settings.storage.dataLocation}
                    </span>
                </div>

                <div className={styles.settingRow}>
                    <span>Cache Size</span>
                    <div className={styles.inlineAction}>
                        <span className={styles.monoValue}>
                            {formatBytes(cacheSize)}
                        </span>
                        <button
                            type="button"
                            onClick={handleClearCache}
                            className={styles.btnSecondary}
                        >
                            Clear Cache
                        </button>
                    </div>
                </div>
            </SettingsCard>

            <div className={styles.dangerZone}>
                <div className={styles.dangerHeader}>Danger Zone</div>
                <div className={styles.dangerRow}>
                    <div>
                        <div className={styles.dangerLabel}>
                            Lock Configuration
                        </div>
                        <div className={styles.dangerDesc}>
                            Lock the settings panel requiring your password to
                            open again.
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={lock}
                        className={styles.btnWarning}
                    >
                        Lock
                    </button>
                </div>
                <div className={styles.dangerRow}>
                    <div>
                        <div className={styles.dangerLabel}>
                            Reset All Settings
                        </div>
                        <div className={styles.dangerDesc}>
                            Revert all user preferences and paths back to
                            default.
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={reset}
                        className={styles.btnDanger}
                    >
                        Reset All
                    </button>
                </div>
            </div>
        </div>
    );
}

function AboutTab() {
    const PROJECTS = [
        { label: 'Novelty', link: 'https://github.com/wrlokKarna/novelty' },
        { label: 'Kotatsu', link: '#' },
        { label: 'Bookmarks Curator', link: '#' },
        { label: 'Project Registry', link: '#' },
        { label: 'AI Studio', link: '#' },
        { label: 'Universal Downloader', link: '#' },
    ];

    return (
        <div className={styles.tabContent}>
            <SettingsCard>
                <div className={styles.settingsSectionLabel}>
                    Application Information
                </div>
                <div className={styles.aboutMetaGrid}>
                    <div className={styles.metaRow}>
                        <span className={styles.metaKey}>Version</span>
                        <span className={styles.metaVal}>0.0.1</span>
                    </div>
                    <div className={styles.metaRow}>
                        <span className={styles.metaKey}>License</span>
                        <span className={styles.metaVal}>MIT</span>
                    </div>
                    <div className={styles.metaRow}>
                        <span className={styles.metaKey}>Author</span>
                        <span className={styles.metaVal}>Eon</span>
                    </div>
                    <div className={styles.metaRow}>
                        <span className={styles.metaKey}>Website</span>
                        <a
                            href="https://github.com/wrlokKarna/novelty"
                            target="_blank"
                            rel="noreferrer"
                            className={styles.linkAccent}
                        >
                            GitHub Repository
                        </a>
                    </div>
                </div>
            </SettingsCard>

            <SettingsCard>
                <div className={styles.settingsSectionLabel}>
                    More from NullSoft
                </div>
                <div className={styles.projectGrid}>
                    {PROJECTS.map((proj) => (
                        <a
                            key={proj.label}
                            href={proj.link}
                            className={styles.projectCard}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <span className={styles.projectName}>
                                {proj.label}
                            </span>
                            <span className={styles.projectArrow}>↗</span>
                        </a>
                    ))}
                </div>
            </SettingsCard>
        </div>
    );
}

export default function SettingsDialog({
    open,
    onClose,
    defaultRoute,
}: SettingsDialogProps) {
    const { loading } = useSettings();
    const [activeTab, setActiveTab] = useState<SettingsDialogActiveTab>(
        defaultRoute?.tab ?? 'general'
    );
    const [settingsSearch, setSettingsSearch] = useState('');

    useEffect(() => {
        if (!open || !defaultRoute) return;
        if (defaultRoute.tab) setActiveTab(defaultRoute.tab);
        const timer = setTimeout(() => {
            if (defaultRoute.section) {
                const el = document.getElementById(
                    `settings-section-${defaultRoute.section}`
                );
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            if (defaultRoute.focus) {
                const el = document.getElementById(
                    `settings-focus-${defaultRoute.focus}`
                );
                el?.focus();
                if (
                    el instanceof HTMLInputElement ||
                    el instanceof HTMLTextAreaElement
                ) {
                    el.select();
                }
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [open, defaultRoute]);

    if (loading) {
        return (
            <Dialog open={open} onClose={onClose} title="Settings" large>
                <div className={styles.loading}>Loading settings...</div>
            </Dialog>
        );
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            title="Settings"
            large
            hasSidebar
            id={styles.settingsDialog}
            search={{
                value: settingsSearch,
                onChange: setSettingsSearch,
                placeholder: 'Find in Settings...',
            }}
        >
            <SplitDialogLayout>
                <IconTextSideBar
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    tabsArray={SETTINGS_DIALOG_TABS}
                    iconsArray={SETTINGS_DIALOG_TABS_ICONS}
                />
                <div className={localStyles.tabPanel}>
                    {activeTab === 'general' && <GeneralTab />}
                    {activeTab === 'appearance' && <AppearanceTab />}
                    {activeTab === 'projects' && <ProjectsTab />}
                    {activeTab === 'asset library' && <AssetLibraryTab />}
                    {activeTab === 'providers' && <ProvidersTab />}
                    {activeTab === 'embeddings' && <EmbeddingsTab />}
                    {activeTab === 'quota & usage' && <QuotaTab />}
                    {activeTab === 'storage' && <StorageTab />}
                    {activeTab === 'about' && <AboutTab />}
                </div>
            </SplitDialogLayout>
        </Dialog>
    );
}
