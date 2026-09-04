import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    IconBolt,
    IconKey,
    IconPencil,
    IconPlus,
    IconRefresh,
    IconTrash,
    IconX,
} from '@tabler/icons-react';
import { useSettings } from '../../contexts/SettingsContext';
import {
    checkProviderConnection,
    getModelsFromProvider,
} from '../../services/ai';
//import { div } from 'framer-motion/client';

import type { Model, Provider } from './../../utils/ai/providerHelpers';
import { getModelDisplayName } from '../../utils/ai/helper';

import styles from './ProviderCard.module.css';

type DefaultCardProps = {
    cardType?: 'default';
    cardData: {
        index: number;
        config: Provider;
    };
};

type AddCardProps = {
    cardType: 'add';
    cardData?: never;
    setShowNewProvider?: React.Dispatch<React.SetStateAction<boolean>>;
};

type Props = DefaultCardProps | AddCardProps;

export default function ProviderCard(props: Props) {
    const { settings, updateProviderConf, deleteProvider } = useSettings();
    const { cardType = 'default' } = props;
    const isAddType = cardType === 'add';

    const [check, setCheck] = useState<boolean | null>(false);

    const [apiToggle, setApiToggle] = useState(false);
    const [apiKey, setApiKey] = useState('');

    const [isEditingProviderLabel, setIsEditingProviderLabel] = useState(false);

    const [activeModelEdit, setActiveModelEdit] = useState<number | null>(null);

    const [isTesting, setIsTesting] = useState(false);
    const [testConnection, setTestConnection] = useState(false);

    const handleTestConnection = async () => {
        setIsTesting(true);
        setCheck(true);
        try {
            const result = await checkProviderConnection(previewUrl);
            if (result == false) {
                setCheck(null);
            }
            setTestConnection(result);
        } catch (error) {
            setTestConnection(false);
            console.error(error);
        } finally {
            setIsTesting(false);
        }
    };

    const [conf, setConf] = useState<Provider>({
        id: isAddType
            ? crypto.randomUUID().slice(0, 8)
            : props.cardData?.config.id || crypto.randomUUID().slice(0, 8),
        label: isAddType
            ? 'new provider'
            : (props.cardData?.config.label ?? 'new provider'),
        url: {
            base: isAddType
                ? 'http://localhost'
                : (props.cardData?.config.url.base ?? 'http://localhost'),
            port: isAddType ? 1234 : (props.cardData?.config.url.port ?? 1234),
            endpoint: isAddType
                ? {
                      type: 'lm-studio',
                      value: 'v1',
                  }
                : (props.cardData?.config.url.endpoint ?? {
                      type: 'lm-studio',
                      value: 'v1',
                  }),
        },
        models: isAddType ? [] : (props.cardData?.config?.models ?? []),

        enabled: isAddType ? false : (props.cardData?.config?.enabled ?? false),
    });

    const prevConfRef = useRef<Provider>(conf);

    useEffect(() => {
        const prev = prevConfRef.current;
        prevConfRef.current = conf;
        if (prev === conf) return;

        const timer = setTimeout(() => {
            if (isAddType && props.cardData?.index) return;
            if (props.cardData?.index !== undefined) {
                updateProviderConf(props.cardData?.index, conf);
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [conf]); //[conf, updateProviderConf, isAddType, props.cardData?.index]

    const previewUrl =
        `${conf.url.base.replace(/\/$/, '')}${conf.url.endpoint ? '/' + conf.url.endpoint.value.replace(/^\//, '') : ''}` ||
        'https://api.example.com';

    const [showCard, setShowCard] = useState(true);

    async function handleDeleteProvider() {
        const index = props.cardData?.index;
        if (index === undefined) return;

        setShowCard(false);

        const success = await deleteProvider?.(index);
        if (!success) {
            setShowCard(true);
            console.error('Failed to delete provider, card restored.');
        } else {
            console.log('Provider deleted successfully');
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setConf((prev) => {
            if (name === 'base') {
                return {
                    ...prev,
                    url: {
                        ...prev.url,
                        base: value,
                    },
                };
            } else if (name === 'endpoint-value') {
                return {
                    ...prev,
                    url: {
                        ...prev.url,
                        endpoint: {
                            ...prev.url.endpoint,
                            value,
                        },
                    },
                };
            } else if (name === 'provider-toggle') {
                return {
                    ...prev,
                    enabled: type === 'checkbox' ? checked : value === 'true',
                };
            } else if (name === 'provider-label') {
                return {
                    ...prev,
                    label: value,
                };
            } else {
                return {
                    ...prev,
                };
            }
        });
    };
    const handleSaveKey = (e: React.FormEvent) => {
        e.preventDefault();
        if (props.cardType === 'add') {
            props.setShowNewProvider?.(false);
        }
        updateProviderConf(-1, conf);
        console.log(
            'Add Btn Data: ',
            (settings?.providers.configs.length ?? -1) + 1,
            conf
        );
    };

    const handleGetModels = async (index: number, url: string) => {
        const models = await getModelsFromProvider(url);

        const mergeModels = (existing: Model[]) => {
            if (existing.length === 0) {
                return models;
            } else {
                const updated = [...existing];

                models.forEach((m: Model) => {
                    if (!(m.id in updated)) m.enabled = false;
                });

                return updated;
            }
        };

        if (index === -1) {
            setConf((prev) => ({
                ...prev,
                models: mergeModels(prev.models || []),
            }));
            console.log('conf', conf);
        } else {
            if (!settings) return null;
            const config = settings.providers.configs[index];
            const newModel = {
                ...config,
                models: mergeModels(config.models || []),
            };
            if (config) {
                setConf(() => ({
                    ...newModel,
                }));
                // needs refactor - add fail states
                updateProviderConf(index, newModel);
            }
        }
    };

    const toggleModel = (index: number) => {
        setConf((prev) => ({
            ...prev,
            models: prev.models.map((model, i) =>
                i === index ? { ...model, enabled: !model.enabled } : model
            ),
        }));
    };

    const groupedModels = useMemo(() => {
        const enabled: { model: Model; index: number }[] = [];
        const disabled: { model: Model; index: number }[] = [];

        conf.models.forEach((model, index) => {
            if (model.enabled) {
                enabled.push({ model, index });
            } else {
                disabled.push({ model, index });
            }
        });

        return { enabled, disabled };
    }, [conf.models, settings?.providers.configs]);

    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const renderModelButton = ({
        model,
        index,
    }: {
        model: Model;
        index: number;
    }) => {
        const isEditing = activeModelEdit === index;

        const handleClick = (
            e: React.MouseEvent<HTMLElement>,
            index: number,
            isEditing: boolean
        ) => {
            const detailValue = e.detail;

            if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current);
                clickTimeoutRef.current = null;

                setActiveModelEdit(isEditing ? null : index);
            } else {
                clickTimeoutRef.current = setTimeout(() => {
                    clickTimeoutRef.current = null;

                    if (detailValue === 1) {
                        toggleModel(index);
                    }
                }, 190);
            }
        };

        return (
            <button
                type="button"
                key={index}
                title="click to Activate or double click to Edit"
                className={`${model.enabled ? styles.active : ''} ${activeModelEdit === index ? styles.editing : ''}`}
                style={{
                    textAlign: 'center',
                    cursor: 'pointer',
                }}
                onClick={(e) => handleClick(e, index, isEditing)}
            >
                {isEditing ? (
                    <div style={{ display: 'flex' }}>
                        <input
                            type="text"
                            name=""
                            id=""
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveModelEdit(null);
                            }}
                        >
                            <IconX />
                        </button>
                    </div>
                ) : (
                    <span>
                        {getModelDisplayName(
                            model,
                            settings?.providers.modelDisplayMode || 'label'
                        )}
                    </span>
                )}
            </button>
        );
    };

    const generatedId = React.useId();

    return (
        <div
            key={
                isAddType
                    ? generatedId
                    : `react_key_${props.cardData?.config.id ?? generatedId}`
            }
            className={`${styles.providerCard} ${isAddType ? styles.addCard : styles.defaultCard} ${!conf.enabled && styles.disabled}`}
            style={{ display: `${showCard ? '' : 'none'}` }}
        >
            <div className={styles.providerCardHeader}>
                <div>
                    <input
                        type="checkbox"
                        name="provider-toggle"
                        id="providerToggle"
                        checked={conf.enabled}
                        className={styles.providerToggleInput}
                        onChange={handleChange}
                    />
                </div>
                <div className={styles.providerLabel}>
                    {isAddType ? (
                        <input
                            type="text"
                            name="provider-label"
                            value={conf.label}
                            onChange={handleChange}
                            placeholder="Provider Label"
                            aria-label="Provider Label"
                        />
                    ) : (
                        <div id={styles.cardLabel}>
                            {isEditingProviderLabel ? (
                                <input
                                    type="text"
                                    name="provider-label"
                                    value={conf.label}
                                    onChange={handleChange}
                                    placeholder="Provider Label"
                                    aria-label="Provider Label"
                                />
                            ) : (
                                <span>{props.cardData?.config.label}</span>
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
                        disabled={
                            (!conf.url.base && !conf.url.endpoint) || isTesting
                        }
                        className={`${styles.connectionBtn} ${styles.iconBtn} ${testConnection ? styles.active : (check ?? styles.inactive)}`}
                        onClick={handleTestConnection}
                    >
                        <IconBolt stroke={2} size={18} />
                        {isTesting
                            ? 'Testing...'
                            : testConnection
                              ? 'Connected'
                              : (check ?? 'Connection Failed')}
                    </button>
                    {isAddType && (
                        <button
                            className={styles.iconBtn}
                            onClick={handleSaveKey}
                        >
                            <IconPlus />
                            <span className="txt">Add</span>
                        </button>
                    )}
                    {!isAddType && props.cardData?.index !== undefined && (
                        <button
                            className={`${styles.iconBtn} ${styles.delete}`}
                            title="Delete provider"
                            aria-label="Delete provider"
                            onClick={handleDeleteProvider}
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
                            <label htmlFor={`base-url-${conf.id}`}>
                                Base URL
                            </label>
                            <input
                                id={`base-url-${conf.id}`}
                                name="base"
                                type="text"
                                placeholder="Base URL"
                                value={conf.url.base}
                                onChange={handleChange}
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label htmlFor={`endpoint-${conf.id}`}>
                                Endpoint
                            </label>
                            <input
                                id={`endpoint-${conf.id}`}
                                name="endpoint-value"
                                type="text"
                                placeholder="Endpoint"
                                value={conf.url.endpoint.value}
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
                            <label htmlFor={`api-${conf.id}`}>
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
                                id={`api-${conf.id}`}
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

                        <button
                            title="Get models"
                            onClick={() => {
                                if (isAddType && !props.cardData?.index) {
                                    handleGetModels(
                                        -1,
                                        `${conf.url.base}/${conf.url.endpoint.value}`
                                    );
                                } else if (
                                    props.cardData?.index &&
                                    props.cardData?.config.url.endpoint.value
                                ) {
                                    handleGetModels(
                                        props.cardData?.index,
                                        previewUrl
                                    );
                                }
                            }}
                        >
                            <IconRefresh />
                            <span className="txt">get models</span>
                        </button>
                    </div>

                    <div>
                        {groupedModels.enabled.length > 0 && (
                            <div
                                className={`${styles.modelsList} pill-container`}
                                style={{
                                    display: 'flex',
                                    gap: '8px',
                                    flexWrap: 'wrap',
                                }}
                            >
                                {groupedModels.enabled.map(renderModelButton)}
                            </div>
                        )}
                        {groupedModels.disabled.length > 0 && (
                            <details>
                                <summary
                                    style={{
                                        cursor: 'pointer',
                                        margin: '8px 0px',
                                    }}
                                >
                                    Disabled Models (
                                    {groupedModels.disabled.length})
                                </summary>
                                <div
                                    className={`${styles.modelsList} pill-container`}
                                    style={{
                                        display: 'flex',
                                        gap: '8px',
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    {groupedModels.disabled.map(
                                        renderModelButton
                                    )}
                                </div>
                            </details>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
