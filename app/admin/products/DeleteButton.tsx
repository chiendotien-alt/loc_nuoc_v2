"use client";

import { useRouter } from "next/navigation";

export default function DeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Xóa sản phẩm "${name}"? Không thể hoàn tác.`)) return;
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <button onClick={handleDelete} className="btn btn-danger">
      Xóa
    </button>
  );
}
