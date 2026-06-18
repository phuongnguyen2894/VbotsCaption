import './globals.css';

export const metadata = {
  title: 'X Caption Generator',
  description: 'Generate engaging X (Twitter) post captions with AI',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
