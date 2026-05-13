"use client";

import { useEffect, useState } from "react";

const CATEGORIES = ["점심", "저녁", "커피", "주유", "하이패스", "주차", "세차", "기타"];
const VEHICLE_CATS = new Set(["주유", "하이패스", "주차", "세차"]);

const formatDateForInput = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatMonthLabel = (monthStr) => {
  const [y, m] = monthStr.split("-");
  return `${y}년 ${parseInt(m)}월`;
};

const formatMonthShort = (monthStr) => {
  const [y, m] = monthStr.split("-");
  return `${y}.${m}`;
};

const formatDateDisplay = (dateStr) => {
  const parts = dateStr.split("-");
  return `${parts[1]}.${parts[2]}`;
};

const formatMoney = (n) => Number(n).toLocaleString("ko-KR");

const getMonth = (dateStr) => dateStr.substring(0, 7);

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const getDaysInMonth = (monthStr) => {
  const [y, m] = monthStr.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};

const getDaysPassed = (monthStr) => {
  const today = new Date();
  const todayMonth = getCurrentMonth();
  if (monthStr === todayMonth) return today.getDate();
  if (monthStr < todayMonth) return getDaysInMonth(monthStr);
  return 0;
};

export default function CardExpenseApp({ supabase }) {
  const [expenses, setExpenses] = useState([]);
  const [budget, setBudget] = useState(1500000);
  const [loading, setLoading] = useState(true);
  const [viewingMonth, setViewingMonth] = useState(getCurrentMonth());

  const [dateInput, setDateInput] = useState("");
  const [catInput, setCatInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [noteInput, setNoteInput] = useState("");

  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");

  // Set default date when viewing month changes
  useEffect(() => {
    const todayMonth = getCurrentMonth();
    if (viewingMonth === todayMonth) {
      setDateInput(formatDateForInput(new Date()));
    } else {
      const [y, m] = viewingMonth.split("-").map(Number);
      const lastDay = new Date(y, m, 0);
      setDateInput(formatDateForInput(lastDay));
    }
  }, [viewingMonth]);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [expRes, setRes] = await Promise.all([
        supabase.from("card_expenses").select("*").order("date", { ascending: true }),
        supabase.from("card_settings").select("*").eq("key", "monthly_budget").maybeSingle(),
      ]);
      if (cancelled) return;
      if (expRes.error) console.error("로드 실패:", expRes.error);
      else setExpenses(expRes.data || []);
      if (setRes.data?.value) {
        const v = parseInt(setRes.data.value);
        if (v > 0) setBudget(v);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  const addExpense = async () => {
    if (!dateInput) { alert("날짜를 선택해주세요"); return; }
    if (!catInput) { alert("카테고리를 선택해주세요"); return; }
    const amountRaw = amountInput.replace(/[^0-9]/g, "");
    const amount = parseInt(amountRaw);
    if (!amount) { alert("금액을 입력해주세요"); return; }

    const note = noteInput.trim() || null;
    const tempId = "temp-" + Date.now();

    const optimistic = {
      id: tempId,
      date: dateInput,
      category: catInput,
      amount,
      note,
      created_at: new Date().toISOString(),
    };

    setExpenses((prev) => [...prev, optimistic]);
    setCatInput("");
    setAmountInput("");
    setNoteInput("");

    const entryMonth = getMonth(dateInput);
    if (entryMonth !== viewingMonth) setViewingMonth(entryMonth);

    const { data, error } = await supabase
      .from("card_expenses")
      .insert({ date: dateInput, category: catInput, amount, note })
      .select()
      .single();

    if (error) {
      setExpenses((prev) => prev.filter((e) => e.id !== tempId));
      alert("저장 실패: " + error.message);
    } else {
      setExpenses((prev) => prev.map((e) => (e.id === tempId ? data : e)));
    }
  };

  const deleteExpense = async (id) => {
    if (!confirm("이 기록을 삭제할까요?")) return;
    const backup = expenses;
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    const { error } = await supabase.from("card_expenses").delete().eq("id", id);
    if (error) {
      setExpenses(backup);
      alert("삭제 실패: " + error.message);
    }
  };

  const updateNote = async (id, value) => {
    const note = value.trim() || null;
    const { error } = await supabase
      .from("card_expenses").update({ note }).eq("id", id);
    if (error) console.error(error);
  };

  const startEditBudget = () => {
    setBudgetDraft(budget.toLocaleString("ko-KR"));
    setEditingBudget(true);
  };

  const saveBudgetEdit = async () => {
    const raw = budgetDraft.replace(/[^0-9]/g, "");
    const val = parseInt(raw);
    if (val && val > 0) {
      setBudget(val);
      const { error } = await supabase
        .from("card_settings")
        .upsert({ key: "monthly_budget", value: String(val) }, { onConflict: "key" });
      if (error) alert("한도 저장 실패: " + error.message);
    }
    setEditingBudget(false);
  };

  const cancelBudgetEdit = () => {
    setEditingBudget(false);
    setBudgetDraft("");
  };

  const shiftMonth = (delta) => {
    const [y, m] = viewingMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setViewingMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleAmountInput = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setAmountInput(raw ? parseInt(raw).toLocaleString("ko-KR") : "");
  };

  const handleBudgetInput = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setBudgetDraft(raw ? parseInt(raw).toLocaleString("ko-KR") : "");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") addExpense();
  };

  // Filter & sort
  const monthExpenses = expenses
    .filter((e) => getMonth(e.date) === viewingMonth)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Category totals
  const catTotals = {};
  CATEGORIES.forEach((c) => (catTotals[c] = 0));
  let totalAll = 0, totalExcl = 0;
  monthExpenses.forEach((e) => {
    catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    totalAll += e.amount;
    if (!VEHICLE_CATS.has(e.category)) totalExcl += e.amount;
  });

  // Budget calcs
  const daysInMonth = getDaysInMonth(viewingMonth);
  const daysPassed = getDaysPassed(viewingMonth);
  const dailyBudget = budget / daysInMonth;
  const expectedSpend = Math.round(dailyBudget * daysPassed);
  const currentSpend = totalAll;
  const diff = currentSpend - expectedSpend;
  const diffGood = diff <= 0;
  const usageRatio = budget > 0 ? currentSpend / budget : 0;
  const timeRatio = daysInMonth > 0 ? daysPassed / daysInMonth : 0;
  const forecast = daysPassed > 0 ? Math.round((currentSpend / daysPassed) * daysInMonth) : 0;
  const forecastOverBudget = forecast > budget;

  let progressClass = "good";
  if (usageRatio > timeRatio * 1.1) progressClass = "bad";
  else if (usageRatio > timeRatio) progressClass = "warn";

  // All months
  const allMonthsSet = new Set(expenses.map((e) => getMonth(e.date)));
  allMonthsSet.add(getCurrentMonth());
  allMonthsSet.add(viewingMonth);
  const allMonths = Array.from(allMonthsSet).sort();

  const today = new Date();
  const todayStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
  const isCurrent = viewingMonth === getCurrentMonth();

  return (
    <div className="page">
      <div className="container">
        <header className="header">
          <div>
            <div className="brand">법인카드 사용내역</div>
            <div className="brand-sub">{todayStr}</div>
          </div>
          {isCurrent ? (
            <div className="current-badge">● 현재 달</div>
          ) : (
            <div className="past-badge">📋 지난 달 보기</div>
          )}
        </header>

        {/* Hero */}
        <section className="hero-card">
          <div className="tag tag-orange">{formatMonthLabel(viewingMonth)} 현황</div>
          <div className="hero-row">
            <div>
              <div className="hero-current">현재 사용액</div>
              <div className="hero-amount">
                <span className="won">₩</span>{formatMoney(currentSpend)}
              </div>
            </div>
            <div className="hero-vs">
              <div className="hero-vs-row">
                <span>오늘까지 정상 금액</span>
                <span className="hero-vs-value">₩{formatMoney(expectedSpend)}</span>
              </div>
              <div className="hero-vs-row">
                <span>차이</span>
                <span className={`hero-diff ${diffGood ? "good" : "bad"}`}>
                  {diffGood ? "−" : "+"}₩{formatMoney(Math.abs(diff))}
                  <span className={`mini-pill ${diffGood ? "pill-good" : "pill-bad"}`}>
                    {diffGood ? "여유" : "초과"}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <div className="progress">
            <div
              className={`progress-fill ${progressClass}`}
              style={{ width: `${Math.min(usageRatio * 100, 100).toFixed(1)}%` }}
            />
          </div>
          <div className="progress-labels">
            <span>0원</span>
            <span>월 한도 {formatMoney(budget)}원 ({(usageRatio * 100).toFixed(1)}% 사용)</span>
            <span>{formatMoney(budget)}원</span>
          </div>
          {isCurrent && daysPassed > 0 && (
            <div className="forecast-row">
              <span className="forecast-label">이 페이스대로 월말까지 사용 예상</span>
              <span className="forecast-right">
                <span className="forecast-value">₩{formatMoney(forecast)}</span>
                <span className={`forecast-status ${forecastOverBudget ? "tag-red" : "tag-green"}`}>
                  {forecastOverBudget
                    ? `한도 ${formatMoney(forecast - budget)}원 초과 예상`
                    : `한도 ${formatMoney(budget - forecast)}원 여유 예상`}
                </span>
              </span>
            </div>
          )}
          <div className="day-info">
            {daysPassed}일 / {daysInMonth}일 경과 ({(timeRatio * 100).toFixed(1)}%)
          </div>
        </section>

        {/* Budget setting */}
        <section className="card budget-card">
          <span className="budget-label">월 한도</span>
          {editingBudget ? (
            <div className="budget-edit">
              <input
                type="text"
                className="budget-input"
                value={budgetDraft}
                onChange={handleBudgetInput}
                autoFocus
              />
              <span className="budget-unit">원</span>
              <button className="mini-btn primary" onClick={saveBudgetEdit}>저장</button>
              <button className="mini-btn" onClick={cancelBudgetEdit}>취소</button>
            </div>
          ) : (
            <div className="budget-view">
              <span className="budget-amount">₩ {formatMoney(budget)}</span>
              <button className="mini-btn" onClick={startEditBudget}>변경</button>
            </div>
          )}
        </section>

        {/* Category breakdown */}
        <section className="card">
          <div className="card-head">
            <div className="tag tag-blue">카테고리별</div>
            <h2>분류별 사용액</h2>
          </div>
          <div className="cat-grid">
            {CATEGORIES.map((c) => (
              <div key={c} className={`cat-cell${VEHICLE_CATS.has(c) ? " vehicle" : ""}`}>
                <div className="cat-name">
                  {c}{VEHICLE_CATS.has(c) && <span className="ex">차량</span>}
                </div>
                <div className={`cat-amount${catTotals[c] === 0 ? " zero" : ""}`}>
                  {catTotals[c] === 0 ? "—" : "₩ " + formatMoney(catTotals[c])}
                </div>
              </div>
            ))}
          </div>
          <div className="cat-totals">
            <div className="cat-total-block">
              <div className="cat-total-label">차량 제외 합계</div>
              <div className="cat-total-value">₩ {formatMoney(totalExcl)}</div>
            </div>
            <div className="cat-total-block">
              <div className="cat-total-label">전체 합계</div>
              <div className="cat-total-value orange">₩ {formatMoney(totalAll)}</div>
            </div>
          </div>
        </section>

        {/* Add Form */}
        <section className="card">
          <div className="card-head">
            <div className="tag tag-blue">새 기록</div>
            <h2>빠른 추가</h2>
          </div>
          <div className="add-form">
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <select value={catInput} onChange={(e) => setCatInput(e.target.value)}>
              <option value="">카테고리</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="text"
              value={amountInput}
              onChange={handleAmountInput}
              onKeyDown={handleKeyDown}
              placeholder="금액"
              inputMode="numeric"
              className="amount-input"
            />
            <input
              type="text"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="상호/비고 (선택)"
            />
            <button
              className="add-btn"
              onClick={addExpense}
              disabled={!catInput || !amountInput || !dateInput}
            >
              + 추가
            </button>
          </div>
          <div className="add-hint">날짜 바꿔서 지난 날짜로도 입력할 수 있어요</div>
        </section>

        {/* Expense list */}
        <section className="card">
          <div className="card-head">
            <div className="tag tag-orange">{formatMonthLabel(viewingMonth)} 내역</div>
            <h2>사용 내역 <span className="count">{monthExpenses.length}건</span></h2>
          </div>

          {loading ? (
            <div className="empty">불러오는 중...</div>
          ) : monthExpenses.length === 0 ? (
            <div className="empty">이 달엔 아직 사용 기록이 없어요</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 46 }}>NO.</th>
                    <th style={{ width: 80 }}>날짜</th>
                    <th style={{ width: 90 }}>카테고리</th>
                    <th className="right" style={{ width: 110 }}>금액</th>
                    <th>상호 / 비고</th>
                    <th className="center" style={{ width: 50 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {monthExpenses.map((e, idx) => (
                    <tr key={e.id}>
                      <td className="cell-num">{idx + 1}</td>
                      <td className="cell-date">{formatDateDisplay(e.date)}</td>
                      <td>
                        <span className={`cell-cat cat-${e.category}`}>
                          {e.category}
                        </span>
                      </td>
                      <td className="cell-amount right">{formatMoney(e.amount)}</td>
                      <td className="cell-note">
                        <input
                          type="text"
                          defaultValue={e.note || ""}
                          onBlur={(ev) => updateNote(e.id, ev.target.value)}
                          placeholder="—"
                        />
                      </td>
                      <td className="center">
                        <button
                          className="del-btn"
                          onClick={() => deleteExpense(e.id)}
                          title="삭제"
                        >×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="month-nav">
          <button className="nav-btn" onClick={() => shiftMonth(-1)}>← 이전 달</button>
          <select
            className="month-select"
            value={viewingMonth}
            onChange={(e) => setViewingMonth(e.target.value)}
          >
            {allMonths.map((m) => (
              <option key={m} value={m}>
                {formatMonthShort(m)}{m === getCurrentMonth() ? " (현재)" : ""}
              </option>
            ))}
          </select>
          <button className="nav-btn" onClick={() => shiftMonth(1)}>다음 달 →</button>
        </div>

        <div className="footer-note">자동 저장 · 어디서든 같은 목록</div>
      </div>

      <style jsx>{`
        .page { min-height: 100vh; padding: 28px 18px 60px; }
        .container {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding: 4px 4px 6px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .brand { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
        .brand-sub {
          font-size: 13px; color: #64748b; margin-top: 2px;
          font-variant-numeric: tabular-nums;
        }
        .current-badge {
          background: #fff1e6; color: #ea580c; font-size: 12px; font-weight: 700;
          padding: 6px 12px; border-radius: 8px;
        }
        .past-badge {
          background: #f1f5f9; color: #475569; font-size: 12px; font-weight: 700;
          padding: 6px 12px; border-radius: 8px;
        }

        .tag {
          display: inline-block; font-size: 11px; font-weight: 700;
          padding: 4px 10px; border-radius: 6px; letter-spacing: 0.2px;
        }
        .tag-orange { background: #fff1e6; color: #ea580c; }
        .tag-blue { background: #e0f2fe; color: #0369a1; }
        .tag-green { background: #ecfdf5; color: #047857; }
        .tag-red { background: #fef2f2; color: #b91c1c; }

        .card {
          background: white; border-radius: 16px; padding: 22px 24px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
          border: 1px solid #e2e8f0;
        }
        .card-head { margin-bottom: 14px; }
        h2 { font-size: 16px; font-weight: 700; margin: 8px 0 0; color: #0f172a; }
        .count {
          font-size: 14px; color: #94a3b8; font-weight: 600; margin-left: 4px;
        }

        /* Hero */
        .hero-card {
          background: linear-gradient(135deg, #fff, #fafbfc);
          border-radius: 20px; padding: 26px 28px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.04);
        }
        .hero-row {
          display: grid; grid-template-columns: 1.4fr 1fr;
          gap: 20px; margin: 14px 0 18px;
        }
        .hero-current { font-size: 13px; color: #64748b; margin-bottom: 4px; }
        .hero-amount {
          font-size: 34px; font-weight: 800; letter-spacing: -1px;
          font-variant-numeric: tabular-nums; line-height: 1.1;
        }
        .hero-amount .won { font-size: 22px; margin-right: 2px; }
        .hero-vs {
          display: flex; flex-direction: column; gap: 6px;
          font-size: 13px; color: #64748b;
          border-left: 1px solid #e2e8f0; padding-left: 20px;
        }
        .hero-vs-row {
          display: flex; justify-content: space-between; align-items: baseline;
        }
        .hero-vs-value {
          font-weight: 700; font-variant-numeric: tabular-nums; color: #0f172a;
        }
        .hero-diff {
          font-size: 18px; font-weight: 800; font-variant-numeric: tabular-nums;
          display: inline-flex; align-items: center;
        }
        .hero-diff.good { color: #047857; }
        .hero-diff.bad { color: #b91c1c; }
        .mini-pill {
          font-size: 11px; font-weight: 700; padding: 2px 6px;
          border-radius: 4px; margin-left: 6px;
        }
        .pill-good { background: #ecfdf5; color: #047857; }
        .pill-bad { background: #fef2f2; color: #b91c1c; }

        .progress {
          width: 100%; height: 10px; background: #f1f5f9;
          border-radius: 99px; overflow: hidden; margin-top: 4px;
        }
        .progress-fill {
          height: 100%; border-radius: 99px; transition: width 0.4s ease;
        }
        .progress-fill.good { background: linear-gradient(90deg, #10b981, #059669); }
        .progress-fill.warn { background: linear-gradient(90deg, #fb923c, #f97316); }
        .progress-fill.bad  { background: linear-gradient(90deg, #ef4444, #dc2626); }
        .progress-labels {
          display: flex; justify-content: space-between;
          font-size: 11px; color: #94a3b8; margin-top: 6px;
          font-variant-numeric: tabular-nums;
        }
        .day-info {
          margin-top: 10px; font-size: 12px; color: #94a3b8; text-align: right;
        }
        .forecast-row {
          margin-top: 14px; padding: 12px 16px; background: #f8fafc;
          border-radius: 10px; display: flex; justify-content: space-between;
          align-items: center; font-size: 13px; flex-wrap: wrap; gap: 8px;
        }
        .forecast-label { color: #64748b; }
        .forecast-right { display: flex; align-items: center; gap: 8px; }
        .forecast-value {
          font-weight: 800; color: #0f172a;
          font-variant-numeric: tabular-nums; font-size: 16px;
        }
        .forecast-status {
          font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 5px;
        }

        /* Budget */
        .budget-card {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 16px 22px;
        }
        .budget-label { font-size: 13px; color: #64748b; }
        .budget-view, .budget-edit {
          display: flex; align-items: center; gap: 8px;
          flex-wrap: wrap; justify-content: flex-end;
        }
        .budget-amount {
          font-size: 18px; font-weight: 800; color: #0f172a;
          font-variant-numeric: tabular-nums; margin-right: 4px;
        }
        .budget-input {
          background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
          padding: 8px 12px; font-size: 15px; font-weight: 700; color: #0f172a;
          outline: none; width: 140px; text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .budget-input:focus { background: white; border-color: #fb923c; }
        .budget-unit { font-size: 13px; color: #64748b; }
        .mini-btn {
          background: white; border: 1px solid #e2e8f0; color: #475569;
          border-radius: 8px; padding: 8px 14px; font-size: 13px;
          font-weight: 600; cursor: pointer; transition: all 0.15s;
        }
        .mini-btn:hover { background: #f8fafc; }
        .mini-btn.primary { background: #fb923c; color: white; border-color: #fb923c; }
        .mini-btn.primary:hover { background: #ea580c; }

        /* Category grid */
        .cat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 10px;
        }
        .cat-cell {
          padding: 14px 16px; background: #f8fafc; border-radius: 10px;
          border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 4px;
        }
        .cat-cell.vehicle { background: #f9f7f4; border-style: dashed; }
        .cat-name { font-size: 12px; color: #64748b; font-weight: 600; }
        .cat-name .ex {
          font-size: 10px; background: #f1f5f9; color: #64748b;
          padding: 1px 5px; border-radius: 3px; margin-left: 4px; font-weight: 700;
        }
        .cat-amount {
          font-size: 17px; font-weight: 700; color: #0f172a;
          font-variant-numeric: tabular-nums;
        }
        .cat-amount.zero { color: #cbd5e1; }
        .cat-totals {
          display: flex; justify-content: flex-end; gap: 20px;
          padding: 12px 8px 0; margin-top: 12px;
          border-top: 1px solid #e2e8f0; flex-wrap: wrap;
        }
        .cat-total-block { text-align: right; }
        .cat-total-label { font-size: 11px; color: #64748b; margin-bottom: 2px; }
        .cat-total-value {
          font-size: 17px; font-weight: 800; font-variant-numeric: tabular-nums;
        }
        .cat-total-value.orange { color: #ea580c; }

        /* Add form */
        .add-form {
          display: grid;
          grid-template-columns: 130px 110px 1fr 1.3fr auto;
          gap: 10px;
        }
        .add-form input, .add-form select {
          background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
          padding: 12px 14px; font-size: 14px; color: #0f172a;
          outline: none; transition: all 0.15s;
        }
        .add-form input::placeholder { color: #94a3b8; }
        .add-form input:focus, .add-form select:focus {
          background: white; border-color: #fb923c;
          box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.12);
        }
        .add-form input.amount-input {
          text-align: right; font-variant-numeric: tabular-nums;
        }
        .add-form input[type="date"] {
          font-variant-numeric: tabular-nums; color: #475569;
        }
        .add-btn {
          background: #fb923c; color: white; border: none;
          border-radius: 10px; padding: 0 22px; font-size: 14px;
          font-weight: 700; cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }
        .add-btn:hover:not(:disabled) { background: #ea580c; }
        .add-btn:disabled { background: #cbd5e1; cursor: not-allowed; }
        .add-hint {
          margin-top: 10px; font-size: 12px; color: #94a3b8; text-align: right;
        }

        /* Table */
        .table-wrap {
          overflow-x: auto; margin: 0 -24px; padding: 0 24px;
        }
        table {
          width: 100%; border-collapse: collapse; min-width: 660px;
        }
        thead { background: #f8fafc; }
        th {
          text-align: left; padding: 11px 14px;
          font-size: 11px; font-weight: 700; color: #64748b;
          letter-spacing: 0.5px;
          border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;
        }
        th.right { text-align: right; }
        th.center { text-align: center; }
        td {
          padding: 12px 14px; font-size: 14px; color: #0f172a;
          border-bottom: 1px solid #f1f5f9;
        }
        td.right { text-align: right; }
        td.center { text-align: center; }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr:hover { background: #fafbfc; }

        .cell-num {
          color: #94a3b8; font-weight: 600; font-size: 13px;
          font-variant-numeric: tabular-nums;
        }
        .cell-date {
          color: #475569; font-size: 13px;
          font-variant-numeric: tabular-nums;
        }
        .cell-cat {
          display: inline-block; font-size: 12px; font-weight: 700;
          padding: 3px 9px; border-radius: 5px;
        }
        .cell-amount { font-weight: 600; font-variant-numeric: tabular-nums; }
        .cell-note { color: #64748b; font-size: 13px; }
        .cell-note input {
          background: transparent; border: 1px solid transparent;
          padding: 6px 9px; font-size: 13px;
          width: 100%; color: #64748b; border-radius: 6px;
          outline: none; transition: all 0.12s;
        }
        .cell-note input:hover { background: #f8fafc; }
        .cell-note input:focus {
          background: white; border-color: #cbd5e1; color: #0f172a;
        }
        .del-btn {
          background: transparent; border: 1px solid #e2e8f0;
          color: #64748b; width: 28px; height: 28px;
          border-radius: 6px; cursor: pointer; font-size: 16px;
          line-height: 1; transition: all 0.15s;
        }
        .del-btn:hover {
          background: #fef2f2; color: #dc2626; border-color: #fecaca;
        }

        .empty {
          text-align: center; padding: 40px 20px;
          color: #94a3b8; font-size: 14px;
        }

        .month-nav {
          display: flex; justify-content: center; align-items: center;
          gap: 10px; margin-top: 12px; padding: 8px;
        }
        .nav-btn {
          background: white; border: 1px solid #e2e8f0; color: #0f172a;
          border-radius: 10px; padding: 10px 16px;
          font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .nav-btn:hover {
          background: #fb923c; color: white; border-color: #fb923c;
        }
        .month-select {
          background: white; border: 1px solid #e2e8f0; color: #0f172a;
          border-radius: 10px; padding: 10px 14px;
          font-size: 14px; font-weight: 600;
          font-variant-numeric: tabular-nums;
          cursor: pointer; outline: none; min-width: 140px;
        }

        .footer-note {
          text-align: center; margin-top: 6px; padding: 8px;
          font-size: 12px; color: #94a3b8;
        }

        /* Category colors */
        :global(.cat-점심) { background: #fff7ed; color: #c2410c; }
        :global(.cat-저녁) { background: #fef2f2; color: #b91c1c; }
        :global(.cat-커피) { background: #f5f3ff; color: #6d28d9; }
        :global(.cat-주유) { background: #ecfeff; color: #0e7490; }
        :global(.cat-하이패스) { background: #eff6ff; color: #1d4ed8; }
        :global(.cat-주차) { background: #f0fdf4; color: #15803d; }
        :global(.cat-세차) { background: #fdf4ff; color: #a21caf; }
        :global(.cat-기타) { background: #f8fafc; color: #475569; }

        @media (max-width: 720px) {
          .page { padding: 18px 12px 40px; }
          .container { gap: 12px; }
          .card { padding: 18px; border-radius: 14px; }
          .hero-card { padding: 20px; border-radius: 14px; }
          .hero-row { grid-template-columns: 1fr; gap: 14px; }
          .hero-vs {
            border-left: none; border-top: 1px solid #e2e8f0;
            padding-left: 0; padding-top: 14px;
          }
          .hero-amount { font-size: 28px; }
          .add-form { grid-template-columns: 1fr 1fr; }
          .add-form .add-btn { grid-column: 1 / -1; padding: 12px; }
          .add-form input, .add-form select { padding: 12px 14px; font-size: 15px; }
          .table-wrap { margin: 0 -18px; padding: 0 18px; }
          th, td { padding: 10px 8px; font-size: 13px; }
          .nav-btn { padding: 8px 12px; font-size: 13px; }
          .cat-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
}
