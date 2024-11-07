import styles from "./Pill.module.css";

export enum BadgeColor {
    gray = "gray",
    blue = "blue",
    purple = "purple",
    subtlePurple = "subtlePurple",
    yellow = "yellow",
}

interface BadgeProps {
    text?: string;
    color?: BadgeColor;
    children?: React.ReactNode;
    wrapping?: boolean;
}

export default function Pill({
    text,
    color = BadgeColor.gray,
    children,
    wrapping = false,
}: BadgeProps) {
    return (
        <div
            className={wrapping ? styles.wrappingPill : styles.pill}
            id={styles[color]}
        >
            {text || children}
        </div>
    );
}
