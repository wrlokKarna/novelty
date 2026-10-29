export type ProviderType =
    'lm-studio' | 'openai' | 'anthropic' | 'ollama' | 'custom';

export interface Model {
    id: string;
    label: string;
    alias?: string;
    labelType: boolean;
    favorite: boolean;
    enabled: boolean;
    active: boolean;
    supportsTools?: boolean;
}

export type Provider = {
    id: string;
    label: string;
    url: {
        base: string;
        port?: number;
        endpoint: {
            type: ProviderType;
            value: string;
        };
    };
    api?: string;
    models: Model[];
    enabled: boolean;
};

export interface ProviderConf {
    showAlias: boolean;
    providers: Provider[];
}
