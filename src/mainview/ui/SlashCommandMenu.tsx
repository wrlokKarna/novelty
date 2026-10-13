import {
    EditorCommand,
    EditorCommandList,
    EditorCommandItem,
    EditorCommandEmpty,
    type SuggestionItem,
} from 'novel';

export function SlashCommandMenu({ items }: { items: SuggestionItem[] }) {
    return (
        <EditorCommand className="slash-command-menu">
            <EditorCommandEmpty>No results</EditorCommandEmpty>
            <EditorCommandList>
                {items.map((item) => (
                    <EditorCommandItem
                        key={item.title}
                        value={item.title}
                        onCommand={(val) => item.command?.(val)}
                        className="slash-command-item"
                    >
                        <span className="slash-command-icon">{item.icon}</span>
                        <div className="slash-command-info">
                            <p className="slash-command-title">{item.title}</p>
                            <p className="slash-command-desc">
                                {item.description}
                            </p>
                        </div>
                    </EditorCommandItem>
                ))}
            </EditorCommandList>
        </EditorCommand>
    );
}
