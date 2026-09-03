import { Utils } from 'electrobun/bun';
import { join } from 'path';
import {
    readFileSync,
    writeFileSync,
    existsSync,
    mkdirSync,
    readdirSync,
    statSync,
    rmSync,
} from 'fs';
import {
    createCipheriv,
    createDecipheriv,
    randomBytes,
    scryptSync,
} from 'crypto';

import type { ProviderSettings, Settings } from '../mainview/types/index';

const SETTINGS_FILE = 'settings.json';
const APP_SALT = 'novelty-app-v1';

interface EncryptedData {
    iv: string;
    encrypted: string;
    salt?: string;
}

interface SettingsFile {
    encryptionMode: 'machine' | 'password' | 'none';
    encryptedData?: EncryptedData;
    plainData?: Settings;
}

const defaultSettings: Settings = {
    general: {
        enableAutoSave: true,
        autoSaveInterval: 5,
        enableAutoBackup: true,
        autoBackupInterval: 1,
        enableAutoSync: true,
        autoSyncInterval: 1,
        enableAutoUpdate: true,
        autoUpdateInterval: 1,
        theme: 'system',
        chatViewMode: 'full',
        confirmBeforeDelete: true,
        autoNamingMethod: 'ai-summarizer',
        maxContextTokens: 4000,
        chapterContextMode: 'brief',
        dailyTokenLimit: 100000,
        monthlyTokenLimit: 2000000,
        dailyRequestLimit: 100,
        monthlyRequestLimit: 2000,
    },
    appearance: {
        theme: 'system',
        fontSize: 14,
        fontFamily: 'Inter',
        lineHeight: 1.5,
        sidebarConstraints: {
            enableCustomWidthCap: false,
            maxLeftWidth: 400,
            maxRightWidth: 700,
            leftWidth: 280,
            rightWidth: 550,
            enableAutoExpandLeft: false,
            leftPanelCollapsed: false,
            rightPanelCollapsed: false,
            enableAutoSwitchPanel: true,
        },
        editorWidthMode: 'fixed',
        editorMaxWidth: 800,
        previewWidth: 420,
        previewPosition: 'right',
    },
    projects: {
        defaultProjectsDir: join(Utils.paths.userData, 'projects'),
        projectDirs: [],
        openRecentProjectOnStartup: true,
        recentProjects: [],
    },
    assetLibrary: {
        storagePath: null,
        autoCleanupEnabled: false,
        cleanupIntervalDays: 30,
    },
    providers: {
        configs: [],
        modelDisplayMode: 'label',
    },
    storage: {
        encryptionMode: 'machine',
        dataLocation: Utils.paths.userData,
        cacheSize: 0,
    },
    embeddings: {
        enabled: false,
        endpoint: 'http://localhost:1234/v1',
        model: 'nomic-embed-text',
        dimension: 768,
        chunkSize: 500,
        chunkOverlap: 50,
        autoIndexOnSave: true,
    },
};

let settingsCache: Settings | null = null;

function getSettingsPath(): string {
    return join(Utils.paths.userData, SETTINGS_FILE);
}

function ensureDir(): void {
    const dir = Utils.paths.userData;
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
}

function ensureProjectsDir(settings: Settings): void {
    const projectsDir = settings.projects.defaultProjectsDir;
    if (projectsDir && !existsSync(projectsDir)) {
        mkdirSync(projectsDir, { recursive: true });
    }
}

function getMachineKey(): Buffer {
    const machineId =
        process.env.COMPUTERNAME || process.env.HOSTNAME || 'default-machine';
    return scryptSync(machineId + APP_SALT, 'salt', 32);
}

function getPasswordKey(password: string, salt: Buffer): Buffer {
    return scryptSync(password, salt, 32);
}

function encrypt(data: string, key: Buffer): EncryptedData {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return {
        iv: iv.toString('hex'),
        encrypted: encrypted + ':' + authTag.toString('hex'),
    };
}

