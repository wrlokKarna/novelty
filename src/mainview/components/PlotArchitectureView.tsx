import { useState } from 'react';
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

const THREADS_TYPES = {
    main: 'Main',
    subplot: 'Subplot',
    'character-arc': 'Character Arc',
    mystery: 'Mystery',
    romance: 'Romance',
    thematic: 'Thematic',
};
export default function PlotArchitectureView({ view, ...dataProps }: Props) {
    const ctx = usePlotArchitecture(dataProps);

    const [showAddBtn, setShowAddBtn] = useState(true);
    const [toggleAdd, setToggleAdd] = useState(true);
    const [toggleActiveAddBtn, setToggleActiveAddBtn] = useState(true);
    return (
        <PlotArchitectureContext.Provider value={ctx}>
            <div
                className={styles['plot-architecture-view']}
                data-plot-architecture-view
            >
                <div className={styles['plot-arch-header']}>
                    <h3>{VIEW_TITLES[view]}</h3>
                    {showAddBtn && (
                        <div
                            className={`${styles.addBtnCont}  ${toggleActiveAddBtn ? styles.active : ''}`}
                            style={{ display: 'flex', marginLeft: 'auto' }}
                            onMouseEnter={() => setToggleAdd(!toggleAdd)}
                            onMouseLeave={() => setToggleAdd(!toggleAdd)}
                        >
                            {toggleAdd && toggleActiveAddBtn && (
                                <div className={`${styles.threadSelector}`}>
                                    {Object.entries(THREADS_TYPES).map(
                                        ([key, label]) => (
                                            <button key={key} type="button">
                                                <span>{label}</span>
                                            </button>
                                        )
                                    )}
                                </div>
                            )}

                            <button
                                onClick={() =>
                                    setToggleActiveAddBtn(!toggleActiveAddBtn)
                                }
                            >
                                add
                            </button>
                        </div>
                    )}
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
