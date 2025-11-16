import './globals.css'
import ConfigBootstrapClient from '@/components/ConfigBootstrapClient';

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
        <ConfigBootstrapClient>{children}</ConfigBootstrapClient>
      </body>
    </html>
  )
}
