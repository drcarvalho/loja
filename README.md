# 🛍️ Loja Tetê – Catálogo Premium & Pedidos via WhatsApp

Catálogo completo de camisas e kits esportivos com base em `products.json` (1.888 itens), sincronização automática com o Yupoo (`wanfing.x.yupoo.com/categories/3852491`), seleção de **Versão/Tipo, Tamanho, Quantidade e Adicionais**, cálculo automático de frete regressivo (grátis a partir de 5 peças), conversão USD → BRL configurável, suporte multilíngue (**PT / EN / 中文**) e envio direto formatado para o **WhatsApp**.

---

## 🚀 Publicação na Vercel

### Opção 1: Via GitHub (Automática)
1. Faça commit e push de todos os arquivos atualizados para o seu repositório GitHub:
   ```bash
   git add -A
   git commit -m "chore: rewrite app, api proxy/sync and vercel config"
   git push origin main
   ```
2. Acesse o painel da [Vercel](https://vercel.com) e clique em **Redeploy** (ou conecte o repositório em **Add New… → Project**).
3. A Vercel publicará automaticamente os arquivos estáticos e as Serverless Functions (`/api/proxy-img` e `/api/yupoo`).

### Opção 2: Via Vercel CLI
```bash
npx vercel --prod
```

---

## 🧪 Rodando Localmente e Executando Testes E2E

```bash
# Subir servidor local (porta 8080)
npm start

# Rodar suite Playwright E2E (Chromium + Firefox)
npm test
```

---

## ⚙️ Arquitetura de Arquivos para a Vercel

- [`vercel.json`](vercel.json): Rewrites (`/proxy-img` → `/api/proxy-img`, `/yupoo-products` → `/api/yupoo`), headers de segurança e cache para `products.json`.
- [`package.json`](package.json): Define `"type": "module"` exigido para Serverless Functions ESM na Vercel e scripts `start` / `test`.
- [`api/proxy-img.js`](api/proxy-img.js): Serverless Function com validação SSRF (domínios `*.yupoo.com`), header `Referer` automático e cache CDN de 7 dias.
- [`api/yupoo.js`](api/yupoo.js): Serverless Function que busca e faz parse em tempo real de `https://wanfing.x.yupoo.com/categories/3852491` para manter novos álbuns sincronizados automaticamente no catálogo.
- [`index.html`](index.html), [`style.css`](style.css), [`i18n.js`](i18n.js), [`app.js`](app.js): Front-end responsivo, acessível e livre de XSS.
- [`server.py`](server.py): Servidor local multithreaded para desenvolvimento e execução dos testes E2E (não enviado para a Vercel via `.vercelignore`).
