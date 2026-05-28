import { Suspense } from "react";
import ChatClientPage from "./chat-client";

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-md px-3 pb-24 pt-3 sm:max-w-xl">
          <section className="rounded-md border border-[var(--border)] bg-white p-4">
            <p className="text-sm text-[var(--muted)]">Carregando central de mensagens...</p>
          </section>
        </main>
      }
    >
      <ChatClientPage />
    </Suspense>
  );
}
