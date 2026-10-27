import styles from './AiChatDialog.chakri.module.css';
export default function AiChatDialogChakri({
    activeView,
}: {
    activeView: 'tarun' | 'chakri';
}) {
    return (
        <div
            className={`${styles.tarun} ${activeView === 'chakri' ? styles.active : ''}`}
        >
            chakri
        </div>
    );
}
