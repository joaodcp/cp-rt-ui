import { CaretRight } from "@phosphor-icons/react";
import styles from "./ArrivingBusAnimation.module.css";

export default function ArrivingBusAnimation({ color }: { color: string }) {
    return (
        <div
            className={styles.scrollContainer}
            style={{
                color,
            }}
        >
            <div className={styles.scrollContent}>
                {[...Array(10)].map((_, index) => (
                    <CaretRight
                        key={index}
                        weight="bold"
                        style={{
                            transform: `translateX(${-index * 8}px)`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
