import { ModelDisplayMode } from '../../types';
import { Model } from './providerHelpers';

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
