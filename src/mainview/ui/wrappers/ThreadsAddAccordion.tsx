import { usePlotArchitectureContext } from '@/mainview/components/plotArchitecture/usePlotArchitecture';
import type { PlotThread } from '@/shared/types/project/manuscript';
import AddAccordion from '../primitives/AddAccordion';
import styles from './ThreadsAddAccordion.module.css';

type Props = { beatId: string; threads: PlotThread[] };
function getAssignedAndUnassignedMaps(threads: PlotThread[], beatID: string) {
    const assigned: PlotThread[] = [];
    const unassigned: PlotThread[] = [];
    threads.map((dm) =>
        JSON.parse(dm.linked_beats ?? '[]').includes(beatID)
            ? assigned.push(dm)
            : unassigned.push(dm)
    );
    return {
        assigned,
        unassigned,
    };
}

function ThreadsAddAccordion({ beatId, threads }: Props) {
    const { handleUpdateThread, loadData } = usePlotArchitectureContext();

    //cont getParsedJson = (JSON_string: string) => JSON.parse(JSON_string ?? [])

    const { assigned, unassigned } = getAssignedAndUnassignedMaps(
        threads,
        beatId
    );

    async function handleAddBtnClick(thread: PlotThread) {
        const threadBeats: string[] = JSON.parse(thread.linked_beats ?? '[]');
        const hasBeat = threadBeats.includes(beatId);
        const newBeats = hasBeat
            ? threadBeats?.filter((b) => b !== beatId)
            : Array.from(new Set([...threadBeats, beatId]));
        handleUpdateThread(thread.id, 'linked_beats', JSON.stringify(newBeats));
        await loadData();
    }
    return (
        <AddAccordion
            defaultOpen={false}
            showAddBtn={!!unassigned.length}
            header={assigned.map((t) => {
                return (
                    <button
                        className={`${styles['thread-pill-btn']} ${styles.linked}`}
                        onClick={() => handleAddBtnClick(t)}
                    >
                        {t.name}
                    </button>
                );
            })}
            body={unassigned.map((t) => (
                <button
                    className={`${styles['thread-pill-btn']}`}
                    onClick={() => handleAddBtnClick(t)}
                >
                    {t.name}
                </button>
            ))}
        />
    );
}

export default ThreadsAddAccordion;
