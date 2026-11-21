import { useEffect, useState } from 'react';
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

export default function PlotArchitectureView({
    activeTab,
    onTabChange,
    ...dataProps
}: Props) {
    const [currentTab, setCurrentTab] = useState<PlotTab>(activeTab ?? 'acts');
    const ctx = usePlotArchitecture(dataProps);

    useEffect(() => {
        if (activeTab) setCurrentTab(activeTab);
    }, [activeTab]);

    const selectTab = (tab: PlotTab) => {
        setCurrentTab(tab);
        onTabChange?.(tab);
    };

    return (
        <PlotArchitectureContext.Provider value={ctx}>
            <div
                className={styles['plot-architecture-view']}
                data-plot-architecture-view
            >
                <div className={styles['plot-arch-header']}>
                    <h3>Plot Architecture</h3>
                    <div className={styles['plot-arch-tabs']}>
                        <button
                            className={
                                currentTab === 'acts' ? styles.active : ''
                            }
                            onClick={() => selectTab('acts')}
                        >
                            Acts
                        </button>
                        <button
                            className={
                                currentTab === 'threads' ? styles.active : ''
                            }
                            onClick={() => selectTab('threads')}
                        >
                            Plot Threads
                        </button>
                        <button
                            className={
                                currentTab === 'beats' ? styles.active : ''
                            }
                            onClick={() => selectTab('beats')}
                        >
                            Story Beats
                        </button>
                    </div>
                    <button
                        className={styles['icon-btn']}
                        onClick={ctx.loadData}
                        title="Refresh"
                    >
                        <IconRefresh size={16} />
                    </button>
                </div>

                {currentTab === 'acts' && <ActsTab />}
                {currentTab === 'threads' && <PlotThreadsTab />}
                {currentTab === 'beats' && <StoryBeatsTab />}
            </div>
        </PlotArchitectureContext.Provider>
    );
}
