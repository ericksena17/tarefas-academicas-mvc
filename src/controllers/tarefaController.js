const { ErroValidacao } = require('../models/Tarefa');

// Controller: recebe a requisição, aciona o Model e escolhe a View.
function criarTarefaController(model) {
  const mensagens = {
    cadastrada: 'Tarefa cadastrada com sucesso.',
    editada: 'Tarefa atualizada com sucesso.',
    concluida: 'Tarefa concluída com sucesso.',
    excluida: 'Tarefa excluída com sucesso.'
  };

  function localizar(req, res) {
    const numero = Number(req.params.id);
    const tarefa = Number.isSafeInteger(numero) && numero > 0 && /^\d+$/.test(req.params.id)
      ? model.buscarPorId(numero) : null;
    if (!tarefa) {
      res.status(404).render('erro', {
        tituloPagina: 'Tarefa não encontrada', codigo: 404,
        mensagem: 'Esta tarefa não existe ou já foi excluída.'
      });
    }
    return tarefa;
  }

  function formulario(res, { tarefa = null, valores = tarefa || {}, erros = {}, status = 200 } = {}) {
    return res.status(status).render('tarefas/formulario', {
      tituloPagina: tarefa ? 'Editar tarefa' : 'Nova tarefa', tarefa, valores, erros
    });
  }

  return {
    listar(req, res) {
      const filtro = req.query.status ?? 'todas';
      if (!['todas', 'pendente', 'concluida'].includes(filtro)) {
        return res.status(400).render('erro', {
          tituloPagina: 'Filtro inválido', codigo: 400,
          mensagem: 'Escolha todas, pendentes ou concluídas para filtrar as tarefas.'
        });
      }
      const todas = model.listar();
      res.render('tarefas/lista', {
        tituloPagina: 'Minhas tarefas', tarefas: model.listar(filtro), filtro,
        resumo: {
          total: todas.length,
          pendentes: todas.filter(item => item.status === 'pendente').length,
          concluidas: todas.filter(item => item.status === 'concluida').length
        },
        mensagem: typeof req.query.sucesso === 'string' && Object.hasOwn(mensagens, req.query.sucesso)
          ? mensagens[req.query.sucesso] : ''
      });
    },

    novo(req, res) { formulario(res); },

    cadastrar(req, res, next) {
      try {
        model.cadastrar(req.body);
        res.redirect(303, '/tarefas?sucesso=cadastrada');
      } catch (erro) {
        if (!(erro instanceof ErroValidacao)) return next(erro);
        formulario(res, { valores: erro.valores, erros: erro.erros, status: 422 });
      }
    },

    detalhes(req, res) {
      const tarefa = localizar(req, res);
      if (tarefa) res.render('tarefas/detalhes', { tituloPagina: 'Detalhes da tarefa', tarefa });
    },

    editarFormulario(req, res) {
      const tarefa = localizar(req, res);
      if (tarefa) formulario(res, { tarefa });
    },

    editar(req, res, next) {
      const tarefa = localizar(req, res);
      if (!tarefa) return;
      try {
        model.editar(tarefa.id, req.body);
        res.redirect(303, '/tarefas?sucesso=editada');
      } catch (erro) {
        if (!(erro instanceof ErroValidacao)) return next(erro);
        formulario(res, { tarefa, valores: erro.valores, erros: erro.erros, status: 422 });
      }
    },

    concluir(req, res) {
      const tarefa = localizar(req, res);
      if (!tarefa) return;
      model.concluir(tarefa.id);
      res.redirect(303, '/tarefas?sucesso=concluida');
    },

    confirmarExclusao(req, res) {
      const tarefa = localizar(req, res);
      if (tarefa) res.render('tarefas/excluir', {
        tituloPagina: 'Excluir tarefa', tarefa, erro: ''
      });
    },

    excluir(req, res) {
      const tarefa = localizar(req, res);
      if (!tarefa) return;
      if (req.body.confirmacao !== 'sim') {
        return res.status(422).render('tarefas/excluir', {
          tituloPagina: 'Excluir tarefa', tarefa,
          erro: 'Marque a confirmação para excluir esta tarefa.'
        });
      }
      model.excluir(tarefa.id);
      res.redirect(303, '/tarefas?sucesso=excluida');
    }
  };
}

module.exports = { criarTarefaController };
