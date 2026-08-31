import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Sign in — Click War" };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
