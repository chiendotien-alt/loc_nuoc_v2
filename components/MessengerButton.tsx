/**
 * Nút nhắn tin Messenger cố định ở góc trái dưới.
 * Cấu hình bằng biến NEXT_PUBLIC_MESSENGER_LINK: có thể là link đầy đủ (https://m.me/tenpage)
 * hoặc chỉ tên/ID page (tenpage). Chưa cấu hình thì không hiện nút.
 */
export default function MessengerButton() {
  const raw = (process.env.NEXT_PUBLIC_MESSENGER_LINK || "").trim();
  if (!raw) return null;

  const href = /^https?:\/\//i.test(raw) ? raw : `https://m.me/${raw.replace(/^\/+/, "")}`;

  return (
    <a
      className="mess-bubble"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Nhắn tin với shop qua Messenger"
    >
      <svg viewBox="0 0 24 24" width="30" height="30" fill="#fff" aria-hidden="true">
        <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.15.26.35.27.57l.05 1.78c.02.57.6.94 1.12.71l1.99-.88c.17-.07.36-.09.53-.04.91.25 1.87.38 2.9.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2zm6 7.46l-2.93 4.65c-.47.74-1.47.93-2.17.4l-2.33-1.75a.6.6 0 0 0-.72 0l-3.14 2.38c-.42.32-.97-.19-.69-.64l2.93-4.65c.47-.74 1.47-.93 2.17-.4l2.33 1.75c.21.16.5.16.72 0l3.14-2.38c.42-.32.97.19.69.64z" />
      </svg>
      <span>Nhắn tin</span>
    </a>
  );
}
