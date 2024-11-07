import styles from "./FadeInOut.module.css";

export enum Fade {
    in = "fadeIn",
    out = "fadeOut",
    none = "none",
}

export default function FadeInOut({
    children,
    fade,
}: {
    children: React.ReactNode;
    fade: Fade;
}) {
    return <div className={styles[fade]}>{children}</div>;
}
