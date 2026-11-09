import React, { useState, useRef, useEffect } from 'react';

type Props = {};

interface MentionOption {
    id: string;
    name: string;
}

const MENTION_OPTIONS: MentionOption[] = [
    { id: '1', name: 'Aayla Secura' },
    { id: '2', name: 'Adi Gallia' },
    { id: '3', name: 'Admiral Dodd Rancit' },
    { id: '4', name: 'Admiral Firmus Piett' },
    { id: '5', name: 'Admiral Gial Ackbar' },
    { id: '6', name: 'Admiral Ozzel' },
    { id: '7', name: 'Admiral Raddus' },
    { id: '8', name: 'Admiral Terrinald Screed' },
    { id: '9', name: 'Admiral Trench' },
    { id: '10', name: 'Admiral U.O. Statura' },
];

function Mentions({}: Props) {
    const [text, setText] = useState<string>('');
    const [showOptions, setShowOptions] = useState<boolean>(false);
    const [query, setQuery] = useState<string>('');
    const [mentionIndex, setMentionIndex] = useState<number | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number>(0);

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const backdropRef = useRef<HTMLDivElement | null>(null);

    // Filter options based on text typed after '@'
    const filteredOptions = MENTION_OPTIONS.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase())
    );

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Sync scroll between textarea and styled backdrop
    const handleScroll = () => {
        if (textareaRef.current && backdropRef.current) {
            backdropRef.current.scrollTop = textareaRef.current.scrollTop;
            backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };

    const checkTrigger = (val: string, cursorPos: number) => {
        const textBeforeCursor = val.slice(0, cursorPos);
        const lastAtPos = textBeforeCursor.lastIndexOf('@');

        if (lastAtPos !== -1) {
            const currentQuery = textBeforeCursor.slice(lastAtPos + 1);

            // Show options as long as there is no line break after '@'
            if (!currentQuery.includes('\n')) {
                setShowOptions(true);
                setQuery(currentQuery);
                setMentionIndex(lastAtPos);
                return;
            }
        }

        setShowOptions(false);
        setQuery('');
        setMentionIndex(null);
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        const cursorPos = e.target.selectionStart ?? val.length;
        setText(val);
        checkTrigger(val, cursorPos);
    };

    const selectOption = (option: MentionOption) => {
        if (mentionIndex === null || !textareaRef.current) return;

        const cursorPos = textareaRef.current.selectionStart ?? text.length;
        const beforeMention = text.slice(0, mentionIndex);
        const afterMention = text.slice(cursorPos);

        // Insert ONLY the name (removes the '@' symbol)
        const updatedText = `${beforeMention}${option.name} ${afterMention}`;
        setText(updatedText);
        setShowOptions(false);
        setQuery('');
        setMentionIndex(null);

        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                // +1 is for the trailing space after the name
                const newPos = beforeMention.length + option.name.length + 1;
                textareaRef.current.setSelectionRange(newPos, newPos);
            }
        }, 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!showOptions || filteredOptions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % filteredOptions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(
                (prev) =>
                    (prev - 1 + filteredOptions.length) % filteredOptions.length
            );
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            selectOption(filteredOptions[selectedIndex]);
        } else if (e.key === 'Escape') {
            setShowOptions(false);
        }
    };

    // Highlights matched names in orange with an underline
    const renderHighlightedText = () => {
        if (!text) return null;

        // Sort names by length descending so longer names match completely first
        const escapedNames = MENTION_OPTIONS.map((opt) =>
            opt.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        ).sort((a, b) => b.length - a.length);

        const regex = new RegExp(`(${escapedNames.join('|')})`, 'g');
        const parts = text.split(regex);

        return parts.map((part, index) => {
            const isMention = MENTION_OPTIONS.some((opt) => opt.name === part);
            if (isMention) {
                return (
                    <span
                        key={index}
                        style={{
                            color: '#ff8c00', // Orange text
                            textDecoration: 'underline', // Underscore whole name
                            textDecorationColor: '#ff8c00',
                            textUnderlineOffset: '3px',
                            fontWeight: 500,
                        }}
                    >
                        {part}
                    </span>
                );
            }
            return <span key={index}>{part}</span>;
        });
    };

    const sharedTextStyles: React.CSSProperties = {
        width: '100%',
        height: '110px',
        padding: '10px 12px',
        fontSize: '15px',
        fontFamily: 'monospace',
        lineHeight: '1.5',
        boxSizing: 'border-box',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        margin: 0,
    };

    return (
        <div
            style={{
                position: 'relative',
                width: '420px',
                margin: '40px auto',
                fontFamily: 'sans-serif',
            }}
        >
            <div
                style={{
                    marginBottom: '8px',
                    fontWeight: 700,
                    fontSize: '18px',
                    color: '#ffffff',
                }}
            >
                Mentions
            </div>

            {/* Editor Wrapper with Highlight Backdrop + Transparent Textarea */}
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '110px',
                    backgroundColor: '#141414',
                    border: '1px solid #333',
                    borderRadius: '6px',
                }}
            >
                {/* 1. Backdrop Layer (Renders Orange + Underlined Mentions) */}
                <div
                    ref={backdropRef}
                    style={{
                        ...sharedTextStyles,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        color: '#f5f5f5',
                        pointerEvents: 'none',
                        overflowY: 'auto',
                        zIndex: 1,
                    }}
                >
                    {renderHighlightedText()}
                </div>

                {/* 2. Interactive Textarea Layer (Transparent text, visible caret) */}
                <textarea
                    ref={textareaRef}
                    name="mentions"
                    id="mentions-input"
                    value={text}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    onScroll={handleScroll}
                    onClick={(e) =>
                        checkTrigger(
                            e.currentTarget.value,
                            e.currentTarget.selectionStart ?? 0
                        )
                    }
                    placeholder="Type @ to see options..."
                    style={{
                        ...sharedTextStyles,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        backgroundColor: 'transparent',
                        color: 'transparent',
                        caretColor: '#ffffff', // Keeps the blinking cursor visible
                        border: 'none',
                        outline: 'none',
                        resize: 'none',
                        overflowY: 'auto',
                        zIndex: 2,
                    }}
                />
            </div>

            {/* @ Mention Options Dropdown */}
            {showOptions && filteredOptions.length > 0 && (
                <ul
                    style={{
                        position: 'absolute',
                        top: '100%', // Displays directly below the input so it never gets cut off
                        left: 0,
                        marginTop: '6px',
                        width: '250px',
                        maxHeight: '240px',
                        overflowY: 'auto',
                        backgroundColor: '#222222',
                        border: '1px solid #383838',
                        borderRadius: '8px',
                        padding: '4px',
                        listStyle: 'none',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
                        zIndex: 9999,
                    }}
                >
                    {filteredOptions.map((item, index) => (
                        <li
                            key={item.id}
                            onMouseDown={(e) => {
                                e.preventDefault(); // Prevents losing focus before click finishes
                                selectOption(item);
                            }}
                            onMouseEnter={() => setSelectedIndex(index)}
                            style={{
                                padding: '7px 10px',
                                fontSize: '13px',
                                color:
                                    index === selectedIndex
                                        ? '#ffffff'
                                        : '#d4d4d4',
                                backgroundColor:
                                    index === selectedIndex
                                        ? '#3a3a3a'
                                        : 'transparent',
                                borderRadius: '5px',
                                cursor: 'pointer',
                            }}
                        >
                            {item.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default Mentions;
