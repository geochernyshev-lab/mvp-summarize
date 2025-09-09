import '../styles/globals.css';
import Header from '@/components/Header';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru"><body>
      <div className="container">
        <Header />
        {children}
      </div>
    </body></html>
  );
}
