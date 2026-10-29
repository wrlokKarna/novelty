import type { Model } from '../../../shared/types/ai/provider';
import type { ModelDisplayMode } from '../../../shared/types/project/settings';

export const getModelDisplayName = (model: Model, mode: ModelDisplayMode) => {
    if (!model.alias) return model.label;

    switch (mode) {
        case 'both':
            return model.alias
                ? `${model.alias} (${model.label})`
                : model.label;
        case 'alias':
            return model.alias || model.label;
        case 'label':
        default:
            return model.label;
    }
};
