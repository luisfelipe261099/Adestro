import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Adestro",
    short_name: "Adestro",
    description: "Plataforma para adestradores gerenciarem rotina, treinos, relatorios e agenda com apoio de IA.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#26242f",
    theme_color: "#26242f",
    lang: "pt-BR",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Nova sessão",
        short_name: "Registrar treino",
        description: "Lançar evolução de um treino realizado",
        url: "/treinos/registro?new=true",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Agenda de hoje",
        short_name: "Agenda",
        description: "Ver os atendimentos do dia",
        url: "/agenda",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Novo cliente",
        short_name: "Cadastrar",
        description: "Cadastrar cliente e cão",
        url: "/clientes?new=true",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Financeiro",
        short_name: "Financeiro",
        description: "Pacotes, cobranças e recibos",
        url: "/financeiro",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
