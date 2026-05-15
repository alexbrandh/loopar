import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description: 'Inicia sesión en Regaliz para crear y gestionar tus postales AR.',
  alternates: { canonical: '/sign-in' },
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
