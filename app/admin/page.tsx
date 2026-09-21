"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    setLoading(false);
    if (res.ok) {
      router.push("/admin/products");
      router.refresh();
    } else {
      setError("Sai mật khẩu");
    }
  }

  return (
    <div className="wrap" style={{ paddingTop: 60 }}>
      <h1>Đăng nhập quản trị</h1>
      <form onSubmit={handleSubmit}>
        <label>Mật khẩu</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
        />
        <br />
        <br />
        <button className="cta" disabled={loading}>
          {loading ? "Đang kiểm tra..." : "Đăng nhập"}
        </button>
        {error && <p className="note" style={{ color: "#c62828" }}>{error}</p>}
      </form>
    </div>
  );
}
