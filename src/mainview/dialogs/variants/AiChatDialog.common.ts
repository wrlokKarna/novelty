export type chatSeqType = {
    type: 'processing' | 'reasoning' | 'tool' | 'response';
    content?: string;
    action?: 'list' | 'read' | 'fetch' | 'edit' | 'modify' | 'update';
    path?: string;
    request?: string;
    response?: string;
    timeOut: number;
}[];

/**
 * UI Logic Helper Tip:
 * To decide which icon to show, you can use a simple check in your component:
 *
 * const isWriteAction = ['edit', 'modify', 'update'].includes(item.action);
 * const icon = isWriteAction ? <PencilIcon /> : <ReadIcon />;
 */

export const MOCK_CHAT_DATA: chatSeqType = [
    {
        type: 'processing',
        content:
            '[{percentage: 10, delay: 1}, {percentage: 50, delay: 1}, {percentage: 100, delay: 1}]',
        timeOut: 2,
    },
    {
        timeOut: 1,
        type: 'reasoning',
        content:
            'Locating the project directory to begin the manuscript update.',
    },
    {
        type: 'processing',
        content:
            '[{percentage: 20, delay: 1}, {percentage: 60, delay: 1}, {percentage: 100, delay: 1}]',
        timeOut: 2,
    },
    {
        timeOut: 2,
        type: 'tool',
        action: 'list',
        path: 'projects\\chronicles of durge\\manuscript',
        request: 'ls projects/chronicles_of_durge/manuscript',
        response: '{ "status": "success", "files": ["timeline.md"] }',
    },
    {
        type: 'processing',
        content:
            '[{percentage: 30, delay: 1}, {percentage: 85, delay: 1}, {percentage: 100, delay: 1}]',
        timeOut: 2,
    },
    {
        timeOut: 1,
        type: 'reasoning',
        content: 'Fetching the current content of the timeline file.',
    },
    {
        type: 'processing',
        content:
            '[{percentage: 40, delay: 1}, {percentage: 90, delay: 1}, {percentage: 100, delay: 1}]',
        timeOut: 2,
    },
    {
        timeOut: 2,
        type: 'tool',
        action: 'fetch',
        path: 'projects\\chronicles of durge\\manuscript\\timeline.md',
        request: 'GET /api/v1/files/timeline.md',
        response: '{ "content": "Era 1: The beginning..." }',
    },
    {
        type: 'processing',
        content:
            '[{percentage: 50, delay: 1}, {percentage: 95, delay: 1}, {percentage: 100, delay: 1}]',
        timeOut: 2,
    },
    {
        timeOut: 1,
        type: 'reasoning',
        content: 'Applying the requested changes to the timeline text.',
    },
    {
        type: 'processing',
        content:
            '[{percentage: 60, delay: 1}, {percentage: 90, delay: 1}, {percentage: 100, delay: 1}]',
        timeOut: 2,
    },
    {
        timeOut: 3,
        type: 'tool',
        action: 'modify',
        path: 'projects\\chronicles of durge\\manuscript\\timeline.md',
        request: 'PATCH /api/v1/files/timeline.md',
        response: '{ "status": "success", "message": "File updated" }',
    },
    {
        type: 'processing',
        content: '[{percentage: 70, delay: 1}, {percentage: 100, delay: 1}]',
        timeOut: 2,
    },
    {
        timeOut: 1,
        type: 'reasoning',
        content: 'Verifying the update by reading the file again.',
    },
    {
        type: 'processing',
        content: '[{percentage: 80, delay: 1}, {percentage: 100, delay: 1}]',
        timeOut: 2,
    },
    {
        timeOut: 2,
        type: 'tool',
        action: 'read',
        path: 'projects\\chronicles of durge\\manuscript\\timeline.md',
        request: 'GET /api/v1/files/timeline.md',
        response: '{ "content": "Era 1: The beginning (Updated)..." }',
    },
    {
        type: 'processing',
        content: '[{percentage: 90, delay: 1}, {percentage: 100, delay: 1}]',
        timeOut: 2,
    },
    {
        timeOut: 1,
        type: 'reasoning',
        content: 'Finalizing the summary of actions taken.',
    },
    {
        type: 'response',
        content:
            'I have successfully fetched the timeline file and modified it with your new notes. The changes are now live in the manuscript.',
        timeOut: 1,
    },
];
