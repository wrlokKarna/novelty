import { type CSSProperties } from 'react';

interface CustomCSSProperties extends CSSProperties {
    '--dx-min'?: string;
    '--dy-min'?: string;
    '--dx-max'?: string;
    '--dy-max'?: string;
}

interface DottedSpinnerProps {
    size?: number;
    dotSize?: number;
    colorClass?: string;
    color?: string;
    glowIntensity: 'none' | 'sm' | 'md' | 'lg';
    spinSpeed?: number;
    radialSpeed?: number;
    minRadiusFactor?: number;
    maxRadiusFactor?: number;
    paused?: boolean;
    className?: string;
}

export default function DottedSpinner({
    size = 48,
    dotSize = 8,
    color = '#06b6d4',
    glowIntensity = 'md',
    spinSpeed = 1.8,
    radialSpeed = 1.4,
    minRadiusFactor = 0.2,
    maxRadiusFactor = 0.9,
    paused = false,
    className = '',
}: DottedSpinnerProps) {
    const dotCount = 5;
    const outerRadius = size / 2 - dotSize / 2;

    const getGlowStyle = () => {
        if (glowIntensity === 'none') return {};
        const intensityMap = {
            sm: '0 0 6px',
            md: '0 0 12px',
            lg: '0 0 22px 2px',
        };
        const spread = intensityMap[glowIntensity] || intensityMap.md;
        return {
            boxShadow: `${spread}${color}`,
        };
    };

    const minR = outerRadius * minRadiusFactor;
    const maxR = outerRadius * maxRadiusFactor;

    return (
        <div
            className={className}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
                position: 'relative',
            }}
        >
            <style>{`
                @keyframes radialConvergeExpand {
                    0%, 100% {
                        transform: translate(var(--dx-min), var(--dy-min));
                        opacity: 0.7;
                    }
                    50% {
                        transform: translate(var(--dx-max), var(--dy-max));
                        opacity: 1;
                    }
                }
            `}</style>

            {/* Rotating container */}
            <span
                role="status"
                aria-label="Loading"
                style={{
                    display: 'block',
                    position: 'relative',
                    width: `${size}px`,
                    height: `${size}px`,
                    animationName: 'spin',
                    animationDuration: `${spinSpeed}s`,
                    animationTimingFunction: 'linear',
                    animationIterationCount: 'infinite',
                    animationPlayState: paused ? 'paused' : 'running',
                }}
            >
                {' '}
                {Array.from({ length: dotCount }).map((_, index) => {
                    const angleDeg = index * (360 / dotCount);
                    const angleRad = (angleDeg * Math.PI) / 180;
                    const sinA = Math.sin(angleRad);
                    const cosA = -Math.cos(angleRad);
                    const dxMin = `${(minR * sinA).toFixed(2)}px`;
                    const dyMin = `${(minR * cosA).toFixed(2)}px`;
                    const dxMax = `${(maxR * sinA).toFixed(2)}px`;
                    const dyMax = `${(maxR * cosA).toFixed(2)}px`;
                    return (
                        <span
                            key={index}
                            style={
                                {
                                    position: 'absolute',
                                    borderRadius: '50%',
                                    top: `calc(50% - ${dotSize / 2}px)`,
                                    left: `calc(50% - ${dotSize / 2}px)`,
                                    width: `${dotSize}px`,
                                    height: `${dotSize}px`,
                                    backgroundColor: color,
                                    transition: 'background-color 0.3s ease',
                                    ...getGlowStyle(),
                                    '--dx-min': dxMin,
                                    '--dy-min': dyMin,
                                    '--dx-max': dxMax,
                                    '--dy-max': dyMax,
                                    animation: `radialConvergeExpand ${radialSpeed}s ease-in-out infinite`,
                                    animationPlayState: paused
                                        ? 'paused'
                                        : 'running',
                                } as CustomCSSProperties
                            }
                        />
                    );
                })}
            </span>
        </div>
    );
}