function decrypt(encryptedData: EncryptedData, key: Buffer): string {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const [encrypted, authTagHex] = encryptedData.encrypted.split(':');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

function readSettingsFile(): SettingsFile {
    ensureDir();
    const path = getSettingsPath();
    if (!existsSync(path)) {
        const initial: SettingsFile = {
            encryptionMode: 'none',
            plainData: { ...defaultSettings },
        };
        initial.plainData!.storage.dataLocation = Utils.paths.userData;
        writeSettingsFile(initial);
        return initial;
    }
    try {
        const content = readFileSync(path, 'utf8');
        return JSON.parse(content);
    } catch {
        const fallback: SettingsFile = {
            encryptionMode: 'none',
            plainData: { ...defaultSettings },
        };
        fallback.plainData!.storage.dataLocation = Utils.paths.userData;
        writeSettingsFile(fallback);
        return fallback;
    }
}

function writeSettingsFile(data: SettingsFile): void {
    ensureDir();
    const path = getSettingsPath();
    writeFileSync(path, JSON.stringify(data, null, 2));
}

export function getAllSettings(): Settings {
    if (settingsCache) {
        migrateEmbeddings(settingsCache);
        migrateSidebarConstraints(settingsCache);
        migrateEditorWidth(settingsCache);
        return settingsCache;
    }
    const file = readSettingsFile();
    let settings: Settings;
    if (file.plainData) {
        settingsCache = file.plainData;
        settings = file.plainData;
    } else if (file.encryptionMode === 'none') {
        settingsCache = file.plainData!;
        settings = file.plainData!;
    } else if (file.encryptionMode === 'machine' && file.encryptedData) {
        try {
            const key = getMachineKey();
            const decrypted = decrypt(file.encryptedData, key);
            settings = JSON.parse(decrypted) as Settings;
            settings.storage.dataLocation = Utils.paths.userData;
            settingsCache = settings;
        } catch {
            settingsCache = { ...defaultSettings };
            settingsCache.storage.dataLocation = Utils.paths.userData;
            settings = settingsCache;
        }
    } else {
        settingsCache = { ...defaultSettings };
        settingsCache.storage.dataLocation = Utils.paths.userData;
        settings = settingsCache;
    }
    migrateModelEntries(settings);
    migrateEmbeddings(settings);
    migrateSidebarConstraints(settings);
    migrateEditorWidth(settings);
    ensureProjectsDir(settings);
    migrationForDefaultProviderCleanUp(settings);
    return settings;
}

function migrateSidebarConstraints(settings: Settings): void {
    if (!settings.appearance) {
        settings.appearance = {
            theme: 'system',
            fontSize: 14,
            fontFamily: 'Inter',
            lineHeight: 1.5,
            sidebarConstraints: {
                enableCustomWidthCap: false,
                maxLeftWidth: 400,
                maxRightWidth: 700,
                leftWidth: 280,
                rightWidth: 550,
                enableAutoExpandLeft: false,
                leftPanelCollapsed: false,
                rightPanelCollapsed: false,
                enableAutoSwitchPanel: true,
            },
            editorWidthMode: 'fixed',
            editorMaxWidth: 800,
            previewWidth: 420,
            previewPosition: 'right',
        };
    } else if (!settings.appearance.sidebarConstraints) {
        settings.appearance.sidebarConstraints = {
            enableCustomWidthCap: false,
            maxLeftWidth: 400,
            maxRightWidth: 700,
            leftWidth: 280,
            rightWidth: 550,
            enableAutoExpandLeft: false,
            leftPanelCollapsed: false,
            rightPanelCollapsed: false,
            enableAutoSwitchPanel: true,
        };
    } else {
        const c = settings.appearance.sidebarConstraints;
        if (c.leftPanelCollapsed === undefined) c.leftPanelCollapsed = false;
        if (c.rightPanelCollapsed === undefined) c.rightPanelCollapsed = false;
        if (c.enableAutoSwitchPanel === undefined)
            c.enableAutoSwitchPanel = true;
    }
}

function migrateEditorWidth(settings: Settings): void {
    if (!settings.appearance) {
        settings.appearance = {
            theme: 'system',
            fontSize: 14,
            fontFamily: 'Inter',
            lineHeight: 1.5,
            sidebarConstraints: {
                enableCustomWidthCap: false,
                maxLeftWidth: 400,
                maxRightWidth: 700,
                leftWidth: 280,
                rightWidth: 550,
                enableAutoExpandLeft: false,
                leftPanelCollapsed: false,
                rightPanelCollapsed: false,
                enableAutoSwitchPanel: true,
            },
            editorWidthMode: 'fixed',
            editorMaxWidth: 800,
            previewWidth: 420,
            previewPosition: 'right',
        };
    } else {
        if (settings.appearance.editorWidthMode === undefined) {
            settings.appearance.editorWidthMode = 'fixed';
        }
        if (settings.appearance.editorMaxWidth === undefined) {
            settings.appearance.editorMaxWidth = 800;
        }
        if (settings.appearance.previewWidth === undefined) {
            settings.appearance.previewWidth = 420;
        }
        if (settings.appearance.previewPosition === undefined) {
            settings.appearance.previewPosition = 'right';
        }
    }
}

function migrateEmbeddings(settings: Settings): void {
    if (!settings.embeddings) {
        settings.embeddings = {
            enabled: false,
            endpoint: 'http://localhost:1234/v1',
            model: 'nomic-embed-text',
            dimension: 768,
            chunkSize: 500,
            chunkOverlap: 50,
            autoIndexOnSave: true,
        };
    }
}

function migrateModelEntries(settings: Settings): void {
    for (const config of Object.values(settings.providers.configs)) {
        if (config.models) {
            for (const [name, value] of Object.entries(config.models)) {
                if (typeof value === 'boolean') {
                    (config.models as Record<string, any>)[name] = {
                        enabled: value,
                    };
                }
            }
        }
    }
}

function migrationForDefaultProviderCleanUp(
    settings: Settings & {
        providers: ProviderSettings & { defaultProvider?: string };
    }
): void {
    if (settings.providers) {
        delete settings.providers.defaultProvider;
    }
}

export function getSetting<K extends keyof Settings>(key: K): Settings[K] {
    const settings = getAllSettings();
    return settings[key];
}

export function setSetting<K extends keyof Settings>(
    key: K,
    value: Settings[K]
): void {
    const settings = getAllSettings();
    settings[key] = value;
    settingsCache = settings;
    saveSettings(settings);
}

export function saveSettings(settings: Settings): void {
    const file = readSettingsFile();
    if (file.encryptionMode === 'none') {
        file.plainData = settings;
    } else {
        let key: Buffer;
        if (file.encryptionMode === 'machine') {
            key = getMachineKey();
        } else if (
            file.encryptionMode === 'password' &&
            file.encryptedData?.salt
        ) {
            const salt = Buffer.from(file.encryptedData.salt, 'hex');
            key = getPasswordKey('', salt);
        } else {
            file.plainData = settings;
            writeSettingsFile(file);
            return;
        }
        const json = JSON.stringify(settings);
        file.encryptedData = encrypt(json, key);
    }
    settings.storage.dataLocation = Utils.paths.userData;
    writeSettingsFile(file);
}

export function setEncryptionMode(
    mode: 'machine' | 'password',
    password?: string
): void {
    const file = readSettingsFile();
    if (mode === 'password' && password) {
        const salt = randomBytes(32);
        const key = getPasswordKey(password, salt);
        const currentSettings = getAllSettings();
        const json = JSON.stringify(currentSettings);
        file.encryptionMode = 'password';
        file.encryptedData = encrypt(json, key);
        file.encryptedData.salt = salt.toString('hex');
    } else {
        file.encryptionMode = 'machine';
        const key = getMachineKey();
        const currentSettings = getAllSettings();
        const json = JSON.stringify(currentSettings);
        file.encryptedData = encrypt(json, key);
        delete file.encryptedData?.salt;
        file.plainData = undefined;
    }
    writeSettingsFile(file);
    settingsCache = null;
}

export function unlockWithPassword(password: string): boolean {
    const file = readSettingsFile();
    if (file.encryptionMode !== 'password' || !file.encryptedData?.salt) {
        return false;
    }
    try {
        const salt = Buffer.from(file.encryptedData.salt, 'hex');
        const key = getPasswordKey(password, salt);
        const decrypted = decrypt(file.encryptedData, key);
        const settings = JSON.parse(decrypted) as Settings;
        settingsCache = settings;
        return true;
    } catch {
        return false;
    }
}

export function lockSettings(): void {
    settingsCache = null;
}

export function isLocked(): boolean {
    const file = readSettingsFile();
    if (file.encryptionMode === 'none' || file.encryptionMode === 'machine') {
        return false;
    }
    return settingsCache === null;
}

export function getEncryptionMode(): 'machine' | 'password' | 'none' {
    const file = readSettingsFile();
    if (file.encryptionMode === 'password' && isLocked()) {
        return 'password';
    }
    return file.encryptionMode;
}

export function resetSettings(): void {
    settingsCache = null;
    const file: SettingsFile = {
        encryptionMode: 'none',
        plainData: { ...defaultSettings },
    };
    file.plainData!.storage.dataLocation = Utils.paths.userData;
    writeSettingsFile(file);
}

export function clearCache(): number {
    const cacheDir = Utils.paths.userCache;
    let cleared = 0;
    if (existsSync(cacheDir)) {
        try {
            const files = readdirSync(cacheDir);
            for (const file of files) {
                const filePath = join(cacheDir, file);
                const stat = statSync(filePath);
                rmSync(filePath, { recursive: true, force: true });
                cleared += stat.size;
            }
        } catch {
            // Ignore errors
        }
    }
    return cleared;
}

export function getCacheSize(): number {
    const cacheDir = Utils.paths.userCache;
    let size = 0;
    if (existsSync(cacheDir)) {
        try {
            const files = readdirSync(cacheDir);
            for (const file of files) {
                const filePath = join(cacheDir, file);
                const stat = statSync(filePath);
                if (stat.isDirectory()) {
                    size += getDirSize(filePath);
                } else {
                    size += stat.size;
                }
            }
        } catch {
            // Ignore errors
        }
    }
    return size;
}

function getDirSize(dirPath: string): number {
    let size = 0;
    try {
        const files = readdirSync(dirPath);
        for (const file of files) {
            const filePath = join(dirPath, file);
            const stat = statSync(filePath);
            if (stat.isDirectory()) {
                size += getDirSize(filePath);
            } else {
                size += stat.size;
            }
        }
    } catch {
        // Ignore errors
    }
    return size;
}
