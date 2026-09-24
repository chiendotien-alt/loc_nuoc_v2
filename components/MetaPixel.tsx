"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { pixelTrack } from "@/lib/pixel";

/**
 * Gắn Meta Pixel cho toàn web (trừ trang /admin).
 * - Lần tải đầu: khởi tạo Pixel và gửi PageView.
 * - Khi khách chuyển trang mà không tải lại (bấm vào sản phẩm từ trang chủ): gửi thêm PageView.
 * - Tắt "tự cấu hình" (autoConfig) để Pixel không tự đọc nút bấm / dữ liệu trên trang.
 */
export default function MetaPixel({ pixelId }: { pixelId: string }) {
  const pathname = usePathname();
  const first = useRef(true);
  const isAdmin = pathname?.startsWith("/admin");

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return; // lần đầu đã được gửi trong đoạn mã khởi tạo bên dưới
    }
    if (!isAdmin) pixelTrack("PageView");
  }, [pathname, isAdmin]);

  if (!pixelId || isAdmin) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('set','autoConfig',false,'${pixelId}');
fbq('init','${pixelId}');
fbq('track','PageView');
`}
    </Script>
  );
}
