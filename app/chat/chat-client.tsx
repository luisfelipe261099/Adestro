"use client";

import { AuthGuard } from "@/components/auth-guard";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

interface ChatContact {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  dogs: Array<{ name: string; breed: string | null }>;
  lastMessage: {
    message: string;
    author: string;
    createdAt: string;
  } | null;
}

interface ChatMessage {
  id: string;
  clientId: string;
  author: "Tutor" | "Adestrador";
  message: string;
  createdAt: string;
}

export default function ChatClientPage() {
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typedMessage, setTypedMessage] = useState("");
  
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Carregar contatos (tutores)
  async function fetchContacts() {
    try {
      const res = await fetch("/api/chat");
      if (!res.ok) throw new Error();
      const data = (await res.json()) as ChatContact[];
      setContacts(data);
      if (data.length > 0 && !selectedClientId) {
        setSelectedClientId(data[0].id);
      }
    } catch {
      setError("Erro ao carregar contatos.");
    } finally {
      setLoadingContacts(false);
    }
  }

  useEffect(() => {
    fetchContacts();
  }, []);

  // Carregar mensagens de um cliente específico
  async function fetchMessages(clientId: string, silent = false) {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await fetch(`/api/chat?clientId=${encodeURIComponent(clientId)}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as ChatMessage[];
      setMessages(data);
    } catch {
      if (!silent) setError("Erro ao carregar conversa.");
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }

  useEffect(() => {
    if (!selectedClientId) return;
    fetchMessages(selectedClientId);

    // Polling de 5 segundos para simular real-time chat
    const interval = setInterval(() => {
      fetchMessages(selectedClientId, true);
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedClientId]);

  // Rolar conversa para o final
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedContact = contacts.find((c) => c.id === selectedClientId);

  // Enviar mensagem
  async function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!typedMessage.trim() || !selectedClientId || sending) return;

    const msgText = typedMessage.trim();
    setTypedMessage("");
    setSending(true);

    // Optimistic Update
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      clientId: selectedClientId,
      author: "Adestrador",
      message: msgText,
      createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedClientId, message: msgText })
      });

      if (!res.ok) throw new Error();
      
      // Atualizar lista de contatos para subir a conversa atualizada
      fetchContacts();
      // Recarregar mensagens
      fetchMessages(selectedClientId, true);
    } catch {
      setError("Erro ao enviar mensagem.");
      // Remover optimistic message em caso de erro
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  }

  function formatTime(isoString: string): string {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }

  return (
    <AuthGuard role="trainer">
      <main className="mx-auto w-full max-w-md px-3 pb-24 pt-3 sm:max-w-xl">
        <section className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow)] overflow-hidden h-[82vh]">
          
          {/* Header */}
          <header className="flex items-center justify-between border-b border-[var(--border)] bg-[#f7fbff] px-4 py-3">
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[#145a82]">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                  <path d="m14.5 6-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <div>
                <h1 className="text-base font-semibold text-[var(--foreground)]">Chat Integrado</h1>
                <p className="text-[10px] text-[var(--muted)]">Comunicação direta com o Tutor</p>
              </div>
            </div>
            {selectedContact && (
              <span className="rounded-full bg-sky-100 text-[#145a82] px-2.5 py-0.5 text-[10px] font-bold">
                {selectedContact.dogs[0]?.name || "Cão"}
              </span>
            )}
          </header>

          {/* Lista de Contatos no topo para Mobile */}
          <section className="flex gap-2 border-b border-[var(--border)] bg-white p-2.5 overflow-x-auto">
            {loadingContacts ? (
              <span className="text-xs text-[var(--muted)] px-2">Carregando contatos...</span>
            ) : contacts.length === 0 ? (
              <span className="text-xs text-[var(--muted)] px-2">Nenhum tutor cadastrado.</span>
            ) : (
              contacts.map((c) => {
                const isSelected = c.id === selectedClientId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedClientId(c.id)}
                    className={`flex flex-col items-center justify-center rounded-xl px-3 py-1.5 min-w-[95px] text-center border transition-all ${
                      isSelected
                        ? "border-[#145a82] bg-sky-50 text-[#145a82] font-semibold"
                        : "border-[var(--border)] bg-slate-50 text-[var(--muted)]"
                    }`}
                  >
                    <span className="text-xs truncate max-w-[85px]">{c.name.split(" ")[0]}</span>
                    <span className="text-[9px] font-medium opacity-80">🐶 {c.dogs[0]?.name || "Pet"}</span>
                  </button>
                );
              })
            )}
          </section>

          {/* Conteúdo do Chat */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
            {loadingMessages ? (
              <div className="text-center text-xs text-[var(--muted)] py-8">Carregando conversa...</div>
            ) : !selectedClientId ? (
              <div className="text-center text-xs text-[var(--muted)] py-8">Selecione um contato para conversar</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-xs text-[var(--muted)] py-8">Nenhuma mensagem trocada ainda. Envie uma mensagem de boas-vindas!</div>
            ) : (
              messages.map((m) => {
                const isMe = m.author === "Adestrador";
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col max-w-[80%] ${
                      isMe ? "ml-auto items-end animate-in slide-in-from-right-3 duration-200" : "mr-auto items-start animate-in slide-in-from-left-3 duration-200"
                    }`}
                  >
                    <div
                      className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-xs ${
                        isMe
                          ? "bg-[linear-gradient(135deg,_#145a82,_#247eb2)] text-white rounded-tr-none"
                          : "bg-white border border-[var(--border)] text-slate-800 rounded-tl-none"
                      }`}
                    >
                      {m.message}
                    </div>
                    <span className="text-[9px] text-[var(--muted)] mt-1.5 px-1">
                      {isMe ? "Você" : selectedContact?.name} • {formatTime(m.createdAt)}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Rodapé do Input */}
          <footer className="border-t border-[var(--border)] bg-white p-2.5">
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                placeholder="Escreva sua mensagem..."
                className="flex-1 rounded-xl border border-[var(--border)] bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-sky-400 focus:bg-white"
                required
              />
              <button
                type="submit"
                disabled={sending || !typedMessage.trim() || !selectedClientId}
                className="flex h-9.5 w-9.5 items-center justify-center rounded-xl bg-[#145a82] text-white hover:bg-sky-800 transition disabled:opacity-50"
                aria-label="Enviar"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 rotate-45 transform" aria-hidden>
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
            {error && <p className="text-[10px] text-rose-600 mt-1.5 px-1">{error}</p>}
          </footer>

        </section>
      </main>
    </AuthGuard>
  );
}
