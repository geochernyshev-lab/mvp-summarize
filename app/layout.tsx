// app/layout.tsx
import '../styles/globals.css';
import Header from '@/components/Header';

export const metadata = {
  title: 'Антиучебник — PDF/DOCX → Конспект',
  description: 'Загружай материалы и получай понятные конспекты.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <div className="container">
          <Header />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
