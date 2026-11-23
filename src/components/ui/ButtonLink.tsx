import Link from "next/link";
import styles from "./ButtonLink.module.css";

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  /** solid — чёрная кнопка главного действия, ghost — тонкая обводка. */
  variant?: "solid" | "ghost";
  className?: string;
};

export function ButtonLink({ href, children, variant = "solid", className }: ButtonLinkProps) {
  const classes = [styles.button, styles[variant], className].filter(Boolean).join(" ");
  // Внутренние адреса ведём через Link, внешние (tel:, https:) обычной ссылкой.
  if (href.startsWith("/") || href.startsWith("#")) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={classes}>
      {children}
    </a>
  );
}
