import styles from '../projects.module.css';

export default function AssetsPage({
    onClick,
}: {
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
    return (
        <>
            <div className={styles.searchBar}>
                <button onClick={onClick}>new asset</button>
                <div className={styles.search}>
                    <input type="text" placeholder="Search assets" />
                    <button onClick={onClick}>Search</button>
                </div>
            </div>
        </>
    );
}
