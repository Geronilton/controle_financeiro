# controle-financeiro

> Sistema de controle financeiro pessoal para gerenciar despesas, 
> parcelamentos e dívidas compartilhadas, com visão organizada por mês.

## 🎯 Sobre

Aplicação full-stack para controle financeiro pessoal, com foco em 
despesas parceladas e dívidas que envolvem mais de uma pessoa — 
permitindo associar participantes a uma dívida e acompanhar o que 
cada um deve, mês a mês.

## ✨ Funcionalidades

- Registro de despesas, incluindo parcelamento
- Associação de participantes a uma dívida (divisão de gastos compartilhados)
- Registro de entradas (receitas)
- Visualização das dívidas organizadas por mês
- Geração de dividas recorrentes automaticamente de acordo com a periodicidade informada. 

## 🛠️ Tecnologias

- [Next.js](https://nextjs.org/) 16
- [React](https://react.dev/) 19
- [Prisma ORM](https://www.prisma.io/) 7 com `@prisma/adapter-pg`
- [PostgreSQL](https://www.postgresql.org/)
- Deploy: [Vercel](https://vercel.com/) + [Neon](https://neon.tech/)

## 🔐 Arquitetura

- Autenticação baseada em sessão

## 🚀 Como rodar

\`\`\`bash
# clonar o repositório
git clone https://github.com/Geronilton/controle_financeiro

# instalar dependências
npm install

# configurar variáveis de ambiente
cp .env.example .env

# rodar migrations
npx prisma migrate dev

# iniciar em desenvolvimento
npm run dev
\`\`\`

## 📌 Status

Em produção, uso pessoal.
