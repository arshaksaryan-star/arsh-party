import type { StarColor } from "@/content/directions";

/** Правильная пятиконечная звезда, вписанная в квадрат 100×100. */
export const STAR_POINTS =
  "50,5 63,35.1 95.7,38.2 71,59.8 78.2,91.8 50,75.1 21.8,91.8 29,59.8 4.3,38.2 37,35.1";

type StarProps = {
  /** Цвет звезды направления. Без него звезда берёт текущий акцент. */
  color?: StarColor;
  className?: string;
  /** Подпись для скринридеров. Без неё звезда считается декоративной. */
  label?: string;
};

export function Star({ color, className, label }: StarProps) {
  const fill = color ? `var(--c-${color})` : "var(--accent)";
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <polygon points={STAR_POINTS} style={{ fill, transition: "fill 0.3s ease" }} />
    </svg>
  );
}
