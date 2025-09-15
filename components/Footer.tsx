// components/Footer.tsx
export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__row">
        <small>© {new Date().getFullYear()} Антиучебник</small>
      </div>
    </footer>
  );
}
