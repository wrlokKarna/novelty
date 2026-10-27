export type chatSeqType = {
    name: string;
    type: 'Thinking' | 'Tool';
    content: string;
    timeOut: number;
}[];

export const MOCK_CHAT_DATA: chatSeqType = [
    {
        name: 'One',
        timeOut: 1,
        type: 'Thinking',
        content:
            'Lorem ipsum dolor sit amet consectetur adipiscing elit ipsum occaecat et at eu labore exercitation deserunt odio ex eos ipsum nisi non elit amet at',
    },
    {
        name: 'Two',
        timeOut: 2,
        type: 'Tool',
        content:
            'Lorem ipsum dolor sit amet consectetur adipiscing elit ipsum occaecat et at eu labore exercitation deserunt odio',
    },
    {
        name: 'Three',
        timeOut: 1,
        type: 'Thinking',
        content:
            'Lorem ipsum dolor sit amet consectetur adipiscing elit ipsum occaecat et at eu labore exercitation deserunt odio ex eos ipsum nisi non elit amet atLorem ipsum dolor sit amet consectetur adipiscing elit ipsum occaecat et at eu labore exercitation deserunt odio ex eos ipsum nisi non elit amet at',
    },
    {
        name: 'Four',
        timeOut: 3,
        type: 'Tool',
        content:
            'Lorem Lorem ipsum dolor sit amet consectetur adipiscing elit ipsum occaecat et at eu labore exercitation deserunt odio ex eos ipsum nisi non elit amet atLorem ipsum dolor sit amet consectetur adipiscing elit ipsum occaecat et at eu labore exercitation deserunt odio ex eos ipsum nisi non elit amet at dolor sit amet consectetur adipiscing elit ipsum',
    },
    {
        name: 'Five',
        timeOut: 1,
        type: 'Thinking',
        content: 'Lorem ipsum dolor sit amet',
    },
];
