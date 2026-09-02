# 🛒 CheckTI - Sistema de Auditoria de TI para Lojas

O **CheckTI** é uma plataforma web desenvolvida para simplificar e padronizar as auditorias de tecnologia da informação nas lojas físicas. O sistema permite que auditores realizem checagens de infraestrutura e registrem fotos dos equipamentos.

---

## 🚀 Tecnologias Utilizadas

- **Frontend / Framework:** [Next.js](https://nextjs.org/) (React & TypeScript)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
- **Backend & Banco de Dados:** [Supabase](https://supabase.com/) (PostgreSQL, Auth e Storage)
- **Autenticação:** Supabase Auth (Email/Senha e Google OAuth)
- **Hospedagem:** Vercel

---

## ⚙️ Principais Funcionalidades

- 🔒 **Autenticação Segura & Controle de Acesso:**
  - Login via e-mail e Google OAuth.
  - Registro automático de perfis (`profiles`) via Triggers do PostgreSQL.
  - Permissões diferenciadas por níveis de usuário (`comum`, `admin`, etc.).

- 📝 **Formulário Dinâmico de Auditoria:**
  - Validação do status de redes, internet e conexões dos PDVs.
  - Detalhamento individual de cada equipamento (marca, modelo, patrimônio e foto).
  - Suporte a contagem de módulos para equipamentos específicos (ex: *Mobshop* e *Mobpin*).
  - Cálculo automático do status de equipamentos com base na contagem de peças com defeito.

- 📊 **Relatório Consolidado de TI:**
  - Visão geral com indicadores de KPIs (total de auditorias, alertas de rede, falhas de PDV e contagem de defeitos).
  - Filtros inteligentes por nome de loja e status dos equipamentos.
  - Cards expansíveis para navegação limpa e ágil.
  - Visualização inline de fotos anexadas aos chamados/equipamentos.

---

## 📂 Estrutura do Banco de Dados

- **`profiles`**: Armazena as informações básicas e permissões dos usuários (`id`, `email`, `role`).
- **`lojas`**: Cadastro e dados de identificação das lojas (`nome`, `codigo_loja`).
- **`auditorias`**: Registros gerais das inspeções em cada unidade.
- **`equipamentos`**: Itens, status, fotos e especificações técnicas vinculadas a uma auditoria.

---

## 🛠️ Como Rodar o Projeto Localmente

1. **Clone o repositório:**
   ```bash
   git clone [https://github.com/seu-usuario/seu-repositorio.git](https://github.com/camila-sousa5/check-ti.git)
   cd seu-repositorio
   ```
2. **Instale as dependências:**
    ```bash
    npm install
    ```
3. **Configure as variáveis de ambiente:**
    Crie um arquivo `.env.local` na raiz do projeto com as credenciais do seu Supabase:
    ```bash
    NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
    NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
    ```
4. **Execute o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```
    Acesse http://localhost:3000 no seu navegador.