import * as React from 'react';

import {
    IconArticle,
    IconBlockquote,
    IconCode,
    IconH1,
    IconH2,
    IconH3,
    IconList,
    IconListNumbers,
} from '@tabler/icons-react';
import { KEYS, type TComboboxInputElement } from 'platejs';
import { PlateElement, type PlateElementProps } from 'platejs/react';

import {
    InlineCombobox,
    InlineComboboxContent,
    InlineComboboxEmpty,
    InlineComboboxGroup,
    InlineComboboxGroupLabel,
    InlineComboboxInput,
    InlineComboboxItem,
} from './InlineCombobox';
import { applyBlockCommand } from './transforms';

type SlashItem = {
    icon: React.ReactNode;
    label: string;
    value: string;
    keywords?: string[];
};

const basicBlocks: SlashItem[] = [
    {
        icon: <IconArticle size={16} />,
        keywords: ['p', 'paragraph'],
        label: 'Text',
        value: KEYS.p,
    },
    {
        icon: <IconH1 size={16} />,
        keywords: ['title', 'h1'],
        label: 'Heading 1',
        value: KEYS.h1,
    },
    {
        icon: <IconH2 size={16} />,
        keywords: ['subtitle', 'h2'],
        label: 'Heading 2',
        value: KEYS.h2,
    },
    {
        icon: <IconH3 size={16} />,
        keywords: ['subtitle', 'h3'],
        label: 'Heading 3',
        value: KEYS.h3,
    },
    {
        icon: <IconList size={16} />,
        keywords: ['unordered', 'ul', 'bullet', '-'],
        label: 'Bulleted list',
        value: KEYS.ulClassic,
    },
    {
        icon: <IconListNumbers size={16} />,
        keywords: ['ordered', 'ol', 'numbered', '1'],
        label: 'Numbered list',
        value: KEYS.olClassic,
    },
    {
        icon: <IconBlockquote size={16} />,
        keywords: ['citation', 'quote', '>'],
        label: 'Blockquote',
        value: KEYS.blockquote,
    },
    {
        icon: <IconCode size={16} />,
        keywords: ['code', 'pre', '```'],
        label: 'Code Block',
        value: KEYS.codeBlock,
    },
];

export function SlashInputElement(
    props: PlateElementProps<TComboboxInputElement>
) {
    const { editor, element } = props;

    return (
        <PlateElement {...props} as="span">
            <InlineCombobox element={element} trigger="/">
                <InlineComboboxInput />

                <InlineComboboxContent>
                    <InlineComboboxEmpty>No results</InlineComboboxEmpty>

                    <InlineComboboxGroup>
                        <InlineComboboxGroupLabel>
                            Basic blocks
                        </InlineComboboxGroupLabel>

                        {basicBlocks.map(({ icon, keywords, label, value }) => (
                            <InlineComboboxItem
                                key={value}
                                value={value}
                                label={label}
                                group="Basic blocks"
                                keywords={keywords}
                                onClick={() => applyBlockCommand(editor, value)}
                            >
                                <span className="plate-combobox-item-icon">
                                    {icon}
                                </span>
                                {label}
                            </InlineComboboxItem>
                        ))}
                    </InlineComboboxGroup>
                </InlineComboboxContent>
            </InlineCombobox>

            {props.children}
        </PlateElement>
    );
}
