import { Provider } from '../../utils/ai/providerHelpers';
import ollamaIcon from './../../assets/svgs/ollama-logo_svgstack_com_71401788615746.png';
import lmStudioIcon from './../../assets/svgs/lm-studio-logo_svgstack_com_71391788615764.png';
import unslothIcon from './../../assets/svgs/images.png';
export const DEFAULT_PROVIDERS: Provider[] = [
    {
        id: 'ollama',
        label: 'ollama',
        url: {
            base: 'localhost',
            port: 11434,
            endpoint: {
                type: 'ollama',
                value: 'v1',
            },
        },
        models: [],
        enabled: false,
    },
    {
        id: 'lm-studio',
        label: 'LM Studio',
        url: {
            base: 'localhost',
            port: 1234,
            endpoint: {
                type: 'lm-studio',
                value: 'v1',
            },
        },
        models: [],
        enabled: false,
    },
    {
        id: 'unsloth',
        label: 'Unsloth',
        url: {
            base: 'localhost',
            port: 8080,
            endpoint: {
                type: 'openai',
                value: 'v1',
            },
        },
        models: [],
        enabled: false,
    },
];

export const DEFAULT_PROVIDERS_ICONS = {
    ollama: ollamaIcon,
    'lm-studio': lmStudioIcon,
    unsloth: unslothIcon,
};
