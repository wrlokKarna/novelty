import { Settings } from '../../types';
import { Model } from '../../utils/ai/providerHelpers';
import ModelPillBtn from './ModelPillBtn';

import styles from './ModelListRenderer.module.css';

type ModelListRenderer = {
    settings: Settings | null;
    models: {
        model: Model;
        index: number;
    }[];
    activeModelEdit: number | null;
    setActiveModelEdit: (value: React.SetStateAction<number | null>) => void;
    toggleModel: (index: number) => void;
    handleModelAliasChange: (modelIndex: number, newModelLabel: string) => void;
};
export const ModelListRenderer = ({
    settings,
    models,
    activeModelEdit,
    setActiveModelEdit,
    toggleModel,
    handleModelAliasChange,
}: ModelListRenderer) => (
    <div className={`${styles.modelsList} pill-container`}>
        {models.map((item) => (
            <ModelPillBtn
                key={item.index}
                model={item.model}
                isEditing={activeModelEdit === item.index}
                displayMode={settings?.providers.modelDisplayMode || 'label'}
                onEditToggle={() =>
                    setActiveModelEdit(
                        activeModelEdit === item.index ? null : item.index
                    )
                }
                onToggle={() => {
                    toggleModel(item.index);
                    setActiveModelEdit(null);
                }}
                onAliasChange={(val) => handleModelAliasChange(item.index, val)}
                onSave={() => setActiveModelEdit(null)}
            />
        ))}
    </div>
);
