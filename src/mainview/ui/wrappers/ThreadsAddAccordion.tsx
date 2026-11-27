import { usePlotArchitectureContext } from '@/mainview/components/plotArchitecture/usePlotArchitecture';
import type { PlotThread } from '@/shared/types/project/manuscript';
import AddAccordion from '../primitives/AddAccordion';
import styles from './ThreadsAddAccordion.module.css';

type Props = { beatId: string; threads: PlotThread[] };
function getAssignedAndUnassignedMaps(treads: PlotThread[], beatID: string) {
    const assinged: PlotThread[] = [];
    const unassinged: PlotThread[] = [];
    treads.map((dm) =>
        JSON.parse(dm.linked_beats ?? '[]').includes(beatID)
            ? assinged.push(dm)
            : unassinged.push(dm)
    );
    return {
        assinged,
        unassinged,
    };
}

function ThreadsAddAccordion({ beatId, threads }: Props) {
    const { handleUpdateThread, loadData } = usePlotArchitectureContext();

    //cont getParsedJson = (JSON_string: string) => JSON.parse(JSON_string ?? [])

    const { assinged, unassinged } = getAssignedAndUnassignedMaps(
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
            showAddBtn={!!unassinged.length}
            header={assinged.map((t) => {
                return (
                    <button
                        className={`${styles['thread-pill-btn']} ${styles.linked}`}
                        onClick={() => handleAddBtnClick(t)}
                    >
                        {t.name}
                    </button>
                );
            })}
            body={unassinged.map((t) => (
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
