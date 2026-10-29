export type SeriesArchitecture =
    'standalone' | 'duology' | 'trilogy' | 'ongoing';

export type Series = {
    id: string;
    name: string;
    description: string | null;
    seriesArch: SeriesArchitecture | null;
    coverImageId: string | null;
    projectCount?: number;
    createdAt: Date;
    updatedAt: Date;
};

export type NewSeries = Omit<
    Series,
    'createdAt' | 'updatedAt' | 'projectCount'
>;
