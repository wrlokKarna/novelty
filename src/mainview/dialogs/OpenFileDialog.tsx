import { useState, useEffect, useRef } from 'react';
import { IconFile, IconSearch } from '@tabler/icons-react';
import Dialog from '../components/Dialog';
import styles from './OpenFileDialog.module.css';

export type RecentFile = {
    path: string;
    name: string;
};

interface OpenFileDialogProps {
    open: boolean;
    onClose: () => void;
    recentFiles: RecentFile[];
    projectPath: string | null;
    onFileSelect: (
        absolutePath: string,
        relativePath: string,
        fileName: string
    ) => void;
}

export default function OpenFileDialog({
    open,
    onClose,
    recentFiles,
    projectPath,
    onFileSelect,
}: OpenFileDialogProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const filteredFiles = recentFiles.filter((file) =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        if (open) {
            setSearchQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery]);

    function getDisplayPath(relativePath: string): string {
        return projectPath ? `${projectPath}${relativePath}` : relativePath;
    }

    function handleSelect(file: RecentFile) {
        const absolutePath = getDisplayPath(file.path);
        onFileSelect(absolutePath, file.path, file.name);
        onClose();
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) =>
                Math.min(prev + 1, filteredFiles.length - 1)
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && filteredFiles.length > 0) {
            e.preventDefault();
            handleSelect(filteredFiles[selectedIndex]);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    }

    return (
        <Dialog open={open} onClose={onClose} title="Open File">
            <div className={styles.container} onKeyDown={handleKeyDown}>
                <div className={styles.searchBar}>
                    <IconSearch size={16} stroke={2} />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search recent files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className={styles.fileList}>
                    {filteredFiles.length === 0 ? (
                        <div className={styles.emptyState}>
                            No recently opened files
                        </div>
                    ) : (
                        filteredFiles.map((file, index) => (
                            <div
                                key={file.path}
                                className={`${styles.fileItem} ${
                                    index === selectedIndex
                                        ? styles.selected
                                        : ''
                                }`}
                                onClick={() => handleSelect(file)}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <IconFile size={14} stroke={2} />
                                <div className={styles.fileInfo}>
                                    <span className={styles.fileName}>
                                        {file.name}
                                    </span>
                                    <span className={styles.filePath}>
                                        {file.path}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Dialog>
    );
}
