import type { CompendiumCategory } from '../project/compendium';
import type { FieldDefinition, TemplateLayout } from '../project/templates';

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

export type SeriesTemplate = {
    id: string;
    seriesId: string;
    baseType: CompendiumCategory;
    customFields: FieldDefinition[];
    // Default layout used when a project has not saved its own. The effective
    // layout of a resolved project is always project-authoritative.
    layout: TemplateLayout | null;
    createdAt: Date;
    updatedAt: Date;
};

export type SeriesTemplateInput = {
    seriesId: string;
    baseType: CompendiumCategory;
    customFields: FieldDefinition[];
    layout?: TemplateLayout | null;
};
