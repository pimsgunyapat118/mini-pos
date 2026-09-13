import './globals.css';

export const metadata = {
  title: 'Mini POS',
  description: 'ระบบขายของร้านเล็ก',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <header className="app-header">
          <div className="app-title">Mini POS</div>
          <nav className="app-nav">
            <a href="/">สินค้า</a>
            <a href="/sell">ขายสินค้า</a>
            <a href="/history">ประวัติการขาย</a>
          </nav>
        </header>
        <main className="app-main">{children}</main>
      </body>
    </html>
  );
}
