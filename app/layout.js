import "./globals.css";

export const metadata = {
  title: "법인카드 사용내역",
  description: "월별 법인카드 사용액 관리",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
