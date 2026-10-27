import styles from './AiChatDialog.tarun.module.css';
export default function AiChatDialogTarun({
    activeView,
}: {
    activeView: 'tarun' | 'chakri';
}) {
    return (
        <div
            className={`${styles.tarun} ${activeView === 'tarun' ? styles.active : ''}`}
        >
            tarun
        </div>
    );
}
