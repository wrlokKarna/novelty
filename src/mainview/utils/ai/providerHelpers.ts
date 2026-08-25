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
}

export interface Provider {
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
}

export interface ProviderConf {
    showAlias: boolean;
    providers: Provider[];
}

export const AI_PROVIDERS: Provider[] = [
    {
        id: 'lm-studio',
        label: 'LM Studio',
        url: {
            base: '',
            endpoint: {
                type: 'lm-studio',
                value: '/v1',
            },
        },
        models: [],
        enabled: false,
    },
    {
        id: 'openai',
        label: 'OpenAI',
        url: {
            base: '',
            endpoint: {
                type: 'openai',
                value: '/v1',
            },
        },
        models: [],
        enabled: false,
    },
    {
        id: 'anthropic',
        label: 'Anthropic',
        url: {
            base: '',
            endpoint: {
                type: 'anthropic',
                value: '/v1/messages',
            },
        },
        models: [],
        enabled: false,
    },
    {
        id: 'ollama',
        label: 'Ollama',
        url: {
            base: '',
            endpoint: {
                type: 'ollama',
                value: '/v1',
            },
        },
        models: [],
        enabled: false,
    },
    {
        id: 'custom',
        label: 'Custom',
        url: {
            base: '',
            endpoint: {
                type: 'custom',
                value: '',
            },
        },
        models: [],
        enabled: false,
    },
];

/*
export const getEndpointPath = (type: ProviderType): string =>
    AI_PROVIDERS[type]?.endpointPath ?? '';

export const typeOptions = (Object.keys(AI_PROVIDERS) as ProviderType[]).map(
    (key) => ({
        value: key,
        label: AI_PROVIDERS[key].label,
    })
);
*/
