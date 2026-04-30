/*
  Configuração da integração do portfólio com a API Codexa.

  Produção:
  - Troque baseUrl pela URL do deploy da API na Vercel.
  - Exemplo: https://codexa-portfolio-api.vercel.app

  Desenvolvimento local:
  - Use http://localhost:3333 se estiver rodando a API localmente.
*/
window.CODEXA_PORTFOLIO_API = {
  baseUrl: "https://codexa-portifolio-api.vercel.app",
  publicPath: "/api/v1/portfolio-items",
  status: "published",
  featuredOnly: false,
  limit: 5,
  timeout: 15000
};
