import './globals.css'
import ConfigBootstrapClient from '@/components/ConfigBootstrapClient';
import Footer from '@/components/Footer';
import HeaderBar from '@/components/HeaderBar';
import { AuthProvider } from '@/lib/AuthContext';

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
        <AuthProvider>
          <ConfigBootstrapClient>
            <HeaderBar />
            {children}
            <Footer />
          </ConfigBootstrapClient>
        </AuthProvider>
      </body>
    </html>
  )
}
