# Agenda acadêmica com Node.js e MVC

Aplicação web para organizar tarefas acadêmicas. Desenvolvida com Node.js, Express e EJS, com separação entre Model, View e Controller. Os dados são objetos armazenados em um array na memória do servidor.

## Executar no computador

Pré-requisito: Node.js 22 ou superior, com npm. O projeto foi verificado com Node.js 24.22.1. Confira a instalação com `node -v` e `npm -v`.

1. Extraia o ZIP para uma pasta no computador.
2. Abra a pasta `tarefas-academicas-mvc` no VS Code.
3. No VS Code, abra **Terminal > Novo Terminal**. Confira se o terminal está na pasta que contém o `package.json`.
4. Execute:

```bash
npm ci
npm start
```

5. Abra **http://localhost:3000/tarefas** no navegador.

Mantenha o terminal aberto enquanto usar a aplicação. Para parar, pressione `Ctrl + C` no terminal. Não é necessário instalar MySQL, configurar banco de dados nem criar arquivo `.env`.

Se a porta 3000 estiver ocupada, encerre o outro servidor ou utilize outra porta no PowerShell:

```powershell
$env:PORT=3001
npm start
```

Nesse caso, abra `http://localhost:3001/tarefas`.

> As tarefas são apagadas quando o servidor é encerrado ou reiniciado. Atualizar a página do navegador mantém os dados, desde que o servidor continue em execução. Essa é a persistência em memória exigida pelo enunciado. A aplicação inicia vazia e as tarefas são compartilhadas pelos acessos à mesma instância do servidor, sem contas de usuário.

## Funcionalidades

| Requisito | Implementação |
| --- | --- |
| Cadastrar | Formulário com título, disciplina e descrição opcional; ID automático e status inicial `pendente` |
| Listar | Tabela com título, disciplina, status, identificador e ações |
| Consultar detalhes | Página com ID, título, descrição, disciplina e status |
| Editar | Altera título, descrição e disciplina; preserva ID e status |
| Concluir | Botão que altera o status para `concluida` |
| Excluir | Página com checkbox de confirmação; o servidor só remove após receber `confirmacao=sim` |
| Filtrar | Abas Todas, Pendentes e Concluídas |

## Validação dos dados

| Campo | Regra |
| --- | --- |
| `id` | Inteiro gerado pela aplicação, não reaproveitado após exclusões durante a execução |
| `titulo` | Obrigatório, entre 3 e 100 caracteres |
| `descricao` | Opcional, até 500 caracteres |
| `disciplina` | Obrigatório, entre 2 e 80 caracteres |
| `status` | `pendente` ou `concluida`; inicialmente `pendente` |

Os espaços no início e no fim são removidos antes da validação. A descrição vazia é armazenada como `''`. As regras são verificadas no servidor e também existem restrições HTML nos formulários. Em caso de erro, os valores são preservados e as mensagens aparecem junto aos campos. `id` e `status` enviados pelo formulário são ignorados: o Model controla esses dados.

O EJS usa `<%=` para escapar os textos exibidos no HTML. O uso de `<%-` fica restrito à inclusão dos templates de estrutura, sem interpolação direta de conteúdo digitado pelo usuário.

## Organização MVC

| Caminho | Responsabilidade |
| --- | --- |
| `server.js` | Inicia o servidor local |
| `src/app.js` | Configura Express, templates, arquivos estáticos, rotas e tratamento de erros |
| `src/models/Tarefa.js` | **Model:** array privado de objetos, ID sequencial, validação e operações nos dados |
| `src/controllers/tarefaController.js` | **Controller:** recebe as requisições, consulta o Model e escolhe a View ou redirecionamento |
| `src/routes/tarefaRoutes.js` | Relaciona método HTTP e endereço com a ação do Controller |
| `src/views/tarefas/` | **View:** templates EJS da lista, formulário, detalhes e confirmação de exclusão |
| `src/views/partials/` | Estrutura visual compartilhada pelas páginas |
| `src/views/erro.ejs` | Exibição de erros de página, validação de filtro e falhas gerais |
| `src/public/css/style.css` | Estilo e adaptação da interface a telas menores |
| `test/tarefa.test.js` | Testes automatizados do Model e dos fluxos HTTP |

### Exemplo do fluxo de cadastro

1. O navegador envia `POST /tarefas` com os dados do formulário.
2. A rota direciona a requisição para `controller.cadastrar`.
3. O Controller chama `model.cadastrar(req.body)`.
4. O Model valida, gera o ID e adiciona o objeto ao array com status `pendente`.
5. O Controller redireciona para a lista usando HTTP 303.
6. A listagem lê os dados do Model e renderiza `lista.ejs`.

Se a validação falhar, o Controller devolve o formulário com os erros e HTTP 422. A lista não é alterada. O redirecionamento após sucesso evita repetir o cadastro ao atualizar a página do navegador.

O Model não conhece requisições HTTP nem templates. As Views apresentam os dados recebidos e formulários, sem alterar o array. O Controller coordena a operação entre essas duas camadas.

## Rotas da aplicação

| Método | Caminho | Ação |
| --- | --- | --- |
| GET | `/` | Redirecionar para `/tarefas` |
| GET | `/tarefas` | Listar todas as tarefas |
| GET | `/tarefas?status=pendente` | Listar pendentes |
| GET | `/tarefas?status=concluida` | Listar concluídas |
| GET | `/tarefas/nova` | Exibir formulário de cadastro |
| POST | `/tarefas` | Cadastrar |
| GET | `/tarefas/:id` | Exibir detalhes |
| GET | `/tarefas/:id/editar` | Exibir formulário de edição |
| POST | `/tarefas/:id/editar` | Salvar edição |
| POST | `/tarefas/:id/concluir` | Concluir |
| GET | `/tarefas/:id/excluir` | Exibir confirmação, sem remover dados |
| POST | `/tarefas/:id/excluir` | Excluir somente com confirmação |

Os formulários HTML utilizam GET e POST. Por isso, edição, conclusão e exclusão usam rotas POST específicas. A aplicação renderiza páginas HTML no servidor; ela não é uma API JSON. Nenhuma rota GET altera as tarefas.

## Verificação

```bash
npm test
```

São 11 testes que verificam geração de IDs, limites inclusivos dos campos, descrição opcional, edição, conclusão, filtros, confirmação de exclusão, erros 404/400/413/422, escape de HTML e isolamento da memória entre instâncias. Os testes iniciam servidores temporários e não dependem de uma aplicação aberta na porta 3000.

Para desenvolvimento, `npm run dev` reinicia automaticamente após mudanças no código; cada reinício limpa o array. Durante a gravação, prefira `npm start` e evite reiniciar o servidor até terminar a demonstração.

## Baixar pelo Git

```bash
git clone https://github.com/ericksena17/tarefas-academicas-mvc.git
cd tarefas-academicas-mvc
npm ci
npm start
```

Depois, abra http://localhost:3000/tarefas no navegador. O repositório contém o código-fonte e as instruções de execução; o servidor Node.js deve ser executado no computador.

## Referências técnicas

- Node.js: https://nodejs.org/api/
- Rotas Express: https://expressjs.com/en/5x/guide/routing/
- Arquivos estáticos Express: https://expressjs.com/en/5x/starter/static-files/
- Templates EJS: https://ejs.co/docs/
