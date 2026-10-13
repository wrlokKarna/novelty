import type { EmbeddingSettings } from '../../../mainview/types';

export interface EmbeddingProvider {
    name: string;
    dimension: number;
    embed(texts: string[]): Promise<number[][]>;
}

class LocalEmbeddingProvider implements EmbeddingProvider {
    name = 'local';
    dimension: number;
    private endpoint: string;
    private model: string;
    private isOllama: boolean;

    constructor(settings: EmbeddingSettings) {
        this.dimension = settings.dimension;
        this.endpoint = (
            settings.endpoint || 'http://localhost:1234/v1'
        ).replace(/\/$/, '');
        this.model = settings.model;
        this.isOllama = this.endpoint.includes(':11434');
    }

    async embed(texts: string[]): Promise<number[][]> {
        return this.isOllama
            ? this.embedOllama(texts)
            : this.embedOpenAI(texts);
    }

    private async embedOpenAI(texts: string[]): Promise<number[][]> {
        const response = await fetch(`${this.endpoint}/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.model,
                input: texts,
            }),
        });

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Embedding error ${response.status}: ${body}`);
        }

        const data = await response.json();
        return data.data
            .sort(
                (a: { index: number }, b: { index: number }) =>
                    a.index - b.index
            )
            .map((item: { embedding: number[] }) => item.embedding);
    }

    private async embedOllama(texts: string[]): Promise<number[][]> {
        const results: number[][] = [];
        for (const text of texts) {
            const response = await fetch(`${this.endpoint}/api/embeddings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    prompt: text,
                }),
            });

            if (!response.ok) {
                const body = await response.text();
                throw new Error(
                    `Ollama embedding error ${response.status}: ${body}`
                );
            }

            const data = await response.json();
            results.push(data.embedding);
        }
        return results;
    }
}

export function createEmbeddingProvider(
    settings: EmbeddingSettings
): EmbeddingProvider {
    return new LocalEmbeddingProvider(settings);
}
