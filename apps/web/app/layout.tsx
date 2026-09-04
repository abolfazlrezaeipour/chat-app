import "./globals.css";

export const metadata = {
  title: "ChatApp Pro",
  description: "Professional local messenger",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
