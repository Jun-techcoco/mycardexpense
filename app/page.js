"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import CardExpenseApp from "@/components/CardExpenseApp";

// ⬇️ 본인이 원하는 비밀번호로 바꿔주세요 (다른 앱이랑 다르게 가능)
const APP_PASSWORD = "8009";

const STORAGE_KEY = "mycardexpense_approved_v1";

export default function Home() {
  const [supabase] = useState(() => createClient());
  const [approved, setApproved] = useState(null);
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setApproved(localStorage.getItem(STORAGE_KEY) === "yes");
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pw === APP_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, "yes");
      setApproved(true);
      setError("");
    } else {
      setError("비밀번호가 틀려요");
      setPw("");
    }
  };

  if (approved === null) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#64748b",
        fontSize: 14,
      }}>
        로딩 중...
      </div>
    );
  }

  if (!approved) {
    return (
      <div className="lock-page">
        <form onSubmit={handleSubmit} className="lock-card">
          <div className="lock-tag">잠금</div>
          <h1>법인카드 사용내역</h1>
          <p className="lock-sub">비밀번호를 입력해주세요</p>
          <input
            type="password"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setError(""); }}
            placeholder="비밀번호"
            autoFocus
          />
          <button type="submit" disabled={!pw.trim()}>들어가기</button>
          {error && <div className="lock-error">{error}</div>}
          <p className="lock-help">한 번 입력하면 이 기기에서는 다음부터 자동으로 들어와요</p>
        </form>

        <style jsx>{`
          .lock-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .lock-card {
            background: white;
            border-radius: 20px;
            padding: 40px 32px;
            width: 100%;
            max-width: 380px;
            box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04),
                        0 8px 24px rgba(15, 23, 42, 0.06);
            border: 1px solid #e2e8f0;
            display: flex;
            flex-direction: column;
            gap: 14px;
            text-align: center;
          }
          .lock-tag {
            display: inline-block;
            background: #fff1e6;
            color: #ea580c;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 6px;
            align-self: center;
          }
          h1 { font-size: 24px; font-weight: 800; margin: 4px 0 0; letter-spacing: -0.5px; }
          .lock-sub { font-size: 14px; color: #64748b; margin: 0 0 8px; }
          input {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 12px 14px;
            font-size: 15px;
            color: #0f172a;
            outline: none;
            transition: all 0.15s;
            text-align: center;
          }
          input:focus {
            background: white;
            border-color: #fb923c;
            box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.12);
          }
          button {
            background: #fb923c;
            color: white;
            border: none;
            border-radius: 10px;
            padding: 12px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.15s;
          }
          button:hover:not(:disabled) { background: #ea580c; }
          button:disabled { background: #cbd5e1; cursor: not-allowed; }
          .lock-error { color: #dc2626; font-size: 13px; margin-top: 4px; }
          .lock-help { font-size: 12px; color: #94a3b8; margin: 8px 0 0; line-height: 1.5; }
        `}</style>
      </div>
    );
  }

  return <CardExpenseApp supabase={supabase} />;
}
