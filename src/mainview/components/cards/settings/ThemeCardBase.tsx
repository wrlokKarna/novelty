import {
    useEffect,
    useState,
    type CSSProperties,
    type KeyboardEvent,
    type ReactNode,
} from 'react';
import type {
    SupportedModes,
    ThemeBorderShape,
    ThemeVariant,
    UIDensity,
} from '@/shared/types/project/settings/appearance/theme';
import type { ThemeColorTokens } from '@/shared/types/project/settings/appearance/themeTokens';
import commonStyles from './ThemeCard.common.module.css';
import {
    RenderTheme,
    resolveCardScheme,
    ThemeMetaLine,
    ThemeSwatchRow,
    ThemeVariantToggle,
} from './ThemeCard.util';

export interface ThemeCardBaseProps {
    name: string;
    supportedModes: SupportedModes;
    activeScheme?: ThemeVariant;
    isActive?: boolean;
    isPreviewing?: boolean;
    shape?: ThemeBorderShape;
    density?: UIDensity;
    resolveTokens: (scheme: ThemeVariant) => ThemeColorTokens;
    onSelect?: () => void;
    onPreviewStart?: (scheme?: ThemeVariant) => void;
    onPreviewEnd?: () => void;
    headerStart: ReactNode;
    headerActions?: ReactNode;
    className?: string;
    activeClassName?: string;
    previewClassName?: string;
    style?: CSSProperties;
}

export default function ThemeCardBase({
    name,
    supportedModes,
    activeScheme = 'dark',
    isActive = false,
    isPreviewing = false,
    shape,
    density,
    resolveTokens,
    onSelect,
    onPreviewStart,
    onPreviewEnd,
    headerStart,
    headerActions,
    className = '',
    activeClassName = '',
    previewClassName = '',
    style,
}: ThemeCardBaseProps) {
    const isDual = supportedModes === 'both';
    const [scheme, setScheme] = useState<ThemeVariant>(
        resolveCardScheme(supportedModes, activeScheme)
    );

    useEffect(() => {
        setScheme(resolveCardScheme(supportedModes, activeScheme));
    }, [activeScheme, supportedModes]);

    const tokens = resolveTokens(scheme);

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (!onSelect) return;
        if (event.target !== event.currentTarget) return;

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect();
        }
    };

    const handleVariantChange = (variant: ThemeVariant) => {
        setScheme(variant);
        onPreviewStart?.(variant);
    };

    const previewScheme = isDual ? scheme : undefined;

    return (
        <div
            className={[
                commonStyles.themeCard,
                className,
                isActive ? commonStyles.active : '',
                isActive ? activeClassName : '',
                isPreviewing ? commonStyles.previewing : '',
                isPreviewing ? previewClassName : '',
            ]
                .filter(Boolean)
                .join(' ')}
            style={style}
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? 0 : undefined}
            aria-pressed={onSelect ? isActive : undefined}
            aria-label={name}
            onClick={onSelect}
            onKeyDown={handleKeyDown}
            onPointerEnter={() => onPreviewStart?.(previewScheme)}
            onPointerLeave={onPreviewEnd}
            onFocus={() => onPreviewStart?.(previewScheme)}
            onBlur={onPreviewEnd}
        >
            <div className={commonStyles.themeHeader}>
                {headerStart}
                {headerActions ? (
                    <div className={commonStyles.themeCardActions}>
                        {headerActions}
                    </div>
                ) : null}
            </div>

            <RenderTheme mode={supportedModes} />
            {isDual && (
                <ThemeVariantToggle
                    value={scheme}
                    onChange={handleVariantChange}
                />
            )}
            <ThemeSwatchRow tokens={tokens} />
            <ThemeMetaLine shape={shape} density={density} />
        </div>
    );
}
