export type PROJECTS_MOCK = {
    name: string;
    series?: string;
    date: number;
};

export const PROJECTS_MOCK: PROJECTS_MOCK[] = [
    {
        name: 'bahubaali',
        date: 1772323200000,
    },
    {
        name: 'avengers',
        series: '1',
        date: 1767225600000,
    },
    {
        name: 'ironman',
        series: '1',
        date: 1769884800000,
    },
    {
        name: 'spiderman',
        series: '1',
        date: 1768473600000,
    },
    {
        name: 'skyrim',
        date: 1768473600000,
    },
    {
        name: 'morrowwind',
        date: 1768473600000,
    },
];

export const sortedItems = (data: PROJECTS_MOCK[]) =>
    [...data].sort((a, b) => a.date - b.date);

export const groupedBySeries = (data: PROJECTS_MOCK[]) =>
    data.reduce<Record<string, PROJECTS_MOCK[]>>((acc, item) => {
        const seriesKey = item.series ?? 'Unassigned';

        if (!acc[seriesKey]) {
            acc[seriesKey] = [];
        }

        acc[seriesKey].push(item);
        return acc;
    }, {});

export const groupedArray = (data: PROJECTS_MOCK[]) =>
    Object.entries(groupedBySeries(data)).map(([series, items]) => ({
        series,
        items,
    }));

export const sortAndGroup = (data: PROJECTS_MOCK[]) => {
    const sorted = sortedItems(data);

    const groupedBySeries = sorted.reduce(
        (acc, item) => {
            const seriesKey = item.series ?? 'Unassigned';

            if (!acc[seriesKey]) {
                acc[seriesKey] = [];
            }

            acc[seriesKey].push(item);
            return acc;
        },
        {} as Record<string, PROJECTS_MOCK[]>
    );

    return Object.entries(groupedBySeries).map(([series, items]) => ({
        series,
        items,
    }));
};

// [p1,p2, [s1p3, s1p5], p4, [s2p6, s2p7], p8]
