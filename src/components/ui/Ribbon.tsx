import styles from "./Ribbon.module.css";

type RibbonProps = {
  children: React.ReactNode;
  className?: string;
};

/** Лента цвета текущего акцента, повёрнутая как лента слогана в логотипе. */
export function Ribbon({ children, className }: RibbonProps) {
  return <span className={[styles.ribbon, className].filter(Boolean).join(" ")}>{children}</span>;
}
