import LoginClient from './LoginClient';

// Opt out of static generation since this page uses dynamic searchParams
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return <LoginClient />;
}
