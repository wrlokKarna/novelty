export interface BuiltInThemeCardProps {
    propName: string;
}

export default function BuiltInThemeCard({ propName }: BuiltInThemeCardProps) {
    return <div>{propName}</div>;
}
