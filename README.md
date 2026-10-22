# Projeto de Previsão de Demanda

![Status](https://img.shields.io/badge/status-em%20andamento-2563EB?style=for-the-badge)
![Prazo MVP](https://img.shields.io/badge/Entrega%20MVP-16%20de%20Novembro%202026-blue?style=for-the-badge)

Projeto acadêmico desenvolvido para a disciplina de Empreendedorismo, com foco na aplicação de conceitos de matemática, estatística e programação na análise e previsão de demanda para uma iniciativa comunitária de lavanderia.

---

## Objetivo

Desenvolver uma aplicação web capaz de analisar dados históricos de demanda, identificar padrões sazonais e tendências, e aplicar métodos estatísticos para gerar previsões que auxiliem na tomada de decisões estratégicas.

---

## Tecnologias Utilizadas

### Linguagem e Backend
* **Python 3.11+** — Lógica da aplicação, processamento de dados e motores de previsão.
* **Flask** — Framework web para o backend e rotas da aplicação.

### Análise de Dados e Estatística
* **Pandas & NumPy** — Manipulação, tratamento e agregação de dados.
* **SciPy & Statsmodels** — Cálculos estatísticos avançados e modelos de séries temporais.
* **Scikit-learn** — Modelos preditivos e métricas de avaliação.

### Banco de Dados & Armazenamento
* **Supabase (PostgreSQL)** — Banco de dados relacional.
* **Supabase Storage (Buckets)** — Armazenamento seletivo de planilhas de atendimento (`.csv`/`.xlsx`) e imagens de perfil.

### Interface (Frontend)
* **HTML5, CSS3 & JavaScript** — Estrutura, estilização responsiva e interatividade.
* **Chart.js / Gráficos Interativos** — Renderização de gráficos modernos no navegador a partir de dados JSON fornecidos pelo backend.

### Ferramentas de Desenvolvimento
* **Git & GitHub** — Controle de versão e colaboração em equipe.
* **Pytest** — Automação de testes.

---

## Arquitetura e Escopo do MVP

O projeto adota a **Estratégia de Processamento no Back-end e Renderização Dinâmica no Front-end**:
1. **Segurança e Eficiência:** Sem o uso de ORMs pesados. A comunicação com o banco é feita de forma direta e segura através do SDK oficial do Supabase em Python.
2. **Separação de Responsabilidades:** O Python/Pandas executa todos os cálculos pesados (médias, somas, agrupamentos) e devolve estruturas limpas em **JSON**. O JavaScript do navegador encarrega-se exclusivamente de desenhar os gráficos visuais.
3. **Escopo do MVP:** 
   * Armazenamento e tratamento de dados de demanda.
   * Aplicação de métodos estatísticos e geração de previsões.
   * Interface web interativa para visualização dos resultados.

---

As tecnologias poderão ser ajustadas durante o desenvolvimento conforme as necessidades identificadas no projeto.

## Instalação

### Pré-requisitos

Antes de executar o projeto, é necessário ter instalado:

- Python 3.11 ou superior
- Git
- Um navegador web
- Uma conta no Supabase, caso o banco de dados esteja configurado para uso externo

A versão do Python poderá ser ajustada conforme as dependências utilizadas no projeto.

### Clonar o repositório

Abra o terminal e execute:

    git clone https://github.com/Cosmic-Bubble/projetolavanderia

Depois, entre na pasta do projeto:

    cd projetolavanderia

### Criar o ambiente virtual

No Windows:

    python -m venv .venv

Ative o ambiente virtual:

    .venv\Scripts\activate

Após a ativação, o terminal deverá indicar que o ambiente virtual está ativo.

### Instalar as dependências

Com o ambiente virtual ativado, execute:

    pip install -r requirements.txt

O arquivo `requirements.txt` contém as bibliotecas necessárias para executar o projeto.

## Configuração

Antes de executar a aplicação, configure as variáveis de ambiente necessárias.

Crie uma cópia do arquivo `.env.example` com o nome `.env`.

No arquivo `.env`, informe as configurações do ambiente, como as credenciais de acesso ao Supabase.

Exemplo:

    SUPABASE_URL=sua_url
    SUPABASE_KEY=sua_chave

O arquivo `.env` não deve ser enviado ao GitHub.

## Banco de Dados

Caso a aplicação utilize o banco configurado no Supabase, execute o script `database/schema.sql` no ambiente do projeto para criar a estrutura necessária.

As configurações de conexão devem estar presentes no arquivo `.env`.

## Executar a aplicação

Com o ambiente virtual ativado e as dependências instaladas, execute:

    python run.py

Após iniciar o servidor, acesse no navegador o endereço informado pelo Flask, normalmente:

    http://127.0.0.1:5000

A aplicação poderá ser encerrada utilizando `Ctrl + C` no terminal.

## Testes

Para executar os testes automatizados:

    pytest

Os testes serão utilizados para verificar o funcionamento das principais funcionalidades do sistema.

## Desenvolvimento

O projeto será desenvolvido localmente em ambiente Windows.

O Python será responsável pelo processamento dos dados, cálculos estatísticos, modelos de previsão e geração dos resultados.

HTML, CSS e JavaScript serão utilizados no desenvolvimento da interface.

O Git e o GitHub serão utilizados para controle de versão e colaboração entre os integrantes.

## Controle de Versão

Cada funcionalidade deverá ser desenvolvida em uma branch própria.

Para atualizar a versão local antes de iniciar uma tarefa:
```bash
    git checkout main
    git pull origin main
```
Para criar uma nova branch:
```bash
    git checkout -b feature/nome-da-tarefa
```

Após realizar as alterações:

```bash
    git add .
    git commit -m "feat: descrição da alteração"
    git push origin feature/nome-da-tarefa
```

Após o envio, a branch deverá ser submetida para revisão por meio de um Pull Request.

## Análise e Previsão

O processo de previsão será realizado a partir de dados históricos de demanda.

Inicialmente, os dados serão tratados e analisados para identificar características relevantes, como tendências, variações e possíveis padrões sazonais.

A partir dessa análise, serão selecionados métodos estatísticos e modelos de previsão adequados aos dados disponíveis.

Os resultados serão avaliados por meio de métricas apropriadas e apresentados na aplicação por meio de indicadores e visualizações.

## Testes

Serão realizados testes durante o desenvolvimento para verificar:

- processamento e tratamento dos dados;
- cálculos estatísticos;
- métodos de previsão;
- métricas de avaliação;
- integração com o banco de dados;
- funcionamento das principais funcionalidades da aplicação.
---

## Estrutura de Pastas

```
projetolavanderia/
├── app/                          # Aplicação Flask
│   ├── __init__.py               # Cria o app Flask (create_app)
│   ├── config.py                 # Lê as configurações do .env
│   ├── routes/                   # Rotas / endpoints
│   │   ├── auth.py               # Login, cadastro, proteção de rotas, redefinição de senha
│   │   ├── ...           
│   ├── templates/                # Templates Jinja2 (HTML)
│   │   ├── dashboard/
│   │   ├── ...
│   ├── static/                   # Arquivos estáticos (CSS, JS, imagens)
│   │   ├── css/style.css
│   │   ├── js/
│   │   │   ├── cadastro/cadastro.js
│   │   │   ├── login/login.js
│   │   │   ├── menu/menu.js
│   │   │   └── ...
│   │   └── assets/img/
│   ├── services/                 # Lógica de negócio (análise, previsão)
│   │   ├── supabase_client.py    # Centraliza a conexão com o Supabase
│   ├── models/                   # Modelos de dados / previsões
│   └── utils/                    # Helpers
├── database/schema.sql           # Script de criação do banco
├── run.py                        # Ponto de entrada: inicia Flask
├── requirements.txt              # Dependências Python
├── .env                          # Variáveis de ambiente (não versionado)
├── .gitignore                    # Extensões não versionadas
└── README.md                     # Este arquivo
```

## O que cada arquivo faz

- `run.py`: inicializa o app (`create_app`), registra todas as rotas e inicia o servidor (`port=5001`).
- `app/__init__.py`: configura o Flask com pastas `templates` e `static` dentro de `app/`.
- `app/routes/*.py`: cada arquivo define uma rota (URL) e retorna um template HTML.
- `app/templates/*.html`: páginas da interface, incluindo `menu/menu.html` que é incluído (`{% include %}`) nas páginas internas.
- `app/static/js/*.js`: JavaScript por módulo (ex: `cadastro.js` faz a validação de senha e envia para o Supabase).
- `tests/`: testes automatizados com pytest.

## Bibliotecas necessárias (`requirements.txt`)

- `flask` — backend web
- `python-dotenv` — carrega `.env`
- `supabase` — banco/postgres
- `pandas`, `numpy`, `scipy`, `statsmodels`, `scikit-learn` — análise e previsão
- `pytest` — testes
- `Chart' — gráficos 
- Outras: `lucide`, tailwind, (ícones, via CDN no HTML)
