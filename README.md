# Projeto de Previsão de Demanda

Projeto acadêmico desenvolvido para a disciplina de Empreendedorismo, com foco na aplicação de conceitos de matemática, estatística e programação na análise e previsão de demanda.

![Status](https://img.shields.io/badge/status-em%20andamento-2563EB?style=for-the-badge)

## Objetivo

Desenvolver uma aplicação web capaz de analisar dados históricos de demanda, identificar padrões e aplicar métodos estatísticos para gerar previsões que possam auxiliar na tomada de decisões.

O projeto busca integrar conhecimentos de programação, análise de dados, estatística e desenvolvimento de aplicações web.

## Tecnologias

### Linguagem e aplicação

- **Python** — desenvolvimento da aplicação, processamento dos dados e implementação dos métodos de análise e previsão.
- **Flask** — desenvolvimento do backend e integração entre a aplicação e a interface.

### Análise e estatística

- **Pandas** — tratamento, organização e análise dos dados.
- **NumPy** — operações numéricas e manipulação de dados.
- **SciPy** — cálculos e métodos estatísticos.
- **Statsmodels** — análise estatística e modelos de séries temporais.
- **Scikit-learn** — modelos de previsão e métricas de avaliação.

### Visualização

- **Matplotlib** — criação de gráficos para representação dos dados e resultados das previsões.

### Banco de dados

- **Supabase (PostgreSQL)** — armazenamento e consulta dos dados utilizados pela aplicação.

### Interface

- **HTML** — estrutura das páginas.
- **CSS** — estilização da interface.
- **JavaScript** — interações e funcionalidades no navegador.

### Desenvolvimento

- **Git** — controle de versão.
- **GitHub** — hospedagem do repositório e colaboração entre os integrantes.

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

## Banco de Dados

O projeto utilizará o Supabase como solução de armazenamento, com PostgreSQL como sistema de gerenciamento de banco de dados.

As credenciais de acesso serão armazenadas em variáveis de ambiente e não deverão ser incluídas no repositório.

O arquivo `.env.example` será utilizado para documentar as variáveis necessárias para configuração do ambiente.

## Testes

Serão realizados testes durante o desenvolvimento para verificar:

- processamento e tratamento dos dados;
- cálculos estatísticos;
- métodos de previsão;
- métricas de avaliação;
- integração com o banco de dados;
- funcionamento das principais funcionalidades da aplicação.

## Escopo do MVP

A primeira versão do projeto terá como foco:

- armazenamento dos dados de demanda;
- tratamento e análise dos dados;
- aplicação de métodos estatísticos;
- geração de previsões;
- avaliação dos resultados;
- apresentação dos dados e previsões em uma interface web.

Funcionalidades adicionais poderão ser consideradas posteriormente, conforme o tempo disponível e as necessidades identificadas durante o desenvolvimento.

## Prazo

**Entrega prevista do MVP: 13 de novembro de 2026.**