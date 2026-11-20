import * as React from 'react';

import type { PointRef, TElement } from 'platejs';

import {
    type ComboboxItemProps,
    Combobox,
    ComboboxGroup,
    ComboboxGroupLabel,
    ComboboxItem,
    ComboboxPopover,
    ComboboxProvider,
    ComboboxRow,
    Portal,
    useComboboxContext,
    useComboboxStore,
} from '@ariakit/react';
import { filterWords } from '@platejs/combobox';
import {
    type UseComboboxInputResult,
    useComboboxInput,
    useHTMLInputCursorState,
} from '@platejs/combobox/react';
import { useComposedRef, useEditorRef } from 'platejs/react';

/**
 * Inline combobox used by the `/` slash menu. Ported from the Plate registry
 * component; Tailwind/cva/cn are replaced with plain class names that are
 * styled in `mainview/index.css`.
 */

type FilterFn = (
    item: {
        value: string;
        group?: string;
        keywords?: string[];
        label?: string;
    },
    search: string
) => boolean;

type InlineComboboxContextValue = {
    filter: FilterFn | false;
    inputProps: UseComboboxInputResult['props'];
    inputRef: React.RefObject<HTMLInputElement | null>;
    removeInput: UseComboboxInputResult['removeInput'];
    showTrigger: boolean;
    trigger: string;
    setHasEmpty: (hasEmpty: boolean) => void;
};

const InlineComboboxContext = React.createContext<InlineComboboxContextValue>(
    null as unknown as InlineComboboxContextValue
);

const defaultFilter: FilterFn = (
    { group, keywords = [], label, value },
    search
) => {
    const uniqueTerms = new Set(
        [value, ...keywords, group, label].filter(Boolean)
    );

    return Array.from(uniqueTerms).some((keyword) =>
        filterWords(keyword!, search)
    );
};

type InlineComboboxProps = {
    children: React.ReactNode;
    element: TElement;
    trigger: string;
    filter?: FilterFn | false;
    hideWhenNoValue?: boolean;
    showTrigger?: boolean;
    value?: string;
    setValue?: (value: string) => void;
};

export const InlineCombobox = ({
    children,
    element,
    filter = defaultFilter,
    hideWhenNoValue = false,
    setValue: setValueProp,
    showTrigger = true,
    trigger,
    value: valueProp,
}: InlineComboboxProps) => {
    const editor = useEditorRef();
    const inputRef = React.useRef<HTMLInputElement>(null);
    const cursorState = useHTMLInputCursorState(inputRef);

    const [valueState, setValueState] = React.useState('');
    const hasValueProp = valueProp !== undefined;
    const value = hasValueProp ? valueProp : valueState;

    const setValue = React.useCallback(
        (newValue: string) => {
            setValueProp?.(newValue);

            if (!hasValueProp) {
                setValueState(newValue);
            }
        },
        [setValueProp, hasValueProp]
    );

    /**
     * Track the point just before the input element so we know where to
     * insertText if the combobox closes due to a selection change.
     */
    const insertPointRef = React.useRef<PointRef | null>(null);

    React.useEffect(() => {
        insertPointRef.current?.unref();
        insertPointRef.current = null;

        const path = editor.api.findPath(element);

        if (!path) return;

        const point = editor.api.before(path);

        if (!point) return;

        const pointRef = editor.api.pointRef(point);
        insertPointRef.current = pointRef;

        return () => {
            if (insertPointRef.current === pointRef) {
                insertPointRef.current = null;
            }
            pointRef.unref();
        };
    }, [editor, element]);

    const { props: inputProps, removeInput } = useComboboxInput({
        cancelInputOnBlur: true,
        cursorState,
        autoFocus: true,
        ref: inputRef,
        onCancelInput: (cause) => {
            if (cause !== 'backspace') {
                editor.tf.insertText(trigger + value, {
                    at: insertPointRef.current?.current ?? undefined,
                });
            }
            if (cause === 'arrowLeft' || cause === 'arrowRight') {
                editor.tf.move({
                    distance: 1,
                    reverse: cause === 'arrowLeft',
                });
            }
        },
    });

    const [hasEmpty, setHasEmpty] = React.useState(false);

    const contextValue: InlineComboboxContextValue = React.useMemo(
        () => ({
            filter,
            inputProps,
            inputRef,
            removeInput,
            setHasEmpty,
            showTrigger,
            trigger,
        }),
        [
            trigger,
            showTrigger,
            filter,
            inputRef,
            inputProps,
            removeInput,
            setHasEmpty,
        ]
    );

    const store = useComboboxStore({
        setValue: (newValue) => React.startTransition(() => setValue(newValue)),
    });

    const items = store.useState('items');

    /**
     * If there is no active ID and the list of items changes, select the first
     * item.
     */
    React.useEffect(() => {
        if (!store.getState().activeId) {
            store.setActiveId(store.first());
        }
    }, [items, store]);

    return (
        <span contentEditable={false}>
            <ComboboxProvider
                open={
                    (items.length > 0 || hasEmpty) &&
                    (!hideWhenNoValue || value.length > 0)
                }
                store={store}
            >
                <InlineComboboxContext.Provider value={contextValue}>
                    {children}
                </InlineComboboxContext.Provider>
            </ComboboxProvider>
        </span>
    );
};

