/**
 * Простые иконки каналов связи. Нарисованы вручную в сетке 24×24,
 * цвет берут из currentColor.
 */

type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  "aria-hidden": true,
  focusable: "false" as const,
};

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3h3.5l1.8 4.6-2.3 1.5a11 11 0 0 0 6.9 6.9l1.5-2.3L21 15.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

/** Облачко чата с трубкой — знак WhatsApp-переписки. */
export function ChatIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 20.5 5 16.3A8.5 8.5 0 1 1 8 19.2Z" />
      <path d="M9.2 8.6c.2 2.7 2.3 5 5.1 5.4l.9-1.3 1.8.8-.4 1.6c-3.9.4-8.2-3.4-8.5-7.6l1.5-.6.9 1.8Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Бумажный самолётик — знак Telegram-переписки. */
export function PlaneIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.5 3.5 2.8 10.7c-.8.3-.7 1.4.1 1.6l4.6 1.3 1.8 5.6c.2.7 1.1.9 1.6.3l2.6-2.8 4.6 3.4c.6.4 1.4.1 1.6-.6L22.6 4.6c.2-.8-.5-1.4-1.1-1.1Z" />
      <path d="m7.5 13.6 10-6.6-7.2 8" />
    </svg>
  );
}

export function CameraIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Подпись «VK» в скруглённом квадрате. */
export function VkIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <path d="m6.5 9 2.2 6 2.2-6M13.5 9v6M17.5 9l-3.2 3 3.2 3" />
    </svg>
  );
}

export function PinIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}
