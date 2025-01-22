import Logo from '@/components/Logo';

export default function Home(): JSX.Element {
  return (
    <main>
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Logo size={200} className="mb-8" />
        <h1>Welcome to SoulPet</h1>
      </div>
    </main>
  );
}
