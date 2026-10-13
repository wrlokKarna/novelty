import { IconCheck, IconCircleDot, IconRefresh } from '@tabler/icons-react';

export type SaveState =
    'saving' | 'just-saved' | 'idle-modified' | 'idle-unmodified';

interface StatusBarProps {
    saveState: SaveState;
    lastSavedTime: Date | null;
    cursorLine: number;
    cursorCol: number;
    wordCount: number;
    charCount: number;
    fileType: string;
    projectType: string | null;
    contentRating: string | null;
    primaryGenre: string | null;
    primaryTheme: string | null;
}

const divider = (
    <span style={{ color: '#595D68', margin: '0 8px', userSelect: 'none' }}>
        |
    </span>
);

function formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function StatusBar({
    saveState,
    lastSavedTime,
    cursorLine,
    cursorCol,
    wordCount,
    charCount,
    fileType,
    projectType,
    contentRating,
    primaryGenre,
    primaryTheme,
}: StatusBarProps) {
    const renderSaveIcon = () => {
        if (saveState === 'saving') {
            return (
                <IconRefresh
                    size={14}
                    stroke={2}
                    style={{
                        animation: 'status-spin 1s linear infinite',
                        flexShrink: 0,
                    }}
                />
            );
        }
        if (saveState === 'just-saved') {
            return (
                <IconCheck
                    size={14}
                    stroke={2}
                    style={{ color: '#4ade80', flexShrink: 0 }}
                />
            );
        }
        const dotColor = saveState === 'idle-modified' ? '#4ade80' : '#595D68';
        return (
            <IconCircleDot
                size={18}
                stroke={2}
                style={{ color: dotColor, flexShrink: 0 }}
            />
        );
    };

    const formatLabel = () => {
        if (saveState === 'saving') return 'Saving...';
        if (saveState === 'just-saved' && lastSavedTime)
            return `Last saved ${formatTime(lastSavedTime)}`;
        if (lastSavedTime) return `Last saved ${formatTime(lastSavedTime)}`;
        return 'Not saved yet';
    };

    const showMetrics = fileType && fileType !== 'Compendium Entry';
    const fileTypeLabel = fileType || '';

    let projectLabel = '';
    if (projectType) {
        const formattedType =
            projectType === 'original'
                ? 'Novel'
                : projectType === 'fanfiction'
                  ? 'Fan Fiction'
                  : projectType === 'adaptation'
                    ? 'Adaptation'
                    : projectType === 'derivative'
                      ? 'Derivative'
                      : projectType === 'parody'
                        ? 'Parody'
                        : projectType === 'translation'
                          ? 'Translation'
                          : projectType === 'transformative'
                            ? 'Transformative'
                            : projectType;
        const rating = contentRating ? ` (${contentRating})` : '';
        const genre = primaryGenre || '';
        const theme = primaryTheme ? ` & ${primaryTheme}` : '';
        projectLabel = `${formattedType}${rating}${genre || theme ? ` · ${genre}${theme}` : ''}`;
    }

    const showLeftSide = showMetrics || fileType === 'Compendium Entry';

    return (
        <footer
            style={{
                height: 30,
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                fontSize: 12,
                whiteSpace: 'nowrap',
                color: '#fff',
                backgroundColor: '#222324',
                borderTop: '1px solid var(--border)',
            }}
        >
            {showLeftSide && (
                <span
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '4px',
                    }}
                >
                    {renderSaveIcon()}
                    <span style={{ marginLeft: 6 }}>{formatLabel()}</span>
                    {divider}
                    {showMetrics ? (
                        <>
                            <span>
                                Ln {cursorLine}, Col {cursorCol}
                            </span>
                            {divider}
                            <span>{wordCount.toLocaleString()} words</span>
                            {divider}
                            <span>{charCount.toLocaleString()} chars</span>
                            {divider}
                            <span>{fileTypeLabel}</span>
                        </>
                    ) : (
                        <span>{fileTypeLabel}</span>
                    )}
                </span>
            )}
            <span
                style={{
                    marginLeft: 'auto',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                }}
            >
                {projectLabel && (
                    <>
                        <span>{projectLabel}</span>
                        {divider}
                    </>
                )}
                <span style={{ textTransform: 'uppercase' }}>novelty</span>
            </span>
        </footer>
    );
}
