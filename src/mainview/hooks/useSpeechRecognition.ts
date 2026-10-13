import { useState, useRef, useCallback, useEffect } from 'react';

interface SpeechRecognitionHook {
    isListening: boolean;
    isSupported: boolean;
    error: string | null;
    interimText: string;
    start: () => void;
    stop: () => void;
    toggle: () => void;
}

export function useSpeechRecognition(
    onResult: (text: string) => void,
    onInterim?: (text: string) => void
): SpeechRecognitionHook {
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [interimText, setInterimText] = useState('');
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const onResultRef = useRef(onResult);
    const onInterimRef = useRef(onInterim);
    onResultRef.current = onResult;
    onInterimRef.current = onInterim;

    const isSupported =
        typeof window !== 'undefined' &&
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

    useEffect(() => {
        if (!isSupported) return;
        const SpeechRecognitionAPI =
            window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) return;
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    onResultRef.current(result[0].transcript);
                } else {
                    interim += result[0].transcript;
                }
            }
            setInterimText(interim);
            onInterimRef.current?.(interim);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            setError(event.error);
            setIsListening(false);
            setInterimText('');
        };

        recognition.onend = () => {
            setIsListening(false);
            setInterimText('');
        };

        recognitionRef.current = recognition;

        return () => {
            recognition.abort();
            recognitionRef.current = null;
        };
    }, [isSupported]);

    const start = useCallback(() => {
        if (!recognitionRef.current) return;
        setError(null);
        try {
            recognitionRef.current.start();
            setIsListening(true);
        } catch {
            // Already started
        }
    }, []);

    const stop = useCallback(() => {
        if (!recognitionRef.current) return;
        recognitionRef.current.stop();
        setIsListening(false);
        setInterimText('');
    }, []);

    const toggle = useCallback(() => {
        if (isListening) stop();
        else start();
    }, [isListening, start, stop]);

    return {
        isListening,
        isSupported,
        error,
        interimText,
        start,
        stop,
        toggle,
    };
}
