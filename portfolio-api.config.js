/*
  Configuração da integração do portfólio com a API Codexa.

  Produção:
  - Troque baseUrl pela URL do deploy da API na Vercel.
  - Exemplo: https://codexa-portfolio-api.vercel.app

  Desenvolvimento local:
  - Use http://localhost:3333 se estiver rodando a API localmente.
*/
window.CODEXA_PORTFOLIO_API = {
  baseUrl: "https://codexa-portfolio-api.vercel.app",
  publicPath: "/api/v1/portfolio-items",
  categoriesPath: "/api/v1/categories",
  nichesPath: "/api/v1/niches",
  status: "published",
  featuredOnly: false,
  showInHomeOnly: true,
  limit: 5,
  timeout: 15000
};
