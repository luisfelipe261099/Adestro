import React, { useState } from "react";
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
  isActive?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="mb-4 flex items-center gap-2 text-sm">
      <Link href="/" className="flex items-center gap-1 text-purple-600 hover:text-purple-800">
        <span>Home</span>
      </Link>

      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <span className="text-gray-400">/</span>
          {item.href ? (
            <Link href={item.href} className="text-purple-600 hover:text-purple-800">
              {item.label}
            </Link>
          ) : (
            <span className={item.isActive ? "font-semibold text-gray-900" : "text-gray-600"}>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    Array<{
      id: string;
      type: "client" | "trainer" | "training" | "schedule";
      title: string;
      description: string;
      href: string;
    }>
  >([]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value.toLowerCase();
    setQuery(q);

    if (q.length < 2) {
      setResults([]);
      return;
    }

    // Simulação de busca (em produção, seria uma chamada à API)
    const mockResults = [
      {
        id: "1",
        type: "client" as const,
        title: "Cliente: João Silva",
        description: "Cliente do Cão: Rex (Golden Retriever)",
        href: "/clientes/1",
      },
      {
        id: "2",
        type: "trainer" as const,
        title: "Adestrador: Maria Santos",
        description: "Especialista em Obediência",
        href: "/admin/adestradores/1",
      },
      {
        id: "3",
        type: "training" as const,
        title: "Treino: Sessão com Rex",
        description: "Data: 10/05/2026 - Duração: 1h",
        href: "/treinos/3",
      },
    ];

    setResults(mockResults.filter((r) => r.title.toLowerCase().includes(q)));
  };

  const typeIcons: Record<string, string> = {
    client: "",
    trainer: "",
    training: "",
    schedule: "",
  };

  return (
    <div className="relative w-full max-w-sm">
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar clientes, adestradores, treinos..."
          value={query}
          onChange={handleSearch}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 100)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 pl-10 text-sm text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:outline-none"
        />
        <span className="absolute left-3 top-2.5 text-gray-400"></span>
      </div>

      {/* Dropdown com Resultados */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full z-50 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="max-h-80 overflow-y-auto">
            {results.map((result) => (
              <Link
                key={result.id}
                href={result.href}
                className="flex items-start gap-3 border-b border-gray-100 p-3 hover:bg-gray-50"
              >
                <span className="text-xl">{typeIcons[result.type]}</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{result.title}</p>
                  <p className="text-xs text-gray-600">{result.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && (
        <div className="absolute top-full z-50 mt-2 w-full rounded-lg border border-gray-200 bg-white p-4 text-center text-sm text-gray-600 shadow-lg">
          Nenhum resultado encontrado para "{query}"
        </div>
      )}
    </div>
  );
}
