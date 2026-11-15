const express = require('express');
const path = require('node:path');
const { Tarefa } = require('./models/Tarefa');
const { criarTarefaRoutes } = require('./routes/tarefaRoutes');

function createApp() {
  const app = express();
  const model = new Tarefa();

  app.disable('x-powered-by');
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use((req, res, next) => {
    res.set('Content-Security-Policy', "default-src 'self'; style-src 'self'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(express.urlencoded({ extended: false, limit: '16kb' }));
  app.use((req, res, next) => { req.body ??= {}; next(); });
  app.use('/css', express.static(path.join(__dirname, 'public/css')));
  app.get('/', (req, res) => res.redirect('/tarefas'));
  app.use('/tarefas', criarTarefaRoutes(model));

  app.use((req, res) => res.status(404).render('erro', {
    tituloPagina: 'Página não encontrada', codigo: 404,
    mensagem: 'Não encontramos a página que você procurou.'
  }));
  app.use((erro, req, res, next) => {
    if (res.headersSent) return next(erro);
    const codigo = erro.type === 'entity.too.large' ? 413 : 500;
    if (codigo === 500) console.error(erro);
    res.status(codigo).render('erro', {
      tituloPagina: codigo === 413 ? 'Conteúdo muito grande' : 'Erro inesperado', codigo,
      mensagem: codigo === 413 ? 'O formulário excedeu o tamanho permitido.' : 'Não foi possível processar a solicitação. Tente novamente.'
    });
  });

  return app;
}

module.exports = { createApp };
