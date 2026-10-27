import { chatSeqType } from './AiChatDialog.common';

import styles from './AiChatDialog.tarun.module.css';

export default function AiChatDialogTarun({
    activeView,
    chatSeq,
}: {
    activeView: 'tarun' | 'chakri';
    chatSeq: chatSeqType;
}) {
    return (
        <div
            className={`${styles.tarun} ${activeView === 'tarun' ? styles.active : ''}`}
        >
            tarun
            <div className="">
                <div
                    className={`${styles.tarun} ${activeView === 'tarun' ? styles.active : ''}`}
                >
                    <div>
                        <div className={styles.thinkingheader}>
                            {chatSeq[chatSeq.length - 1]?.type}
                        </div>
                    </div>
                    {chatSeq.map((s, index) => (
                        <div className="">
                            <div className={styles.seqheader}>
                                <h5>
                                    Step: {s.name} {s.type}
                                </h5>
                            </div>
                            <div className={styles.seqbody}>{s.content}</div>
                        </div>
                    ))}
                </div>
                <div
                    className={`${styles.tarun} ${activeView === 'chakri' ? styles.active : ''}`}
                ></div>
            </div>
        </div>
    );
}
