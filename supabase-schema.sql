-- 법인카드 사용내역 앱 - 새 테이블 2개 추가
-- 기존 Supabase 프로젝트 → SQL Editor → New query → 붙여넣기 → Run

-- 1. 사용 내역 테이블
create table card_expenses (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  category text not null,
  amount integer not null,
  note text,
  created_at timestamptz default now()
);

-- 2. 설정 테이블 (월 한도 보관용)
create table card_settings (
  key text primary key,
  value text not null
);

-- 기본 월 한도 입력 (150만원)
insert into card_settings (key, value) values ('monthly_budget', '1500000')
on conflict (key) do nothing;

-- RLS 해제 + 정책 (어디서든 접근 가능)
alter table card_expenses disable row level security;
alter table card_settings disable row level security;

drop policy if exists "public access" on card_expenses;
create policy "public access" on card_expenses for all using (true) with check (true);

drop policy if exists "public access" on card_settings;
create policy "public access" on card_settings for all using (true) with check (true);

-- 인덱스
create index card_expenses_date_idx on card_expenses(date desc);
