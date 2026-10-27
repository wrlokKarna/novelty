import { chatSeqType } from './AiChatDialog.common';
import styles from './AiChatDialog.chakri.module.css';
export default function AiChatDialogChakri({
    activeView,
    chatSeq,
}: {
    activeView: 'tarun' | 'chakri';
    chatSeq: chatSeqType;
}) {
    return (
        <div
            className={`${styles.tarun} ${activeView === 'chakri' ? styles.active : ''}`}
        >
            chakri
        </div>
    );
}
