// Mantém o app instalado sempre na versão mais recente.
//
// Num app adicionado à tela de início, o usuário raramente "recarrega a página":
// ele só volta ao app. Sem estes gatilhos, a versão antiga fica em cache por
// tempo indeterminado. Aqui a gente checa por atualização quando o app volta
// para a frente e recarrega assim que uma versão nova assume o controle.

const UMA_HORA = 60 * 60 * 1000;

export function registrarAtualizacaoAutomatica() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.ready
    .then((registration) => {
      const checar = () => registration.update().catch(() => {});

      // Ao trazer o app de volta para a tela.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checar();
      });
      window.addEventListener("focus", checar);

      // Rede de segurança para quem deixa o app aberto o dia todo.
      setInterval(checar, UMA_HORA);

      checar();
    })
    .catch(() => {});

  // Quando a versão nova assume, recarrega uma única vez.
  let recarregando = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (recarregando) return;
    recarregando = true;
    window.location.reload();
  });
}
