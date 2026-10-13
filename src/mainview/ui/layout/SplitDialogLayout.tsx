import React from 'react';
import Styles from './SplitDialogLayout.module.css';

type Props = {
    children: React.JSX.Element;
};

export default function SplitDialogLayout({ children }: Props) {
    return <div className={Styles.dialogContent}>{children}</div>;
}
