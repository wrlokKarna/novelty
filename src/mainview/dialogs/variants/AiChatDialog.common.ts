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
            'I need to begin the manuscript update for "Chronicles of Durge". First, I must navigate to the correct project directory. I will start by identifying the root path and then drilling down into the manuscript folder to ensure all subsequent file operations are performed in the correct context.',
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
        content:
            'I have successfully listed the files and confirmed that "timeline.md" exists in the directory. My next step is to fetch the current content of this file so I can analyze the existing structure and determine exactly where the new notes should be integrated without disrupting the established narrative flow.',
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
        content:
            'Now that I have the raw content of the timeline file, I will proceed to synthesize the user\'s requested changes. I need to ensure that the tone remains consistent with the "Chronicles of Durge" style while accurately reflecting the new lore points provided in the prompt.',
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
        content:
            'The modification request has been sent successfully. To ensure data integrity and verify that the changes were applied correctly by the server, I will perform a final read operation on the file to compare the current state against my expected output.',
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
        content:
            'Verification complete. The content of "timeline.md" now correctly reflects the updated notes. I have confirmed that no unintended regressions occurred during the patch process. I am now ready to provide a final summary to the user.',
    },
    {
        type: 'response',
        content:
            'I have successfully fetched the timeline file and modified it with your new notes. The changes are now live in the manuscript.',
        timeOut: 1,
    },
];