export const InlineComboboxInput = ({
    className,
    ref: propRef,
    ...props
}: React.HTMLAttributes<HTMLInputElement> & {
    ref?: React.RefObject<HTMLInputElement | null>;
}) => {
    const {
        inputProps,
        inputRef: contextRef,
        showTrigger,
        trigger,
    } = React.useContext(InlineComboboxContext);

    const store = useComboboxContext()!;
    const value = store.useState('value');

    const ref = useComposedRef(propRef, contextRef);

    /**
     * To create an auto-resizing input, we render a visually hidden span
     * containing the input value and position the input element on top of it.
     */
    return (
        <>
            {showTrigger && trigger}

            <span className="plate-combobox-input-wrap">
                <span className="plate-combobox-input-ghost" aria-hidden="true">
                    {value || '\u200B'}
                </span>

                <Combobox
                    ref={ref}
                    className={
                        className
                            ? `plate-combobox-input ${className}`
                            : 'plate-combobox-input'
                    }
                    value={value}
                    autoSelect
                    {...inputProps}
                    {...props}
                />
            </span>
        </>
    );
};

InlineComboboxInput.displayName = 'InlineComboboxInput';

export const InlineComboboxContent: typeof ComboboxPopover = ({
    className,
    ...props
}) => {
    // Portal prevents CSS from leaking into popover
    const store = useComboboxContext();

    function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
        if (!store) return;

        const state = store.getState();
        const { items, activeId } = state;

        if (!items.length) return;

        const currentIndex = items.findIndex((item) => item.id === activeId);

        if (event.key === 'ArrowUp' && currentIndex <= 0) {
            event.preventDefault();
            store.setActiveId(store.last());
        } else if (
            event.key === 'ArrowDown' &&
            currentIndex >= items.length - 1
        ) {
            event.preventDefault();
            store.setActiveId(store.first());
        }
    }

    return (
        <Portal>
            <ComboboxPopover
                className={
                    className
                        ? `plate-combobox-popover ${className}`
                        : 'plate-combobox-popover'
                }
                onKeyDownCapture={handleKeyDown}
                {...props}
            />
        </Portal>
    );
};

export const InlineComboboxItem = ({
    className,
    focusEditor = true,
    group,
    keywords,
    label,
    onClick,
    ...props
}: {
    focusEditor?: boolean;
    group?: string;
    keywords?: string[];
    label?: string;
} & ComboboxItemProps &
    Required<Pick<ComboboxItemProps, 'value'>>) => {
    const { value } = props;

    const { filter, removeInput } = React.useContext(InlineComboboxContext);

    const store = useComboboxContext()!;

    // Optimization: Do not subscribe to value if filter is false
    const search = filter && store.useState('value');

    const visible = React.useMemo(
        () =>
            !filter ||
            filter({ group, keywords, label, value }, search as string),
        [filter, group, keywords, label, value, search]
    );

    if (!visible) return null;

    return (
        <ComboboxItem
            className={
                className
                    ? `plate-combobox-item ${className}`
                    : 'plate-combobox-item'
            }
            onClick={(event) => {
                removeInput(focusEditor);
                onClick?.(event);
            }}
            {...props}
        />
    );
};

export const InlineComboboxEmpty = ({
    children,
    className,
}: React.HTMLAttributes<HTMLDivElement>) => {
    const { setHasEmpty } = React.useContext(InlineComboboxContext);
    const store = useComboboxContext()!;
    const items = store.useState('items');

    React.useEffect(() => {
        setHasEmpty(true);

        return () => {
            setHasEmpty(false);
        };
    }, [setHasEmpty]);

    if (items.length > 0) return null;

    return (
        <div
            className={
                className
                    ? `plate-combobox-item is-static ${className}`
                    : 'plate-combobox-item is-static'
            }
        >
            {children}
        </div>
    );
};

export const InlineComboboxRow = ComboboxRow;

export function InlineComboboxGroup({
    className,
    ...props
}: React.ComponentProps<typeof ComboboxGroup>) {
    return (
        <ComboboxGroup
            {...props}
            className={
                className
                    ? `plate-combobox-group ${className}`
                    : 'plate-combobox-group'
            }
        />
    );
}

export function InlineComboboxGroupLabel({
    className,
    ...props
}: React.ComponentProps<typeof ComboboxGroupLabel>) {
    return (
        <ComboboxGroupLabel
            {...props}
            className={
                className
                    ? `plate-combobox-group-label ${className}`
                    : 'plate-combobox-group-label'
            }
        />
    );
}
