import type { SupportedModes } from '@/shared/types/project/settings/appearance/theme';
import styles from './ThemeCard.common.module.css';

export function RenderTheme({ mode }: { mode: SupportedModes }) {
    const showLight = mode === 'light' || mode === 'both';
    const showDark = mode === 'dark' || mode === 'both';
    return (
        <div className={styles.themeSupportedModes}>
            {showLight && <span>light</span>}
            {showDark && <span>dark</span>}
        </div>
    );
}
