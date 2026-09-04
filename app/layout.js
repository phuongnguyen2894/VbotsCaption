import './globals.css';

export const metadata = {
  title: 'LingOrm_Vbots Caption Generator',
  description: 'Empower LingOrm trends!',
  openGraph: {
    title: 'LingOrm_Vbots Caption Generator',
    description: 'Empower LingOrm trends!',
    url: 'https://vbots-caption.vercel.app',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
