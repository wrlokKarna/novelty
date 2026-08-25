import { useState, useEffect, useRef } from 'react';
import {
    IconBolt,
    IconKey,
    IconPencil,
    IconPlus,
    IconRefresh,
    IconTrash,
    IconX,
} from '@tabler/icons-react';
import styles from './ProviderCard.module.css';
import { ProviderConfig, ModelEntry } from '../../types';
import { useSettings } from '../../contexts/SettingsContext';
import { getLMStudioModels } from '../../services/ai';
//import { div } from 'framer-motion/client';

type DefaultCardProps = {
    cardType?: 'default';
    cardData: {
        id: string;
        config: ProviderConfig & { baseUrl?: string };
    };
    onDelete?: (id: string) => void;
    onTestConnection?: (id: string) => void;
};

type AddCardProps = {
    cardType: 'add';
    cardData?: never;
    onAdd?: (newProvider: {
        id: string;
        baseUrl: string;
        endpoint: string;
        apiKey: string;
    }) => void;
};

type Props = DefaultCardProps | AddCardProps;

export default function ProviderCard(props: Props) {
    const { settings, updateProviderConfig, deleteProvider } = useSettings();
    const { cardType = 'default' } = props;
    const isAddType = cardType === 'add';

    const [providerId, setProviderId] = useState(
        isAddType ? '' : props.cardData?.id
    );

    const [apiToggle, setApiToggle] = useState(false);
    const [apiKey, setApiKey] = useState('');

    const [isPillModelsView, setIsPillModelView] = useState(true);
    const [isEditingProviderLabel, setIsEditingProviderLabel] = useState(false);

    const [activeModelEdit, setActiveModelEdit] = useState<number | null>(null);

    const [config, setConfig] = useState<
        ProviderConfig & { baseUrl: string; models: Record<string, ModelEntry> }
    >(() => ({
        type: 'lm-studio',
        baseUrl: isAddType ? '' : props.cardData?.config.baseUrl || '',
        endpoint: isAddType ? '' : props.cardData?.config.endpoint || '',
        enabled: false,
        models: isAddType ? {} : (props.cardData?.config?.models ?? {}),
    }));

    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const timer = setTimeout(() => {
            if (isAddType) return;
            console.log('Debounced Save Triggered:', config);
            //updateProviderConfig(providerId, config);
        }, 1000);

        return () => clearTimeout(timer);
    }, [config, providerId, updateProviderConfig]);

    const [activeModels, setActiveModels] = useState<number[]>(() => {
        const models = Object.entries(props.cardData?.config?.models ?? {});

        return models.reduce<number[]>((acc, [_, model], index) => {
            if (model.enabled === true) {
                acc.push(index);
            }
            return acc;
        }, []);
    });

    const previewUrl =
        `${config.baseUrl.replace(/\/$/, '')}${config.endpoint ? '/' + config.endpoint.replace(/^\//, '') : ''}` ||
        'https://api.example.com';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setConfig((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSaveKey = (e: React.FormEvent) => {
        e.preventDefault();
        // Trigger key save logic
    };

    const handleGetModels = async (id: string, url: string) => {
        //const models = await getLMStudioModels(endpoint);
        console.log('url', url);
        const models = await getLMStudioModels(url);

        console.log('card data config:', {
            config,
            url,
            models,
        });
        if (models.length === 0) return;

        const mergeModels = (existing: Record<string, any>) => {
            const updated = { ...existing };

            models.forEach((m) => {
                if (!(m in updated)) updated[m] = { enabled: false };
            });
            return updated;
        };

        if (id === '__preview__') {
            setConfig((prev) => ({
                ...prev,
                models: mergeModels(prev.models || {}),
            }));
        } else {
            if (!settings) return null;
            const config = settings.providers.configs[id];
            if (config) {
                updateProviderConfig(id, {
                    ...config,
                    models: mergeModels(config.models || {}),
                });
            }
        }
    };

    const toggleModel = (index: number) => {
        setActiveModels((prev) =>
            prev.includes(index)
                ? prev.filter((i) => i !== index)
                : [...prev, index]
        );
    };

    return (
        <div
            className={`${styles.providerCard} ${isAddType ? styles.addCard : styles.defaultCard}`}
        >
            <div className={styles.providerCardHeader}>
                <div>
                    <input
                        type="checkbox"
                        name=""
                        id="providerToggle"
                        className={styles.providerToggleInput}
                    />
                </div>
                <div className={styles.providerLabel}>
                    {isAddType ? (
                        <input
                            type="text"
                            value={providerId}
                            onChange={(e) => setProviderId(e.target.value)}
                            placeholder="Provider ID"
                            aria-label="Provider ID"
                        />
                    ) : (
                        <div id={styles.cardLabel}>
                            {isEditingProviderLabel ? (
                                <input
                                    type="text"
                                    value={providerId}
                                    onChange={(e) =>
                                        setProviderId(e.target.value)
                                    }
                                    placeholder="Provider ID"
                                    aria-label="Provider ID"
                                />
                            ) : (
                                <span>{props.cardData?.id}</span>
                            )}
                            <button
                                className={`${isEditingProviderLabel ? styles.editing : ''}`}
                                onClick={() =>
                                    setIsEditingProviderLabel(
                                        !isEditingProviderLabel
                                    )
                                }
                            >
                                {isEditingProviderLabel ? (
                                    <IconX />
                                ) : (
                                    <IconPencil />
                                )}
                            </button>
                        </div>
                    )}
                </div>
                <div>
                    <button
                        title="Test connection"
                        aria-label="Test connection"
                        disabled={!config.baseUrl}
                        className={styles.iconBtn}
                        /*
                        onClick={() =>
                            !isAddType &&
                            props.onTestConnection?.(props.cardData?.id)
                        }
                            */
                    >
                        <IconBolt stroke={2} size={18} />
                    </button>
                    {isAddType && (
                        <button className={styles.iconBtn}>
                            <IconPlus />
                            <span className="txt">Add</span>
                        </button>
                    )}
                    {!isAddType && props.cardData?.id && (
                        <button
                            className={`${styles.iconBtn} ${styles.delete}`}
                            title="Delete provider"
                            aria-label="Delete provider"
                            onClick={() => deleteProvider?.(props.cardData?.id)}
                        >
                            <IconTrash stroke={2} size={18} />
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.providerCardBody}>
                <div className={styles.urlSection}>
                    <div className={styles.settingsRow}>
                        <label>Server URL</label>
                    </div>

                    <div className={styles.inputFields}>
                        <div className={styles.inputGroup}>
                            <label htmlFor={`base-url-${providerId}`}>
                                Base URL
                            </label>
                            <input
                                id={`base-url-${providerId}`}
                                name="baseUrl"
                                type="text"
                                placeholder="Base URL"
                                value={config.baseUrl}
                                onChange={handleChange}
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label htmlFor={`endpoint-${providerId}`}>
                                Endpoint
                            </label>
                            <input
                                id={`endpoint-${providerId}`}
                                name="endpoint"
                                type="text"
                                placeholder="Endpoint"
                                value={config.endpoint}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className={styles.previewUrl}>
                        Full URL: <span>{previewUrl}</span>
                    </div>
                </div>

                <div
                    className={`${styles.apiSection} ${apiToggle ? 'active' : ''}`}
                >
                    <div className={styles.settingsRow}>
                        <div style={{ display: 'flex' }}>
                            <input
                                type="checkbox"
                                name=""
                                id=""
                                onChange={() => setApiToggle(!apiToggle)}
                            />
                            <label htmlFor={`api-${providerId}`}>
                                API key <span>(optional)</span>
                            </label>
                        </div>
                        {apiToggle && (
                            <a
                                href="#"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Get your API key
                            </a>
                        )}
                    </div>
                    {apiToggle && (
                        <form onSubmit={handleSaveKey}>
                            <input
                                id={`api-${providerId}`}
                                type="password"
                                placeholder="Paste your API key here..."
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                aria-label="API key"
                            />

                            <button type="submit">
                                <IconKey /> Save key
                            </button>
                        </form>
                    )}
                </div>

                <div className={styles.modelsSection}>
                    <div className={styles.settingsRow}>
                        <label>Models</label>
                        <div className={styles.viewTyes}>
                            <button
                                className={`${isPillModelsView ? styles.active : ''}`}
                                onClick={() => setIsPillModelView(true)}
                            >
                                pill
                            </button>
                            <button
                                className={`${!isPillModelsView ? styles.active : ''}`}
                                onClick={() => setIsPillModelView(false)}
                            >
                                list
                            </button>
                        </div>

                        <button
                            title="Get models"
                            onClick={() => {
                                if (isAddType && !props.cardData?.id) {
                                    handleGetModels(
                                        '__preview__',
                                        `${config.baseUrl}/${config.endpoint}`
                                    );
                                } else if (
                                    props.cardData?.id &&
                                    props.cardData?.config.endpoint
                                ) {
                                    handleGetModels(
                                        props.cardData?.id,
                                        props.cardData?.config.endpoint
                                    );
                                }
                            }}
                        >
                            <IconRefresh />
                            <span className="txt">get models</span>
                        </button>
                    </div>

                    <div
                        className={`${styles.modelsList} ${isPillModelsView ? styles.pill : styles.list}`}
                    >
                        {Object.entries(config.models).map(
                            ([key, model], index) => {
                                const isEditing = activeModelEdit === index;
                                return (
                                    <button
                                        type="button"
                                        key={index}
                                        title="click to Activate or double click to Edit"
                                        className={`${activeModels.includes(index) ? styles.active : ''} ${activeModelEdit === index ? styles.editing : ''}`}
                                        style={{
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => toggleModel(index)}
                                        onDoubleClick={() =>
                                            setActiveModelEdit(
                                                isEditing ? null : index
                                            )
                                        }
                                    >
                                        {isEditing ? (
                                            <div style={{ display: 'flex' }}>
                                                <input
                                                    type="text"
                                                    name=""
                                                    id=""
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                />
                                                <button
                                                    onClick={() =>
                                                        setActiveModelEdit(null)
                                                    }
                                                >
                                                    <IconX />
                                                </button>
                                            </div>
                                        ) : (
                                            <span>{model.alias || key}</span>
                                        )}
                                    </button>
                                );
                            }
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
