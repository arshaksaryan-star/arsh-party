import styles from "./Plate.module.css";

type PlateProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Фирменная плашка: чёрный блок неправильной формы, как в логотипе.
 * Левый верхний угол срезан, правый нижний скошен, весь блок чуть повёрнут.
 */
export function Plate({ children, className }: PlateProps) {
  return <span className={[styles.plate, className].filter(Boolean).join(" ")}>{children}</span>;
}
