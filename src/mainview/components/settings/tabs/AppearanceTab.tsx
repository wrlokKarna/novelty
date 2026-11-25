import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
} from 'react';
import { IconPalette, IconPlus } from '@tabler/icons-react';
import {
    BUILT_IN_THEMES,
    getThemeMetadata,
} from '@/shared/constants/project/settings/appearance/themeRegistry';
import type {
    SupportedModes,
    ThemeActive,
    ThemeDefinition,
    ThemeMode,
    ThemeVariant,
} from '@/shared/types/project/settings/appearance/theme';
import { useSettings } from '../../../contexts/SettingsContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { BuiltInThemeCard, UserThemeCard } from '../../cards/settings';
import SettingsCard from '../../cards/SettingsCard';
import { NumberInput, Toggle } from '../SettingsWrappers';
import CycleConfig from '../theme/CycleConfig';
import ThemeBuilderInline from '../theme/ThemeBuilderInline';
import {
    applyBaseToDraft,
    createBlankDraft,
    draftFromBase,
    draftFromTheme,
    draftToThemeDefinition,
    type ThemeDraft,
} from '../theme/themeDraft';
import styles from './AppearanceTab.module.css';

const MODES: ThemeMode[] = ['light', 'dark', 'system', 'cycle'];

function isCompatible(mode: ThemeMode, supported: SupportedModes): boolean {
    if (mode === 'light') return supported !== 'dark';
    if (mode === 'dark') return supported !== 'light';
    return true;
}

function modeForAppliedTheme(
    mode: ThemeMode,
    supported: SupportedModes
): ThemeMode {
    if (mode === 'cycle') {
        return supported === 'both' ? 'system' : supported;
    }
    if (mode === 'light' && supported === 'dark') return 'dark';
    if (mode === 'dark' && supported === 'light') return 'light';
    return mode;
}

