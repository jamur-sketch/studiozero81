# Cartões – controle de parcelas

App de celular (PWA) para controlar as parcelas dos cartões de crédito emprestados para outras pessoas.

- **Lançar**: cadastra uma compra à mão (valor da parcela ou total, nº de parcelas, e em qual parcela ela está numa fatura — serve para compras já em andamento).
- **Extrato**: lê a fatura em PDF, CSV ou texto colado, encontra as compras parceladas (`03/10`, `PARC 03/10`, `Parcela 3 de 10`) e você escolhe de quem é cada uma. Compras já cadastradas aparecem como "já cadastrada"; o app lembra de quem é cada loja.
- **Resumo**: total a receber no mês, por pessoa e por cartão, com aviso de parcelas atrasadas.
- **Pessoa**: marca parcelas pagas (ou o mês inteiro) e manda a cobrança pronta pelo WhatsApp.
- **Ajustes**: nome, cor e vencimento dos 4 cartões e backup/restauração em arquivo.

Os dados ficam salvos só no celular (localStorage). Não tem build: são arquivos estáticos, basta hospedar a pasta `financas/` (Vercel, Netlify, GitHub Pages) e, no celular, "Adicionar à tela de início".

Para testar localmente: `python3 -m http.server` dentro da pasta e abrir `http://localhost:8000`.
