import { useState, useEffect } from 'react';
import type { chatSeqType } from './AiChatDialog.common';
import styles from './AiChatDialog.tarun.module.css';

function WordByWordText({ text }: { text: string }) {
    const words = text ? text.split(/(\s+)/) : [];
    return (
        <span>
            {words.map((word, i) => (
                <span
                    key={i}
                    className={styles.word}
                    style={{ animationDelay: `${i * 35}ms` }}
                >
                    {word}
                </span>
            ))}
        </span>
    );
}

export default function AiChatDialogTarun({
    activeView,
    chatSeq,
}: {
    activeView: 'tarun' | 'chakri';
    chatSeq: chatSeqType;
}) {
    const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
    const [isThinking, setIsThinking] = useState(true);

    useEffect(() => {
        setIsThinking(true);

        const totalWords = chatSeq.reduce((acc, step) => {
            const count = step.content ? step.content.split(/(\s+)/).length : 0;
            return acc + count;
        }, 0);

        const totalDuration = totalWords * 35 + 300;

        const timer = setTimeout(() => {
            setIsThinking(false);
        }, totalDuration);

        return () => clearTimeout(timer);
    }, [chatSeq]);

    const toggleStep = (index: number) => {
        setCollapsed((prev) => ({ ...prev, [index]: !prev[index] }));
    };

    return (
        <div
            className={`${styles.tarun} ${activeView === 'tarun' ? styles.active : ''}`}
        >
            <div>
                <div
                    className={`${styles.tarun} ${activeView === 'tarun' ? styles.active : ''}`}
                >
                    {chatSeq.length > 0 && (
                        <div>
                            <div
                                className={`${styles.thinkingheader} ${
                                    isThinking
                                        ? styles.thinkingActive
                                        : styles.thinkingDone
                                }`}
                            >
                                {chatSeq[chatSeq.length - 1]?.type}
                            </div>
                        </div>
                    )}

                    {chatSeq.map((s, index) => {
                        const isCollapsed = !!collapsed[index];
                        return (
                            <div key={index} className={styles.seqwrapper}>
                                <div
                                    className={`${styles.seqheader} ${isCollapsed ? styles.collapsed : ''}`}
                                    onClick={() => toggleStep(index)}
                                >
                                    <h5>
                                        <span>
                                            {s.name || 'Reasoned'}{' '}
                                            {s.type ? `(${s.type})` : ''}
                                        </span>
                                    </h5>
                                </div>
                                <div
                                    className={`${styles.seqbody} ${
                                        isCollapsed
                                            ? styles.seqbodyCollapsed
                                            : ''
                                    }`}
                                >
                                    <div className={styles.seqbodyInner}>
                                        <WordByWordText text={s.content} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div
                    className={`${styles.tarun} ${activeView === 'chakri' ? styles.active : ''}`}
                />
            </div>
        </div>
    );
}
