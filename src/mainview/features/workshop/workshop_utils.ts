import type { Project } from '../../../shared/types';

export function getRandomTimestamp(start: Date, end: Date) {
    const startTime = start.getTime();
    const endTime = end.getTime();
    return Math.floor(startTime + Math.random() * (endTime - startTime));
}

export const sortedItems = (data: Project[]) =>
    [...data].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

export const sortAndGroup = (data: Project[]) => {
    const sorted = sortedItems(data);

    const groupedBySeries = sorted.reduce(
        (acc, item) => {
            const seriesKey = item.seriesId ?? 'Unassigned';

            if (!acc[seriesKey]) {
                acc[seriesKey] = [];
            }

            acc[seriesKey].push(item);
            return acc;
        },
        {} as Record<string, Project[]>
    );

    return Object.entries(groupedBySeries).map(([series, items]) => ({
        series,
        items,
    }));
};

export function groupAndSort(data: Project[]) {
    const seriesMap = new Map<string, Project[]>();
    const standaloneItems: Project[] = [];

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

    seriesMap.forEach((group) => {
        group.sort(
            (a, b) =>
                new Date(b.updatedAt).getTime() -
                new Date(a.updatedAt).getTime()
        );
    });

    const combined = [...standaloneItems, ...seriesMap.values()];

    combined.sort((a, b) => {
        const maxDate = (projectOrSeries: typeof a) => {
            if (Array.isArray(projectOrSeries)) {
                return Math.max(
                    ...projectOrSeries.map((p) =>
                        new Date(p.updatedAt).getTime()
                    )
                );
            }
            return new Date(projectOrSeries.updatedAt).getTime();
        };
        return maxDate(b) - maxDate(a);
    });

    return combined;
}
