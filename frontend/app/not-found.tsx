import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-mono font-bold text-primary">404</h1>
        <p className="text-muted-foreground">This page doesn&apos;t exist.</p>
        <Link
          href="/"
          className="inline-block btn-game-primary"
        >
          Back to AgoRace
        </Link>
      </div>
    </div>
  );
}
