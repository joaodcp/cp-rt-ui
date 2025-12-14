import { CSSProperties, ReactNode } from "react";
import styles from "./TopBarButton.module.css";

export default function TopBarButton({
    children,
    style,
    onClick,
}: {
    children: ReactNode;
    style?: CSSProperties;
    onClick: () => void;
}) {
    return (
        <div className={styles.topBarButton} style={style} onClick={onClick}>
            {children}
        </div>
    );
}
