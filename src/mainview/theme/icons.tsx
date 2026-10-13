import {
    IconBook2,
    IconFileText,
    IconPhoto,
    IconTrash,
    IconDatabase,
    IconSparkles2,
    IconChartBar,
    IconFolderOpen,
    IconInfoCircle,
    IconCategory,
    IconTableOptions,
    IconAlbum,
} from '@tabler/icons-react';

type Props = {
    size?: number;
    stroke?: number;
};

// ----------- <project tabs icons> ----------- //
export function IconGeneralTab({ size, stroke }: Props) {
    return <IconBook2 size={size} stroke={stroke} />;
}
export function IconTemplatesTab({ size, stroke }: Props) {
    return <IconFileText size={size} stroke={stroke} />;
}
export function IconCoversTab({ size, stroke }: Props) {
    return <IconPhoto size={size} stroke={stroke} />;
}
export function IconDangerZoneTab({ size, stroke }: Props) {
    return <IconTrash size={size} stroke={stroke} />;
}

// ----------- <settings tabs icons> ----------- //
export function IconAppearanceTab({ size, stroke }: Props) {
    return <IconTableOptions size={size} stroke={stroke} />;
}

export function IconProjectsTab({ size, stroke }: Props) {
    return <IconAlbum size={size} stroke={stroke} />;
}

export function IconAssetsTab({ size, stroke }: Props) {
    return <IconCategory size={size} stroke={stroke} />;
}

export function IconProvidersTab({ size, stroke }: Props) {
    return <IconSparkles2 size={size} stroke={stroke} />;
}

export function IconContextTab({ size, stroke }: Props) {
    return <IconDatabase size={size} stroke={stroke} />;
}

export function IconQuotaTab({ size, stroke }: Props) {
    return <IconChartBar size={size} stroke={stroke} />;
}

export function IconStorageTab({ size, stroke }: Props) {
    return <IconFolderOpen size={size} stroke={stroke} />;
}

export function IconAboutTab({ size, stroke }: Props) {
    return <IconInfoCircle size={size} stroke={stroke} />;
}
