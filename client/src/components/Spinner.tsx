import { Loader2 } from 'lucide-react';

/** Indicador de carregamento em tela cheia. */
export default function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );
}
