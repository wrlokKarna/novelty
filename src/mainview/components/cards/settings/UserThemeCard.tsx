export interface UserThemeCardProps {
    propName: string;
}

export default function UserThemeCard({ propName }: UserThemeCardProps) {
    return <div>{propName}</div>;
}
