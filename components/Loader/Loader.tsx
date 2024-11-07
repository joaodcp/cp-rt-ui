import styles from "./Loader.module.css";

export default function Loader() {
    return (
        <div className={styles.bar}>
            <div className={styles.capsule}></div>
        </div>
    );
}
