import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Adestro",
    short_name: "Adestro",
    description: "Plataforma para adestradores gerenciarem rotina, treinos, relatorios e agenda com apoio de IA.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#eaf4fb",
    theme_color: "#0f3d5e",
    lang: "pt-BR",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Nova sessão",
        short_name: "Registrar treino",
        description: "Lançar evolução de um treino realizado",
        url: "/treinos/registro?new=true",
        icons: [{ src: "/icon.svg", sizes: "any" }],
      },
      {
        name: "Agenda de hoje",
        short_name: "Agenda",
        description: "Ver os atendimentos do dia",
        url: "/agenda",
        icons: [{ src: "/icon.svg", sizes: "any" }],
      },
      {
        name: "Novo tutor",
        short_name: "Cadastrar",
        description: "Cadastrar tutor e cão",
        url: "/clientes?new=true",
        icons: [{ src: "/icon.svg", sizes: "any" }],
      },
      {
        name: "Financeiro",
        short_name: "Financeiro",
        description: "Pacotes, cobranças e recibos",
        url: "/financeiro",
        icons: [{ src: "/icon.svg", sizes: "any" }],
      },
    ],
  };
}
