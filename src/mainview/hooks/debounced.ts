import { useState, useEffect } from 'react';

export default function useDebounce(value: any, delay: number) {
    const [debouncedVaule, setDebouncedVaule] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedVaule(value);
        }, delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedVaule;
}
