# 🛍️ Loja Tetê - Catálogo & Pedidos via WhatsApp

Site completo de e-commerce esportivo com 1.888 produtos extraídos do Yupoo, seleção de **Modelo, Tamanho, Quantidade e Preço**, carrinho de compras e envio direto para o **WhatsApp**.

---

## ⚡ Como Hospedar na Vercel (Passo a Passo)

### Opção 1: Via GitHub (Recomendada e Automática)
1. Crie um novo repositório no seu GitHub (ex: `loja-tete`).
2. No seu terminal, vincule o repositório local ao GitHub:
   ```bash
   git remote add origin https://github.com/SEU_USUARIO/loja-tete.git
   git push -u origin main
   ```
3. Acesse [vercel.com](https://vercel.com) e faça login.
4. Clique em **"Add New..."** ➔ **"Project"**.
5. Selecione o repositório `loja-tete` e clique em **Deploy**.
6. Pronto! A Vercel cuidará de tudo: arquivos estáticos, cache e a Serverless Function de imagens (`/api/proxy-img.js`).

---

### Opção 2: Via Vercel CLI (Direto do Terminal)
1. Instale a CLI da Vercel (se desejar):
   ```bash
   npm i -g vercel
   ```
2. No terminal dentro da pasta `Loja-tete`, execute:
   ```bash
   vercel
   ```
3. Confirme as opções padrão e o projeto estará no ar em poucos segundos!

---

## ⚙️ Arquivos Configurados para a Vercel
- [`vercel.json`](file:///home/daniel/Área%20de%20trabalho/Loja-tete/vercel.json): Configuração de rotas, headers de segurança e cache do catálogo.
- [`api/proxy-img.js`](file:///home/daniel/Área%20de%20trabalho/Loja-tete/api/proxy-img.js): Serverless Edge/Node Function na Vercel para servir as fotos do Yupoo com cabeçalho de Referer automático e cache global CDN de 7 dias.
- [`package.json`](file:///home/daniel/Área%20de%20trabalho/Loja-tete/package.json) e [`.gitignore`](file:///home/daniel/Área%20de%20trabalho/Loja-tete/.gitignore): Metadados e regras do repositório.

