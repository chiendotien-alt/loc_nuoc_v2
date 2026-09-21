import "./globals.css";

export const metadata = {
  title: "Đồ Gia Dụng Shop",
  description: "Chuyên đồ gia dụng chính hãng, giá tốt"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
