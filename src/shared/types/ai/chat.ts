export type MentionTarget = {
    type:
        | 'chapter'
        | 'character'
        | 'location'
        | 'organization'
        | 'item'
        | 'lore'
        | 'scene'
        | 'sequence';
    id: string;
    label: string;
    mode?: 'brief' | 'full';
};
