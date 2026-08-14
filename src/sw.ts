/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope;

// Lista de arquivos do app injetada pelo build.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Assume o controle assim que uma versão nova é publicada.
self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
}

// Chega um aviso do servidor: mostra a notificação no celular.
self.addEventListener("push", (event) => {
  let payload: PushPayload = {};
  try {
    payload = event.data ? (event.data.json() as PushPayload) : {};
  } catch {
    payload = { body: event.data?.text() };
  }

  const title = payload.title || "ZERO81 Studio";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "Novo agendamento.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: payload.tag || "booking",
      data: { url: payload.url || "/home" },
    }),
  );
});

// Toque na notificação: abre o app (ou foca a janela já aberta).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data?.url as string) || "/home";

  event.waitUntil(
    (async () => {
      const janelas = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const janela of janelas) {
        if ("focus" in janela) {
          await janela.focus();
          if ("navigate" in janela) {
            await (janela as WindowClient).navigate(target).catch(() => {});
          }
          return;
        }
      }

      await self.clients.openWindow(target);
    })(),
  );
});
