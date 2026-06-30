"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import CardExpenseApp from "@/components/CardExpenseApp";

export default function Home() {
  const [supabase] = useState(() => createClient());
  // undefined = 확인 중, null = 로그아웃 상태, 객체 = 로그인됨
  const [session, setSession] = useState(undefined);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    // 이미 로그인돼 있으면 그대로 통과 (= 한 번 인증한 기기는 안 물어봄)
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pw,
    });
    setLoading(false);
    if (error) {
      setError("이메일 또는 비밀번호가 맞지 않아요");
      setPw("");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setEmail("");
    setPw("");
  };

  // 확인 중
  if (session === undefined) {
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

  // 로그아웃 상태 → 로그인 화면
  if (!session) {
    return (
      <div className="lock-page">
        <form onSubmit={handleSubmit} className="lock-card">
          <div className="lock-tag">로그인</div>
          <h1>법인카드 사용내역</h1>
          <p className="lock-sub">이메일과 비밀번호로 로그인하세요</p>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            placeholder="이메일"
            autoComplete="username"
            autoFocus
          />
          <input
            type="password"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setError(""); }}
            placeholder="비밀번호"
            autoComplete="current-password"
          />
          <button type="submit" disabled={!email.trim() || !pw.trim() || loading}>
            {loading ? "로그인 중..." : "로그인"}
          </button>
          {error && <div className="lock-error">{error}</div>}
          <p className="lock-help">한 번 로그인하면 이 기기에서는 다음부터 자동으로 들어와요</p>
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

  // 로그인 상태 → 앱 표시 (+ 로그아웃 버튼)
  return (
    <>
      <button className="logout-fab" onClick={handleLogout} title="로그아웃">
        로그아웃
      </button>
      <CardExpenseApp supabase={supabase} />
      <style jsx>{`
        .logout-fab {
          position: fixed;
          top: 12px;
          right: 12px;
          z-index: 9999;
          background: rgba(255, 255, 255, 0.9);
          color: #64748b;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          backdrop-filter: blur(4px);
          transition: all 0.15s;
        }
        .logout-fab:hover {
          color: #ea580c;
          border-color: #fb923c;
        }
      `}</style>
    </>
  );
}
