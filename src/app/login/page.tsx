import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="card w-full max-w-sm p-8">
        <h1 className="text-xl font-semibold">Lepas Aftersales</h1>
        <p className="mb-6 mt-1 text-sm text-gray-500">Portal pentru dealeri și importator</p>
        <LoginForm />
        <p className="mt-6 text-xs text-gray-500">
          Conturile sunt create de importator. Dacă nu ai cont sau ai uitat parola, contactează importatorul.
        </p>
      </div>
    </main>
  );
}
