import { describe, expect, test } from 'bun:test';
import { appendSystemPromptSection, buildTitlePrompt } from './chatPromptBuilder';
import { buildContext } from './contextBuilder';

const project = {
  id: 'project-1',
  name: 'Tight Budget Test',
  description: 'A grounded fantasy about difficult choices and sharp emotional stakes.',
  systemPrompt: null,
  contentRating: 'Teen',
  primaryGenre: 'Fantasy',
  projectScope: 'standard',
  pov: 'third-person',
  pacing: 'balanced',
  seriesArch: null,
  genres: ['Fantasy'],
  themes: ['betrayal'],
  tags: [],
  coverImageId: null,
  coverImagesArray: [],
  projectStructure: 'series',
  targetAge: null,
  projectStatus: 'planning',
  tonalType: null,
  workType: 'original',
  primaryTheme: null,
} as unknown as import('./../types').Project;

describe('prompt regression coverage', () => {
  test('appends task instructions without dropping the base prompt', () => {
    const result = appendSystemPromptSection(
      'You are a writing assistant for "Project X".\nCustom instructions:\n- Keep continuity.',
      'Write the next chapter.'
    );

    expect(result).toContain('You are a writing assistant for "Project X".');
    expect(result).toContain('Custom instructions:');
    expect(result).toContain('--- Task Instructions ---');
    expect(result).toContain('Write the next chapter.');
  });

  test('buildTitlePrompt is title-only and not a general assistant prompt', () => {
    const prompt = buildTitlePrompt();

    expect(prompt).toContain('Generate a very short, descriptive title');
    expect(prompt).toContain('Respond with only the title text');
    expect(prompt).not.toContain('JSON');
    expect(prompt).not.toContain('You are a writing assistant');
  });

  test('budget trimming keeps project and custom instructions intact', () => {
    const result = buildContext({
      project,
      mentions: [],
      fileContents: Array.from({ length: 18 }, () => {
        return 'Scene details: ' + 'very long story text '.repeat(150);
      }),
      customPrompt:
        'Custom instructions:\n- Keep the tone lyrical.\n- Maintain continuity across scenes.',
      chapterContextMode: 'brief',
      maxContextTokens: 220,
      chapters: [],
      characters: [],
      locations: [],
      organizations: [],
      items: [],
      loreEntries: [],
      scenes: [],
      sequences: [],
      resolvedTemplates: {},
    });

    expect(result.estimatedTokens).toBeLessThanOrEqual(220);
    expect(result.systemPrompt).toContain(
      'You are a writing assistant for "Tight Budget Test".'
    );
    expect(result.systemPrompt).toContain('Custom instructions:');
    expect(result.systemPrompt).toContain('Keep the tone lyrical.');
    expect(result.systemPrompt).toContain(
      'Maintain continuity across scenes.'
    );
  });
});
