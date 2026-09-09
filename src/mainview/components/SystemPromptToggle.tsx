import { useEffect, useState } from 'react';
import { getRPC } from '../contexts/RPCContext';
import type { Project } from '../types/index';

interface SystemPromptToggleProps {
    project: Project | null;
    onPromptChange: (prompt: string) => void;
}

export default function SystemPromptToggle({
    project,
    onPromptChange,
}: SystemPromptToggleProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [prompt, setPrompt] = useState(project?.systemPrompt || '');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setPrompt(project?.systemPrompt || '');
    }, [project?.id, project?.systemPrompt]);

    if (!project) return null;

    const handleSave = async () => {
        setSaving(true);
        try {
            const rpc = getRPC();
            await rpc.request['db:save-project-system-prompt']({
                projectId: project.id,
                prompt,
            });
            onPromptChange(prompt);
        } catch (e) {
            console.error('Failed to save system prompt:', e);
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setPrompt('');
    };

    return (
        <div className="system-prompt-toggle">
            <button
                className={`system-prompt-btn ${isOpen ? 'active' : ''} ${project.systemPrompt ? 'has-prompt' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                System Prompt
                {project.systemPrompt ? ' *' : ''}
            </button>

            {isOpen && (
                <div className="system-prompt-editor">
                    <textarea
                        className="system-prompt-textarea"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Custom system prompt... (leave empty to use auto-generated default)"
                        rows={4}
                    />
                    <div className="system-prompt-actions">
                        <span className="system-prompt-hint">
                            Auto-generated default will be prepended with
                            project info
                        </span>
                        <div className="system-prompt-btns">
                            <button onClick={handleReset} disabled={saving}>
                                Reset
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="primary"
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
