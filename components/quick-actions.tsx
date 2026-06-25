import React, { useState } from "react";

interface QuickAction {
  label: string;
  icon: string;
  href: string;
  description: string;
  color: string;
}

export function QuickActionsPanel() {
  const quickActions: QuickAction[] = [
    {
      label: "Novo Cliente",
      icon: "",
      href: "/clientes/novo",
      description: "Registrar novo cliente",
      color: "bg-blue-100 text-blue-700 hover:bg-blue-200",
    },
    {
      label: "Agendar Treino",
      icon: "",
      href: "/agenda",
      description: "Criar agendamento",
      color: "bg-purple-100 text-purple-700 hover:bg-purple-200",
    },
    {
      label: "Registrar Treino",
      icon: "",
      href: "/treinos/novo",
      description: "Registrar sessão",
      color: "bg-green-100 text-green-700 hover:bg-green-200",
    },
    {
      label: "Ver Relatório",
      icon: "",
      href: "/financeiro",
      description: "Gerar relatório",
      color: "bg-orange-100 text-orange-700 hover:bg-orange-200",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {quickActions.map((action, idx) => (
        <a
          key={idx}
          href={action.href}
          className={`rounded-lg p-4 text-center font-medium transition-all ${action.color}`}
        >
          <p className="text-2xl">{action.icon}</p>
          <p className="mt-2 text-sm">{action.label}</p>
          <p className="text-xs opacity-75">{action.description}</p>
        </a>
      ))}
    </div>
  );
}

interface ContextMenuProps {
  items: Array<{
    label: string;
    icon?: string;
    href?: string;
    onClick?: () => void;
    divider?: boolean;
  }>;
  isOpen: boolean;
  onClose: () => void;
}

export function ContextMenu({ items, isOpen, onClose }: ContextMenuProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div
        className="absolute right-4 top-16 w-48 rounded-lg border border-gray-200 bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item, idx) => (
          <React.Fragment key={idx}>
            {item.divider && <div className="border-t border-gray-200" />}
            {item.href ? (
              <a
                href={item.href}
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {item.icon && <span>{item.icon}</span>}
                {item.label}
              </a>
            ) : (
              <button
                onClick={() => {
                  item.onClick?.();
                  onClose();
                }}
                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {item.icon && <span>{item.icon}</span>}
                {item.label}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
