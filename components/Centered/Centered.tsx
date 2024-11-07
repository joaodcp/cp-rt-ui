import styles from "./Centered.module.css";

export default function Centered({
    children,
    style,
}: {
    children: React.ReactNode;
    style?: React.CSSProperties;
}) {
    return (
        <div style={style} className={styles.centered}>
            {children}
        </div>
    );
}
