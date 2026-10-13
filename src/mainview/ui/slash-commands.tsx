import { createSuggestionItems } from 'novel';
import {
    IconArticle,
    IconH1,
    IconH2,
    IconH3,
    IconList,
    IconListNumbers,
    IconBlockquote,
    IconCode,
} from '@tabler/icons-react';

export const suggestionItems = createSuggestionItems([
    {
        title: 'Text',
        description: 'Just start typing with plain text.',
        searchTerms: ['p', 'paragraph'],
        icon: <IconArticle size={18} />,
        command: ({ editor, range }) => {
            editor
                .chain()
                .focus()
                .deleteRange(range)
                .toggleNode('paragraph', 'paragraph')
                .run();
        },
    },
    {
        title: 'Heading 1',
        description: 'Big section heading.',
        searchTerms: ['title', 'h1'],
        icon: <IconH1 size={18} />,
        command: ({ editor, range }) => {
            editor
                .chain()
                .focus()
                .deleteRange(range)
                .setNode('heading', { level: 1 })
                .run();
        },
    },
    {
        title: 'Heading 2',
        description: 'Medium section heading.',
        searchTerms: ['h2'],
        icon: <IconH2 size={18} />,
        command: ({ editor, range }) => {
            editor
                .chain()
                .focus()
                .deleteRange(range)
                .setNode('heading', { level: 2 })
                .run();
        },
    },
    {
        title: 'Heading 3',
        description: 'Small section heading.',
        searchTerms: ['h3'],
        icon: <IconH3 size={18} />,
        command: ({ editor, range }) => {
            editor
                .chain()
                .focus()
                .deleteRange(range)
                .setNode('heading', { level: 3 })
                .run();
        },
    },
    {
        title: 'Bullet List',
        description: 'Unordered list.',
        searchTerms: ['ul', 'list'],
        icon: <IconList size={18} />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleBulletList().run();
        },
    },
    {
        title: 'Ordered List',
        description: 'Numbered list.',
        searchTerms: ['ol', 'numbered'],
        icon: <IconListNumbers size={18} />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleOrderedList().run();
        },
    },
    {
        title: 'Blockquote',
        description: 'Insert a quote.',
        searchTerms: ['quote'],
        icon: <IconBlockquote size={18} />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleBlockquote().run();
        },
    },
    {
        title: 'Code Block',
        description: 'Insert a code block.',
        searchTerms: ['code', 'pre'],
        icon: <IconCode size={18} />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
        },
    },
]);
