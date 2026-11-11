interface DottedSpinnerProps {
    size?: number;
    dotSize?: number;
    colorClass?: string;
    color?: string;
    glowIntensity: 'none' | 'sm' | 'md' | 'lg';
    speed?: number;
    paused: boolean;
    className?: string;
}

export default function DottedSpinner({
    size = 32,
    dotSize = 6,
    //colorClass = 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]',
    color = '#06b6d4',
    glowIntensity = 'md',
    speed = 1.8,
    paused = false,
    className = '',
}: DottedSpinnerProps) {
    const dotCount = 5;
    const radius = size / 2 - dotSize / 2;

    const getGlowStyle = () => {
        if (glowIntensity === 'none') return {};
        const intensityMap = {
            sm: `0 0 6px ${color}`,
            md: `0 0 12px ${color}`,
            lg: `0 0 22px 2px ${color}`,
        };
        return {
            boxShadow: intensityMap[glowIntensity] || intensityMap.md,
        };
    };

    return (
        <div
            className={className}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
            }}
        >
            <style>{`
          @keyframes dottedSpinnerRotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes dottedSpinnerPulse {
            0%, 80%, 100% {
              transform: scale(0.5);
              opacity: 0.25;
            }
            40% {
              transform: scale(1.35);
              opacity: 1;
            }
          }
        `}</style>

            <span
                role="status"
                aria-label="Loading"
                style={{
                    position: 'relative',
                    display: 'block',
                    width: `${size}px`,
                    height: `${size}px`,
                    animationName: 'dottedSpinnerRotate',
                    animationDuration: `${speed}s`,
                    animationTimingFunction: 'linear',
                    animationIterationCount: 'infinite',
                    animationPlayState: paused ? 'paused' : 'running',
                }}
            >
                {Array.from({ length: dotCount }).map((_, index) => {
                    const angleDeg = index * (360 / dotCount);
                    const angleRad = (angleDeg * Math.PI) / 180;

                    const x =
                        size / 2 + radius * Math.sin(angleRad) - dotSize / 2;
                    const y =
                        size / 2 - radius * Math.cos(angleRad) - dotSize / 2;

                    const animationDelay = `${(index * 0.16 - 0.32).toFixed(2)}s`;

                    return (
                        <span
                            key={index}
                            style={{
                                position: 'absolute',
                                borderRadius: '50%',
                                width: `${dotSize}px`,
                                height: `${dotSize}px`,
                                left: `${x}px`,
                                top: `${y}px`,
                                backgroundColor: color,
                                transition:
                                    'background-color 0.3s ease, box-shadow 0.3s ease',
                                ...getGlowStyle(),
                                animation:
                                    'dottedSpinnerPulse 1.4s infinite ease-in-out both',
                                animationDelay,
                                animationPlayState: paused
                                    ? 'paused'
                                    : 'running',
                            }}
                        />
                    );
                })}
            </span>
        </div>
    );
}
