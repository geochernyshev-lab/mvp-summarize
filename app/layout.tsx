// app/layout.tsx
import './styles/globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Антиучебник',
  description: 'Конспекты, термины и «объясни просто» за минуты',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="root">
        <Header />
        <main className="container">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
