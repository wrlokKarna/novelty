import type {
    ThemeBorderShape,
    UIDensity,
} from '@/shared/types/project/settings/appearance/theme';
import type { ThemeColorTokens } from '@/shared/types/project/settings/appearance/themeTokens';
import styles from './ThemeBuilder.module.css';
import type { ThemeScheme } from './themeDraft';

const SHAPE_RADIUS: Record<ThemeBorderShape, string> = {
    rounded: '10px',
    pill: '999px',
    sharp: '0px',
};

const FRAME_RADIUS: Record<ThemeBorderShape, string> = {
    rounded: '12px',
    pill: '18px',
    sharp: '0px',
};

const DENSITY_STYLES: Record<
    UIDensity,
    { gap: string; padding: string; buttonPadding: string }
> = {
    compact: {
        gap: '6px',
        padding: '9px',
        buttonPadding: '4px 9px',
    },
    comfortable: {
        gap: '8px',
        padding: '12px',
        buttonPadding: '6px 12px',
    },
    spacious: {
        gap: '11px',
        padding: '16px',
        buttonPadding: '8px 16px',
    },
};

export interface ThemePreviewProps {
    tokens: ThemeColorTokens;
    shape: ThemeBorderShape;
    density: UIDensity;
    scheme: ThemeScheme;
}

export default function ThemePreview({
    tokens,
    shape,
    density,
    scheme,
}: ThemePreviewProps) {
    const radius = SHAPE_RADIUS[shape];
    const spacing = DENSITY_STYLES[density];

    return (
        <div
            className={styles.previewFrame}
            style={{
                background: tokens['--bg-primary'],
                color: tokens['--text-primary'],
                borderColor: tokens['--border-subtle'],
                borderRadius: FRAME_RADIUS[shape],
            }}
        >
            <div
                className={styles.previewSidebar}
                style={{
                    background: tokens['--bg-secondary'],
                    borderColor: tokens['--border-subtle'],
                }}
            >
                <span
                    className={styles.previewLogo}
                    style={{ background: tokens['--accent-primary'] }}
                />
                <span
                    className={styles.previewNav}
                    style={{ background: tokens['--text-secondary'] }}
                />
                <span
                    className={styles.previewNav}
                    style={{
                        background: tokens['--text-secondary'],
                        width: '76%',
                    }}
                />
                <span
                    className={styles.previewNav}
                    style={{
                        background: tokens['--accent-primary'],
                        width: '58%',
                        opacity: 0.8,
                    }}
                />
            </div>

            <div
                className={styles.previewBody}
                style={{ gap: spacing.gap, padding: spacing.padding }}
            >
                <div className={styles.previewHeaderRow}>
                    <span>Preview</span>
                    <span
                        className={styles.previewBadge}
                        style={{
                            background: tokens['--accent-primary'],
                            color: tokens['--bg-primary'],
                            borderRadius: radius,
                        }}
                    >
                        {scheme}
                    </span>
                </div>

                <div
                    className={styles.previewCard}
                    style={{
                        background: tokens['--bg-elevated'],
                        borderColor: tokens['--border-subtle'],
                        borderRadius: radius,
                        gap: spacing.gap,
                        padding: spacing.padding,
                    }}
                >
                    <span
                        className={styles.previewTitleLine}
                        style={{ background: tokens['--text-primary'] }}
                    />
                    <span
                        className={styles.previewLine}
                        style={{ background: tokens['--text-secondary'] }}
                    />
                    <span
                        className={styles.previewLineShort}
                        style={{ background: tokens['--text-secondary'] }}
                    />

                    <div
                        className={styles.previewActions}
                        style={{ gap: spacing.gap }}
                    >
                        <button
                            type="button"
                            className={styles.previewPrimary}
                            tabIndex={-1}
                            style={{
                                background: tokens['--accent-primary'],
                                color: tokens['--bg-primary'],
                                borderRadius: radius,
                                padding: spacing.buttonPadding,
                            }}
                        >
                            Primary
                        </button>
                        <button
                            type="button"
                            className={styles.previewSecondary}
                            tabIndex={-1}
                            style={{
                                borderColor: tokens['--border-subtle'],
                                color: tokens['--text-primary'],
                                borderRadius: radius,
                                padding: spacing.buttonPadding,
                            }}
                        >
                            Secondary
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
