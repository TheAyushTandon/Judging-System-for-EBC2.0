import './globals.css';

export const metadata = {
  title: 'EBC 2.0 — Judging Platform',
  description: 'Enterprise Business Challenge 2.0 Startup Judging System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#06061a" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏆</text></svg>" />
      </head>
      <body>
        <div className="animated-bg" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
