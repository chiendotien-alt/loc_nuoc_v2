"use client";

import { useEffect } from "react";
import { pixelTrack } from "@/lib/pixel";

/** Báo cho Pixel biết khách đang xem trang một sản phẩm (sự kiện ViewContent). */
export default function PixelViewContent({ productId, name, value }: { productId: string; name: string; value: number }) {
  useEffect(() => {
    pixelTrack("ViewContent", {
      content_ids: [productId],
      content_name: name,
      content_type: "product",
      value,
      currency: "VND"
    });
  }, [productId, name, value]);

  return null;
}
