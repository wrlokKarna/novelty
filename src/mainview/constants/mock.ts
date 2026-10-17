import type { Project } from './../types/index';

function getRandomTimestamp(start, end) {
    const startTime = start.getTime();
    const endTime = end.getTime();
    return Math.floor(startTime + Math.random() * (endTime - startTime));
}
export type PROJECTS_MOCK_TYPE = {
    name: string;
    series?: string;
    date: number;
};
// {1: "",2:""}

export const PROJECTS_MOCK: PROJECTS_MOCK_TYPE[] = [
    {
        name: 'spiderman',
        series: '1',
        date: getRandomTimestamp(new Date(2000, 0, 1), new Date()),
    },
    {
        name: 'bahubaali',
        date: getRandomTimestamp(new Date(2000, 0, 1), new Date()),
    },
    {
        name: 'avengers',
        series: 'dark universe',
        date: getRandomTimestamp(new Date(2000, 0, 1), new Date()),
    },
    {
        name: 'ironman',
        series: 'dark universe',
        date: getRandomTimestamp(new Date(2000, 0, 1), new Date()),
    },
    {
        name: 'skyrim',
        date: getRandomTimestamp(new Date(2000, 0, 1), new Date()),
    },
    {
        name: 'morrowwind',
        date: getRandomTimestamp(new Date(2000, 0, 1), new Date()),
    },
];

export const sortedItems = (data: PROJECTS_MOCK_TYPE[]) =>
    [...data].sort((a, b) => b.date - a.date);

type groupedObjType = Record<string, PROJECTS_MOCK_TYPE[]>;

const groupedObj: groupedObjType = {};
PROJECTS_MOCK.map((p: PROJECTS_MOCK_TYPE) => {
    const newKey: string = p.series ?? 'items';
    const newObj: PROJECTS_MOCK_TYPE = { name: p.name, date: p.date };

    if (!groupedObj[newKey]) {
        groupedObj[newKey] = [];
    }

    groupedObj[newKey].push(newObj);
});

//console.log(
//    sortedItems(PROJECTS_MOCK).map((work: PROJECTS_MOCK_TYPE) => {
//        console.log(work);
//        return work;
//    })
//);

//console.log([...groupedObj['1'], 1, 2]);
//console.log('x', x);
export const groupedBySeries = (data: PROJECTS_MOCK_TYPE[]) =>
    data.reduce<Record<string, PROJECTS_MOCK_TYPE[]>>((acc, item) => {
        //console.log(acc);
        const seriesKey = item.series ?? 'Unassigned';

        if (!acc[seriesKey]) {
            acc[seriesKey] = [];
        }

        acc[seriesKey].push(item);
        return acc;
    }, {});

//console.log('mine', groupedObj);
//console.log('acc', groupedBySeries(PROJECTS_MOCK));

export const groupedArray = (data: PROJECTS_MOCK_TYPE[]) =>
    Object.entries(groupedBySeries(data)).map(([series, items]) => ({
        series,
        items,
    }));

export const sortAndGroup = (data: PROJECTS_MOCK_TYPE[]) => {
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
        {} as Record<string, PROJECTS_MOCK_TYPE[]>
    );

    return Object.entries(groupedBySeries).map(([series, items]) => ({
        series,
        items,
    }));
};

// [p1,p2, [s1p3, s1p5], p4, [s2p6, s2p7], p8]
//groupedBySeries(PROJECTS_MOCK);

export const customGroupedArray = (data: PROJECTS_MOCK_TYPE[]) => {
    // 1. Group the items by series using your existing function
    const grouped = groupedBySeries(data);

    // 2. Map the groups into the desired flat/nested structure
    return Object.entries(grouped).map(([series, items]) => {
        // Sort the items inside the series by date
        const sortedSeriesItems = [...items].sort((a, b) => a.date - b.date);

        // If 'Unassigned' or single-item series should be standalone or grouped:
        // Adjust this logic based on whether ALL series should be arrays,
        // or if 'Unassigned' items should be loose.
        return sortedSeriesItems;

        // OR if you want series with a single item to be standalone and multi-items to be an array:
        // return sortedSeriesItems.length === 1 ? sortedSeriesItems[0] : sortedSeriesItems;
    });
};

export const mixedGroupedArray = (data: PROJECTS_MOCK[]) => {
    const sortedData = sortedItems(data);
    console.log(sortedData);
    const grouped = groupedBySeries(sortedData);

    return Object.entries(grouped).flatMap(([series, items]) => {
        const sortedItems = [...items].sort((a, b) => a.date - b.date);

        if (series === 'Unassigned') {
            return sortedItems;
        }

        return [sortedItems];
    });
};

//console.log('mix', mixedGroupedArray(PROJECTS_MOCK));

type ProjectItem = {
    name: string;
    date: number;
    series?: string;
};

type GroupedResult = (
    Omit<ProjectItem, 'series'> | Omit<ProjectItem, 'series'>[]
)[];

// 1. Sort a copy of the projects array by date timestamp (ascending)
const sortedProjects = [...PROJECTS_MOCK].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
});

const result: GroupedResult = [];
let currentSeries: string | null = null;
let currentGroup: Omit<ProjectItem, 'series'>[] = [];

sortedProjects.forEach((p) => {
    const newObj = { name: p.name, date: p.date };

    if (!p.series) {
        if (currentGroup.length > 0) {
            result.push(currentGroup);
            currentGroup = [];
            currentSeries = null;
        }
        result.push(newObj);
    } else {
        if (p.series === currentSeries) {
            currentGroup.push(newObj);
        } else {
            if (currentGroup.length > 0) {
                result.push(currentGroup);
            }
            currentSeries = p.series;
            currentGroup = [newObj];
        }
    }
});

if (currentGroup.length > 0) {
    result.push(currentGroup);
}
// console.log('result', result);

export function groupAndSort(data: Project[]) {
    const seriesMap = new Map<string, Omit<Project, 'series'>[]>();
    const standaloneItems: Omit<Project, 'series'>[] = [];

    data.forEach((p) => {
        const item = { ...p };
        if (p.seriesId) {
            if (!seriesMap.has(p.seriesId)) {
                seriesMap.set(p.seriesId, []);
            }
            seriesMap.get(p.seriesId)!.push(item);
        } else {
            standaloneItems.push(item);
        }
    });

    const combined: (Omit<Project, 'series'> | Omit<Project, 'series'>[])[] =
        [];

    standaloneItems.forEach((item) => combined.push(item));

    seriesMap.forEach((group) => {
        group.sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt));
        combined.push(group);
    });

    combined.sort((a, b) => {
        const getMaxDate = (itemOrGroup: typeof a) => {
            if (Array.isArray(itemOrGroup)) {
                return Math.max(...itemOrGroup.map((i) => Number(i.updatedAt)));
            }
            return itemOrGroup.updatedAt;
        };

        return getMaxDate(Number(b)) - getMaxDate(Number(a));
    });

    console.log('com', combined);

    return combined;
}
