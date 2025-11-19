import './globals.css'
import ConfigBootstrapClient from '@/components/ConfigBootstrapClient';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Art Venues',
  description: 'Artist venue management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ConfigBootstrapClient>
          {children}
          <Footer />
        </ConfigBootstrapClient>
      </body>
    </html>
  )
}
