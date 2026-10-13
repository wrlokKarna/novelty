import { useState, useEffect, useCallback } from 'react';
import type {
    AnalysisIssue,
    AnalysisResult,
    AnalysisContext,
} from '../services/analysis/plotHoles';
import { runFullAnalysis } from '../services/analysis/plotHoles';
import { analyzePacing, type PacingInsight } from '../services/analysis/pacing';
import {
    IconAlertTriangle,
    IconAlertCircle,
    IconInfoCircle,
    IconRefresh,
    IconChevronDown,
    IconChevronRight,
} from '@tabler/icons-react';

interface Props {
    context: AnalysisContext;
    onNavigateChapter: (chapterId: string) => void;
    onRefresh?: () => void;
}

const SEVERITY_ICONS = {
    error: IconAlertCircle,
    warning: IconAlertTriangle,
    info: IconInfoCircle,
};

const SEVERITY_COLORS = {
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
};

export default function PlotHolePanel({ context, onNavigateChapter }: Props) {
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [insights, setInsights] = useState<PacingInsight[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedIssues, setExpandedIssues] = useState<Set<string>>(
        new Set()
    );
    const [activeFilter, setActiveFilter] = useState<
        'all' | 'error' | 'warning' | 'info'
    >('all');
    const [activeCategory, setActiveCategory] = useState<string>('all');

    const analyze = useCallback(async () => {
        setLoading(true);
        try {
            const r = await runFullAnalysis(context);
            setResult(r);
            const p = analyzePacing(
                context.chapters,
                context.acts,
                context.storyBeats
            );
            setInsights(p);
        } finally {
            setLoading(false);
        }
    }, [context]);

    useEffect(() => {
        analyze();
    }, [analyze]);

    const allPacingAsIssues: AnalysisIssue[] = insights.map((i) => ({
        id: crypto.randomUUID(),
        severity: i.severity,
        category: 'pacing',
        title: i.title,
        description: i.description,
        locations: [],
        suggestion: i.suggestion,
    }));

    const allIssues = [...(result?.issues || []), ...allPacingAsIssues];

    const filteredIssues = allIssues.filter((i) => {
        if (activeFilter !== 'all' && i.severity !== activeFilter) return false;
        if (activeCategory !== 'all' && i.category !== activeCategory)
            return false;
        return true;
    });

    const errorCount = allIssues.filter((i) => i.severity === 'error').length;
    const warningCount = allIssues.filter(
        (i) => i.severity === 'warning'
    ).length;
    const infoCount = allIssues.filter((i) => i.severity === 'info').length;

    function toggleIssue(id: string) {
        setExpandedIssues((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    return (
        <div className="plot-hole-panel">
            <div className="php-header">
                <h3>Story Analysis</h3>
                <button
                    className="icon-btn"
                    onClick={analyze}
                    disabled={loading}
                >
                    <IconRefresh
                        size={16}
                        className={loading ? 'spinning' : ''}
                    />
                </button>
            </div>

            {result && (
                <div className="php-summary">
                    <div
                        className={`summary-badge summary-error ${errorCount === 0 ? 'ok' : ''}`}
                    >
                        {errorCount} errors
                    </div>
                    <div
                        className={`summary-badge summary-warning ${warningCount === 0 ? 'ok' : ''}`}
                    >
                        {warningCount} warnings
                    </div>
                    <div className="summary-badge summary-info">
                        {infoCount} suggestions
                    </div>
                </div>
            )}

            <div className="php-filters">
                <select
                    value={activeFilter}
                    onChange={(e) => setActiveFilter(e.target.value as any)}
                >
                    <option value="all">All severities</option>
                    <option value="error">Errors only</option>
                    <option value="warning">Warnings only</option>
                    <option value="info">Info only</option>
                </select>
                <select
                    value={activeCategory}
                    onChange={(e) => setActiveCategory(e.target.value)}
                >
                    <option value="all">All categories</option>
                    <option value="plot-hole">Plot Holes</option>
                    <option value="consistency">Consistency</option>
                    <option value="timeline">Timeline</option>
                    <option value="character">Character</option>
                    <option value="thread">Plot Threads</option>
                    <option value="pacing">Pacing</option>
                </select>
            </div>

            <div className="php-issues">
                {loading && <div className="php-loading">Analyzing...</div>}
                {!loading && filteredIssues.length === 0 && (
                    <div className="php-empty">
                        {allIssues.length === 0
                            ? 'No issues found. Your story structure looks solid!'
                            : 'No matching issues.'}
                    </div>
                )}
                {filteredIssues.map((issue) => {
                    const Icon = SEVERITY_ICONS[issue.severity];
                    const isExpanded = expandedIssues.has(issue.id);
                    return (
                        <div
                            key={issue.id}
                            className={`php-issue php-${issue.severity}`}
                        >
                            <div
                                className="php-issue-header"
                                onClick={() => toggleIssue(issue.id)}
                            >
                                <Icon
                                    size={16}
                                    color={SEVERITY_COLORS[issue.severity]}
                                />
                                <span className="php-issue-title">
                                    {issue.title}
                                </span>
                                <span className="php-issue-category">
                                    {issue.category}
                                </span>
                                {isExpanded ? (
                                    <IconChevronDown size={16} />
                                ) : (
                                    <IconChevronRight size={16} />
                                )}
                            </div>
                            {isExpanded && (
                                <div className="php-issue-body">
                                    <p>{issue.description}</p>
                                    <div className="php-issue-suggestion">
                                        <strong>Suggestion:</strong>{' '}
                                        {issue.suggestion}
                                    </div>
                                    {issue.locations.length > 0 && (
                                        <div className="php-issue-locations">
                                            {issue.locations.map(
                                                (loc, i) =>
                                                    loc.chapterId && (
                                                        <button
                                                            key={i}
                                                            className="php-location-btn"
                                                            onClick={() =>
                                                                onNavigateChapter(
                                                                    loc.chapterId!
                                                                )
                                                            }
                                                        >
                                                            Go to chapter
                                                        </button>
                                                    )
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
