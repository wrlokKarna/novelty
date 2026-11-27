import { useState, type ReactNode } from 'react';
import { IconSquareRoundedPlus } from '@tabler/icons-react';
import styles from './AddAccordion.module.css';

type Props = {
    header: ReactNode;
    body: ReactNode;
    defaultOpen?: boolean;
    showAddBtn?: boolean;
};

export default function AddAccordion({
    header,
    body,
    defaultOpen = false,
    showAddBtn = true,
}: Props) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className={styles.addAccordion}>
            <div className={styles.addAccordionHeader}>
                {showAddBtn && (
                    <button
                        className={`${styles.addBtn} ${open ? styles.active : ''}`}
                        onClick={() => setOpen((prev) => !prev)}
                    >
                        <IconSquareRoundedPlus size={18} />
                        add
                    </button>
                )}
                <div className={styles.inlineAddAccordionBtns}>{header}</div>
            </div>
            {open && <div className={styles.addAccordionBody}>{body}</div>}
        </div>
    );
}
