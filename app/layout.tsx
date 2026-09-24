import "./globals.css";
import type { Metadata } from "next";
import MetaPixel from "@/components/MetaPixel";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Đồ Gia Dụng Shop",
  description: "Chuyên đồ gia dụng chính hãng, giá tốt"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <MetaPixel />
        {children}
      </body>
    </html>
  );
}