export default function AppearanceTab() {
    const { settings, updateAppearance, isLocked } = useSettings();
    const {
        settings: themeSettings,
        preferredScheme,
        effectiveThemeId,
        preview,
        previewTheme,
        clearPreview,
        setMode,
        setActiveTheme,
        stepCycle,
    } = useTheme();

    const [draft, setDraft] = useState<ThemeDraft | null>(null);
    const previewTimerRef = useRef<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const builderRef = useRef<HTMLDivElement>(null);

    const customThemesList = useMemo(
        () => Object.values(themeSettings.customThemes ?? {}),
        [themeSettings.customThemes]
    );
    const allBuiltIns = useMemo(() => Object.values(BUILT_IN_THEMES), []);

    useEffect(() => {
        if (!draft) return;

        const frame = window.requestAnimationFrame(() => {
            builderRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
        });

        return () => window.cancelAnimationFrame(frame);
    }, [draft]);

    useEffect(
        () => () => {
            if (previewTimerRef.current !== null) {
                window.clearTimeout(previewTimerRef.current);
            }
            clearPreview();
        },
        [clearPreview]
    );

    // Strict filtering can hide the active theme. Keep the app and the visible
    // list in agreement by selecting the first compatible theme.
    useEffect(() => {
        if (themeSettings.mode !== 'light' && themeSettings.mode !== 'dark') {
            return;
        }

        const activeMeta = getThemeMetadata(
            themeSettings.active,
            themeSettings.customThemes
        );

        if (isCompatible(themeSettings.mode, activeMeta.supportedModes)) return;

        const compatibleBuiltIn = allBuiltIns.find((theme) =>
            isCompatible(themeSettings.mode, theme.supportedModes)
        );
        const compatibleCustom = customThemesList.find((theme) =>
            isCompatible(themeSettings.mode, theme.supportedModes)
        );
        const target = compatibleBuiltIn ?? compatibleCustom;

        if (target) {
            setActiveTheme(target.id);
        }
    }, [
        themeSettings.mode,
        themeSettings.active,
        themeSettings.customThemes,
        allBuiltIns,
        customThemesList,
        setActiveTheme,
    ]);

    if (!settings) return null;

    const legacyBluePanel = settings.appearance.legacyBluePanel ?? false;
    const c = settings.appearance.sidebarConstraints ?? {
        enableCustomWidthCap: false,
        maxLeftWidth: 400,
        maxRightWidth: 700,
        leftWidth: 280,
        rightWidth: 550,
        enableAutoExpandLeft: false,
        enableAutoSwitchPanel: true,
    };

    const visibleBuiltIns = allBuiltIns.filter((theme) =>
        isCompatible(themeSettings.mode, theme.supportedModes)
    );
    const visibleCustomThemes = customThemesList.filter((theme) =>
        isCompatible(themeSettings.mode, theme.supportedModes)
    );
    const visibleThemeCount =
        visibleBuiltIns.length + visibleCustomThemes.length;

    const startPreview = (baseId: ThemeActive, scheme?: ThemeVariant) => {
        if (isLocked) return;

        if (previewTimerRef.current !== null) {
            window.clearTimeout(previewTimerRef.current);
        }
        previewTimerRef.current = window.setTimeout(() => {
            previewTimerRef.current = null;
            previewTheme(baseId, scheme);
        }, 140);
    };

    const endPreview = () => {
        if (previewTimerRef.current !== null) {
            window.clearTimeout(previewTimerRef.current);
            previewTimerRef.current = null;
        }
        clearPreview();
    };

    const handleOpenCreate = (baseId?: ThemeActive) => {
        endPreview();
        setDraft(
            baseId
                ? draftFromBase(baseId, themeSettings.customThemes ?? {})
                : createBlankDraft()
        );
    };

    const handleOpenEdit = (theme: ThemeDefinition) => {
        endPreview();
        setDraft(draftFromTheme(theme));
    };

    const handleCloseBuilder = () => {
        setDraft(null);
    };

    const handleChooseBase = (baseId: ThemeActive | null) => {
        setDraft((previous) => {
            if (!previous) return previous;

            if (!baseId) {
                return createBlankDraft();
            }

            return applyBaseToDraft(
                previous,
                baseId,
                themeSettings.customThemes ?? {}
            );
        });
    };

    const handleSaveDraft = () => {
        if (!draft || !draft.name.trim()) return;

        endPreview();
        const definition = draftToThemeDefinition(draft);
        const updatedCustomThemes = {
            ...(themeSettings.customThemes ?? {}),
            [definition.id]: definition,
        };

        void updateAppearance('theme', {
            ...themeSettings,
            customThemes: updatedCustomThemes,
            active: definition.id,
            shape: definition.defaultShape ?? themeSettings.shape,
            density: definition.defaultDensity ?? themeSettings.density,
            mode: modeForAppliedTheme(
                themeSettings.mode,
                definition.supportedModes
            ),
        });

        setDraft(null);
    };

    const handleDeleteCustomTheme = (theme: ThemeDefinition) => {
        if (!themeSettings.customThemes) return;
        if (!window.confirm(`Delete theme "${theme.name}"?`)) return;

        endPreview();
        const updatedCustomThemes = { ...themeSettings.customThemes };
        delete updatedCustomThemes[theme.id];

        if (draft?.id === theme.id) {
            setDraft(null);
        }

        const deletingActive = themeSettings.active === theme.id;
        const fallback = deletingActive
            ? (allBuiltIns.find((builtIn) =>
                  isCompatible(themeSettings.mode, builtIn.supportedModes)
              ) ?? BUILT_IN_THEMES.default)
            : null;

        void updateAppearance('theme', {
            ...themeSettings,
            customThemes: updatedCustomThemes,
            active: fallback ? fallback.id : themeSettings.active,
            shape: fallback?.defaultShape ?? themeSettings.shape,
            density: fallback?.defaultDensity ?? themeSettings.density,
        });
    };

    const handleCycleConfigChange = (
        cycleConfig: NonNullable<typeof themeSettings.cycleConfig>
    ) => {
        void updateAppearance('theme', {
            ...themeSettings,
            cycleConfig,
        });
    };

    const handleExportThemes = () => {
        const customThemes = themeSettings.customThemes ?? {};
        if (Object.keys(customThemes).length === 0) {
            alert('No custom themes available to export.');
            return;
        }

        const dataStr =
            'data:text/json;charset=utf-8,' +
            encodeURIComponent(JSON.stringify(customThemes, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute(
            'download',
            `novelty-custom-themes-${Date.now()}.json`
        );
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    };

    const handleImportThemes = (e: ChangeEvent<HTMLInputElement>) => {
        const fileReader = new FileReader();
        const file = e.target.files?.[0];
        if (!file) return;

        fileReader.readAsText(file, 'UTF-8');
        fileReader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target?.result as string);
                if (parsed && typeof parsed === 'object') {
                    const mergedThemes = {
                        ...(themeSettings.customThemes ?? {}),
                        ...parsed,
                    };
                    void updateAppearance('theme', {
                        ...themeSettings,
                        customThemes: mergedThemes,
                    });
                    alert('Custom themes imported successfully!');
                } else {
                    alert('Invalid theme file structure.');
                }
            } catch (error) {
                console.error('Failed to parse imported theme JSON:', error);
                alert(
                    'Failed to read theme file. Please ensure it is valid JSON.'
                );
            } finally {
                e.target.value = '';
            }
        };
    };

    const builderProps = draft
        ? {
              draft,
              builtIns: allBuiltIns,
              customThemes: customThemesList,
              onChange: setDraft,
              onChooseBase: handleChooseBase,
              onCancel: handleCloseBuilder,
              onSave: handleSaveDraft,
          }
        : null;

    return (
        <div className={styles.tabContent}>
            {/* Hidden file input for importing JSON theme files */}
            <input
                ref={fileInputRef}
                type="file"
                id="theme-file-input"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleImportThemes}
            />

            {/* 1. Sidebar Constraints */}
            <SettingsCard>
                <React.Fragment>
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
                </React.Fragment>
            </SettingsCard>

            {/* 2. Editor Width */}
            <SettingsCard>
                <React.Fragment>
                    <div className={styles.settingsSectionLabel}>
                        Editor Width
                    </div>
                    <div className={styles.settingRow}>
                        <span>Editor Width Mode</span>
                        <div className={styles.segmentedToggle}>
                            <button
                                type="button"
                                className={
                                    settings.appearance.editorWidthMode !==
                                    'fixed'
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
                                    settings.appearance.editorWidthMode ===
                                    'fixed'
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
                </React.Fragment>
            </SettingsCard>

            {/* 3. Themes */}
            <SettingsCard>
                <>
                    <div className={styles.settingsSectionLabel}>
                        Appearance
                    </div>

                    <div className={styles.settingRow}>
                        <span>Appearance mode</span>
                        <div className={styles.segmentedToggle}>
                            {MODES.map((tm) => (
                                <button
                                    key={tm}
                                    type="button"
                                    className={
                                        themeSettings.mode === tm
                                            ? styles.activeSegment
                                            : ''
                                    }
                                    onClick={() => {
                                        endPreview();
                                        setMode(tm);
                                    }}
                                    disabled={isLocked}
                                >
                                    {tm}
                                </button>
                            ))}
                        </div>
                    </div>

                    {themeSettings.mode === 'cycle' && (
                        <CycleConfig
                            config={themeSettings.cycleConfig}
                            builtIns={allBuiltIns}
                            customThemes={customThemesList}
                            effectiveThemeId={effectiveThemeId}
                            onChange={handleCycleConfigChange}
                            onNext={stepCycle}
                        />
                    )}

                    <div className={styles.themeGroup}>
                        <div className={styles.themeGroupHeader}>
                            <div className={styles.themeGroupTitleWrap}>
                                <span className={styles.themeGroupTitle}>
                                    Themes
                                </span>
                                <span className={styles.themeGroupHint}>
                                    {visibleThemeCount} shown
                                </span>
                            </div>

                            <div className={styles.themeGroupActions}>
                                <button
                                    type="button"
                                    className={styles.btnAccent}
                                    onClick={() => handleOpenCreate()}
                                    disabled={isLocked}
                                >
                                    <IconPlus size={14} />
                                    New theme
                                </button>
                                <button
                                    type="button"
                                    className={styles.btnSecondary}
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                    disabled={isLocked}
                                >
                                    Import
                                </button>
                                <button
                                    type="button"
                                    className={styles.btnSecondary}
                                    onClick={handleExportThemes}
                                >
                                    Export
                                </button>
                            </div>
                        </div>

                        {visibleThemeCount === 0 ? (
                            <div className={styles.emptyState}>
                                <span className={styles.emptyStateIcon}>
                                    <IconPalette size={22} />
                                </span>
                                <span className={styles.emptyStateTitle}>
                                    No themes for this mode
                                </span>
                                <span className={styles.emptyStateText}>
                                    Switch the appearance mode to Light, Dark or
                                    System to see your themes.
                                </span>
                            </div>
                        ) : (
                            <div className={styles.themeGrid}>
                                {visibleBuiltIns.map((theme) => (
                                    <BuiltInThemeCard
                                        key={theme.id}
                                        theme={theme}
                                        activeId={effectiveThemeId}
                                        activeScheme={preferredScheme}
                                        isPreviewing={
                                            preview?.themeId === theme.id
                                        }
                                        onSelect={(selected) =>
                                            setActiveTheme(selected.id)
                                        }
                                        onUseAsBase={(selected) =>
                                            handleOpenCreate(selected.id)
                                        }
                                        onPreviewStart={(selected, scheme) =>
                                            startPreview(selected.id, scheme)
                                        }
                                        onPreviewEnd={endPreview}
                                    />
                                ))}

                                {visibleCustomThemes.map((theme) => (
                                    <UserThemeCard
                                        key={theme.id}
                                        cardObj={theme}
                                        isActive={effectiveThemeId === theme.id}
                                        isPreviewing={
                                            preview?.themeId === theme.id
                                        }
                                        activeScheme={preferredScheme}
                                        onSelect={(selected) =>
                                            setActiveTheme(selected.id)
                                        }
                                        onEdit={handleOpenEdit}
                                        onDelete={handleDeleteCustomTheme}
                                        onUseAsBase={(selected) =>
                                            handleOpenCreate(selected.id)
                                        }
                                        onPreviewStart={(selected, scheme) =>
                                            startPreview(selected.id, scheme)
                                        }
                                        onPreviewEnd={endPreview}
                                    />
                                ))}
                            </div>
                        )}

                        {visibleCustomThemes.length === 0 &&
                            themeSettings.mode !== 'light' &&
                            themeSettings.mode !== 'dark' && (
                                <div className={styles.emptyState}>
                                    <span className={styles.emptyStateIcon}>
                                        <IconPalette size={22} />
                                    </span>
                                    <span className={styles.emptyStateTitle}>
                                        No custom themes yet
                                    </span>
                                    <span className={styles.emptyStateText}>
                                        Start from scratch or clone any built-in
                                        theme, then tune its colors, shape and
                                        density.
                                    </span>
                                    <button
                                        type="button"
                                        className={styles.btnAccent}
                                        onClick={() => handleOpenCreate()}
                                        disabled={isLocked}
                                    >
                                        <IconPlus size={14} />
                                        Create your first theme
                                    </button>
                                </div>
                            )}

                        {builderProps && (
                            <div ref={builderRef}>
                                <ThemeBuilderInline {...builderProps} />
                            </div>
                        )}
                    </div>
                </>
            </SettingsCard>

            {/* 4. Legacy Blue Panel */}
            <SettingsCard>
                <div className={styles.settingRow}>
                    <span>Legacy Blue Panel</span>
                    <Toggle
                        checked={legacyBluePanel}
                        onChange={(v) => updateAppearance('legacyBluePanel', v)}
                        disabled={isLocked}
                    />
                </div>
            </SettingsCard>
        </div>
    );
}
