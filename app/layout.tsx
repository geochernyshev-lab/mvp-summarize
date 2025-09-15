// app/layout.tsx
import "@/styles/globals.css";
import NavBar from "@/components/NavBar";

export const metadata = {
  title: "Антиучебник",
  description:
    "Загружайте PDF/DOCX/изображения — получайте конспект, термины и «объясни просто».",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="bg">
        <NavBar />
        <main className="page">{children}</main>
        <footer className="footer">
          © {new Date().getFullYear()} Антиучебник
        </footer>
      </body>
    </html>
  );
}
