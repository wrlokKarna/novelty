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
    const [dropdownCoords, setDropdownCoords] = useState<{
        top: number;
        left: number;
    }>({
        top: 32,
        left: 12,
    });

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const backdropRef = useRef<HTMLDivElement | null>(null);
    const atMarkerRef = useRef<HTMLSpanElement | null>(null);

    const filteredOptions = MENTION_OPTIONS.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase())
    );

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Calculate the exact (top, left) position directly below the '@' character
    const updateDropdownPosition = () => {
        if (atMarkerRef.current && backdropRef.current) {
            const top =
                atMarkerRef.current.offsetTop -
                backdropRef.current.scrollTop +
                atMarkerRef.current.offsetHeight +
                4;
            const left =
                atMarkerRef.current.offsetLeft - backdropRef.current.scrollLeft;

            setDropdownCoords({ top, left });
        }
    };

    useEffect(() => {
        if (showOptions) {
            updateDropdownPosition();
        }
    }, [text, showOptions, mentionIndex]);

    const handleScroll = () => {
        if (textareaRef.current && backdropRef.current) {
            backdropRef.current.scrollTop = textareaRef.current.scrollTop;
            backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
            if (showOptions) {
                updateDropdownPosition();
            }
        }
    };

    const checkTrigger = (val: string, cursorPos: number) => {
        const textBeforeCursor = val.slice(0, cursorPos);
        const lastAtPos = textBeforeCursor.lastIndexOf('@');

        if (lastAtPos !== -1) {
            const currentQuery = textBeforeCursor.slice(lastAtPos + 1);

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

        // Removes '@' and inserts the selected name
        const updatedText = `${beforeMention}${option.name} ${afterMention}`;
        setText(updatedText);
        setShowOptions(false);
        setQuery('');
        setMentionIndex(null);

        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
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
    const highlightSegment = (segment: string, keyPrefix: string) => {
        if (!segment) return null;

        const escapedNames = MENTION_OPTIONS.map((opt) =>
            opt.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        ).sort((a, b) => b.length - a.length);

        const regex = new RegExp(`(${escapedNames.join('|')})`, 'g');
        const parts = segment.split(regex);

        return parts.map((part, index) => {
            const isMention = MENTION_OPTIONS.some((opt) => opt.name === part);
            if (isMention) {
                return (
                    <span
                        key={`${keyPrefix}-${index}`}
                        style={{
                            color: '#ff8c00',
                            textDecoration: 'underline',
                            textDecorationColor: '#ff8c00',
                            textUnderlineOffset: '3px',
                            fontWeight: 500,
                        }}
                    >
                        {part}
                    </span>
                );
            }
            return <span key={`${keyPrefix}-${index}`}>{part}</span>;
        });
    };

    // Splits text at the active '@' symbol so we can attach a ref to measure its position
    const renderBackdropContent = () => {
        if (!text) return null;

        if (
            showOptions &&
            mentionIndex !== null &&
            text[mentionIndex] === '@'
        ) {
            const beforeAt = text.slice(0, mentionIndex);
            const atSymbol = text[mentionIndex];
            const afterAt = text.slice(mentionIndex + 1);

            return (
                <>
                    {highlightSegment(beforeAt, 'before')}
                    <span ref={atMarkerRef}>{atSymbol}</span>
                    {highlightSegment(afterAt, 'after')}
                </>
            );
        }

        return highlightSegment(text, 'full');
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
                width: '480px',
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

            {/* Editor Wrapper */}
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
                {/* 1. Backdrop Layer (Renders Orange Mentions + Tracks '@' Coordinates) */}
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
                    {renderBackdropContent()}
                </div>

                {/* 2. Interactive Textarea Layer */}
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
                        caretColor: '#ffffff',
                        border: 'none',
                        outline: 'none',
                        resize: 'none',
                        overflowY: 'auto',
                        zIndex: 2,
                    }}
                />

                {/* 3. Dropdown Anchored Directly Below the '@' Symbol */}
                {showOptions && filteredOptions.length > 0 && (
                    <ul
                        style={{
                            position: 'absolute',
                            top: `${dropdownCoords.top}px`,
                            left: `${dropdownCoords.left}px`,
                            margin: 0,
                            width: '240px',
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
                                    e.preventDefault();
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
        </div>
    );
}

export default Mentions;
