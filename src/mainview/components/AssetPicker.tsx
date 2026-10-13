import { useState, useEffect, useRef } from 'react';
import SubDialog from './SubDialog';
import { useRPC } from '../contexts/RPCContext';
import type { Asset } from '../types/index';
import { IconCheck, IconPlus } from '@tabler/icons-react';
import styles from './AssetPicker.module.css';

interface AssetPickerProps {
    open: boolean;
    onClose: () => void;
    onSelect: (assetId: string) => void;
    projectId: string;
    selectedAssetId?: string | null;
}

export default function AssetPicker({
    open,
    onClose,
    onSelect,
    projectId,
    selectedAssetId,
}: AssetPickerProps) {
    const rpc = useRPC();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            loadAssets();
        }
    }, [open]);

    async function loadAssets() {
        setLoading(true);
        try {
            const result = await rpc.request['db:get-assets'](projectId);
            setAssets(Array.isArray(result) ? result : []);
        } catch (e) {
            console.error('Failed to load assets:', e);
            setAssets([]);
        } finally {
            setLoading(false);
        }
    }

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const newAsset = await rpc.request['db:create-asset']({
                    id: crypto.randomUUID(),
                    projectId,
                    name: file.name,
                    type: file.type,
                    path: reader.result as string,
                    metadata: null,
                });
                setAssets((prev) => [newAsset, ...prev]);
                onSelect(newAsset.id);
            } catch (e) {
                console.error('Failed to upload asset:', e);
            }
        };
        reader.readAsDataURL(file);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    function handleAssetClick(asset: Asset) {
        onSelect(asset.id);
    }

    return (
        <SubDialog open={open} onClose={onClose} title="Select Cover Image">
            <div className={styles.content}>
                <p className={styles.aspectHint}>
                    Recommended: 2:3 aspect ratio for book covers
                </p>
                <div className={styles.uploadSection}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className={styles.fileInput}
                    />
                    <button onClick={() => fileInputRef.current?.click()}>
                        <IconPlus size={16} stroke={2} />
                        Add New Cover
                    </button>
                </div>

                {loading ? (
                    <div className={styles.loading}>Loading...</div>
                ) : assets.length === 0 ? (
                    <div className={styles.empty}>
                        No covers yet. Upload an image above.
                    </div>
                ) : (
                    <div className={styles.assetGrid}>
                        {assets.map((asset) => {
                            const isActive = asset.id === selectedAssetId;
                            return (
                                <button
                                    key={asset.id}
                                    className={`${styles.assetItem} ${isActive ? styles.assetItemActive : ''}`}
                                    onClick={() => handleAssetClick(asset)}
                                >
                                    {asset.type.startsWith('image/') &&
                                    asset.path ? (
                                        <>
                                            <img
                                                src={asset.path}
                                                alt={asset.name}
                                            />
                                            {isActive && (
                                                <span
                                                    className={
                                                        styles.activeBadge
                                                    }
                                                >
                                                    <IconCheck
                                                        size={14}
                                                        stroke={3}
                                                    />
                                                    Active
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <span className={styles.assetName}>
                                            {asset.name}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </SubDialog>
    );
}
