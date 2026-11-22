import { IconRefresh } from '@tabler/icons-react';
import { ActsTab } from './plotArchitecture/ActsTab';
import { PlotThreadsTab } from './plotArchitecture/PlotThreadsTab';
import { StoryBeatsTab } from './plotArchitecture/StoryBeatsTab';
import type { PlotTab, Props } from './plotArchitecture/types';
import {
    PlotArchitectureContext,
    usePlotArchitecture,
} from './plotArchitecture/usePlotArchitecture';
import styles from './PlotArchitectureView.module.css';

const VIEW_TITLES: Record<PlotTab, string> = {
    acts: 'Acts',
    threads: 'Threads',
    beats: 'Beats',
};

export default function PlotArchitectureView({ view, ...dataProps }: Props) {
    const ctx = usePlotArchitecture(dataProps);

    return (
        <PlotArchitectureContext.Provider value={ctx}>
            <div
                className={styles['plot-architecture-view']}
                data-plot-architecture-view
            >
                <div className={styles['plot-arch-header']}>
                    <h3>{VIEW_TITLES[view]}</h3>
                    <button
                        className={styles['icon-btn']}
                        onClick={ctx.loadData}
                        title="Refresh"
                    >
                        <IconRefresh size={16} />
                    </button>
                </div>

                {view === 'acts' && <ActsTab />}
                {view === 'threads' && <PlotThreadsTab />}
                {view === 'beats' && <StoryBeatsTab />}
            </div>
        </PlotArchitectureContext.Provider>
    );
}
