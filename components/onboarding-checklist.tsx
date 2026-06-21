import React, { useState } from "react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: string;
  highlightElement?: string;
  completed: boolean;
}

interface OnboardingChecklistProps {
  userRole: "trainer" | "cliente" | "admin";
}

export function OnboardingChecklist({ userRole }: OnboardingChecklistProps) {
  const [steps, setSteps] = useState<OnboardingStep[]>(
    userRole === "trainer"
      ? [
          {
            id: "welcome",
            title: "Bem-vindo ao Adestro!",
            description:
              "Aprenda a usar a plataforma para gerenciar seus clientes, agendar treinos e registrar progresso.",
            icon: "👋",
            action: "Iniciar Tour",
            completed: false,
          },
          {
            id: "create-profile",
            title: "Complete seu Perfil",
            description: "Adicione sua foto, especialidades e informações de contato.",
            icon: "👤",
            action: "Ir para Perfil",
            highlightElement: "#profile-section",
            completed: false,
          },
          {
            id: "add-first-client",
            title: "Adicione seu Primeiro Cliente",
            description: "Registre um novo cliente e cão no sistema.",
            icon: "👥",
            action: "Adicionar Cliente",
            highlightElement: "#clients-section",
            completed: false,
          },
          {
            id: "schedule-first-training",
            title: "Agende o Primeiro Treino",
            description: "Crie um compromisso de treino na agenda.",
            icon: "📅",
            action: "Ir para Agenda",
            highlightElement: "#schedule-section",
            completed: false,
          },
          {
            id: "register-training",
            title: "Registre uma Sessão de Treino",
            description: "Complete seu primeiro registro com notas e observações.",
            icon: "🎯",
            action: "Registrar Treino",
            highlightElement: "#training-section",
            completed: false,
          },
          {
            id: "explore-features",
            title: "Explore Recursos Avançados",
            description: "Conheça a IA, gamificação e relatórios.",
            icon: "🚀",
            action: "Ver Mais",
            completed: false,
          },
        ]
      : userRole === "cliente"
        ? [
            {
              id: "welcome",
              title: "Bem-vindo ao Portal!",
              description: "Acompanhe o progresso do seu cão em tempo real.",
              icon: "👋",
              action: "Iniciar Tour",
              completed: false,
            },
            {
              id: "view-dashboard",
              title: "Visualize o Dashboard",
              description: "Veja o resumo das tarefas e progresso.",
              icon: "📊",
              action: "Ver Dashboard",
              highlightElement: "#dashboard-section",
              completed: false,
            },
            {
              id: "complete-task",
              title: "Complete uma Tarefa",
              description: "Realize uma das tarefas de treinamento em casa.",
              icon: "✓",
              action: "Ver Tarefas",
              highlightElement: "#tasks-section",
              completed: false,
            },
            {
              id: "watch-video",
              title: "Assista um Vídeo de Treinamento",
              description: "Veja os vídeos enviados pelo seu adestrador.",
              icon: "🎬",
              action: "Ver Vídeos",
              highlightElement: "#videos-section",
              completed: false,
            },
            {
              id: "send-feedback",
              title: "Envie um Feedback",
              description: "Comunique-se com seu adestrador.",
              icon: "💬",
              action: "Enviar Mensagem",
              highlightElement: "#feedback-section",
              completed: false,
            },
            {
              id: "check-progress",
              title: "Confira o Progresso",
              description: "Visualize os gráficos e relatório mensal.",
              icon: "📈",
              action: "Ver Relatório",
              completed: false,
            },
          ]
        : [
            {
              id: "welcome",
              title: "Bem-vindo ao Painel Admin!",
              description: "Gerencie adestradores, planos e relatórios.",
              icon: "👋",
              action: "Iniciar Tour",
              completed: false,
            },
            {
              id: "manage-trainers",
              title: "Gerencie Adestradores",
              description: "Adicione, edite e monitore adestradores.",
              icon: "👨‍🏫",
              action: "Ir para Adestradores",
              highlightElement: "#trainers-section",
              completed: false,
            },
            {
              id: "manage-plans",
              title: "Configure Planos",
              description: "Defina planos de treinamento e preços.",
              icon: "🎯",
              action: "Ir para Planos",
              highlightElement: "#plans-section",
              completed: false,
            },
            {
              id: "view-reports",
              title: "Visualize Relatórios",
              description: "Acompanhe o desempenho geral.",
              icon: "📊",
              action: "Ver Relatórios",
              highlightElement: "#reports-section",
              completed: false,
            },
            {
              id: "configure-billing",
              title: "Configure Faturamento",
              description: "Gerencie cobranças e assinaturas.",
              icon: "💰",
              action: "Ir para Financeiro",
              completed: false,
            },
          ]
  );

  const toggleStep = (id: string) => {
    setSteps(steps.map((step) => (step.id === id ? { ...step, completed: !step.completed } : step)));
  };

  const completedCount = steps.filter((s) => s.completed).length;
  const completionPercentage = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="rounded-lg border border-blue-200 bg-white p-6 shadow-md">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">🎓 Seu Guia de Boas-vindas</h2>
        <p className="mt-1 text-gray-600">Complete os passos abaixo para dominar o Adestro</p>
      </div>

      {/* Barra de Progresso */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Progresso da Configuração Inicial</span>
          <span className="text-sm font-bold text-purple-600">{completionPercentage}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-600">
          {completedCount} de {steps.length} passos concluídos
        </p>
      </div>

      {/* Lista de Passos */}
      <div className="space-y-3">
        {steps.map((step, idx) => (
          <div
            key={step.id}
            className={`rounded-lg border-2 p-4 transition-all ${
              step.completed
                ? "border-green-200 bg-green-50"
                : idx < 2
                  ? "border-purple-200 bg-purple-50"
                  : "border-gray-200 bg-white"
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Checkbox */}
              <div
                onClick={() => toggleStep(step.id)}
                className={`mt-1 h-6 w-6 flex-shrink-0 rounded-full border-2 cursor-pointer flex items-center justify-center transition-all ${
                  step.completed
                    ? "border-green-600 bg-green-600"
                    : "border-gray-300 hover:border-purple-500"
                }`}
              >
                {step.completed && <span className="text-sm text-white">✓</span>}
              </div>

              {/* Conteúdo */}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                      <span>{step.icon}</span>
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">{step.description}</p>
                  </div>
                </div>

                {/* Botão de Ação */}
                {!step.completed && (
                  <button className="mt-3 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700">
                    {step.action}
                  </button>
                )}

                {step.completed && (
                  <p className="mt-3 flex items-center gap-2 text-sm font-medium text-green-600">
                    <span>✓</span>
                    Concluído
                  </p>
                )}
              </div>

              {/* Número do Passo */}
              <div className="mt-1 text-xs font-bold text-gray-500">
                {idx + 1}/{steps.length}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mensagem de Conclusão */}
      {completionPercentage === 100 && (
        <div className="mt-6 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 p-4">
          <p className="text-center text-lg font-bold text-green-900">
            🎉 Parabéns! Você concluiu o onboarding.
          </p>
          <p className="mt-2 text-center text-sm text-green-800">
            Agora você está pronto para aproveitar todas as funcionalidades do Adestro!
          </p>
        </div>
      )}
    </div>
  );
}
