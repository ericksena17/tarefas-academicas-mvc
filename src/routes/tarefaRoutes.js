const { Router } = require('express');
const { criarTarefaController } = require('../controllers/tarefaController');

function criarTarefaRoutes(model) {
  const router = Router();
  const controller = criarTarefaController(model);

  router.get('/', controller.listar);
  // A rota fixa vem antes de /:id para que "nova" não seja tratada como id.
  router.get('/nova', controller.novo);
  router.post('/', controller.cadastrar);
  router.get('/:id', controller.detalhes);
  router.get('/:id/editar', controller.editarFormulario);
  router.post('/:id/editar', controller.editar);
  router.post('/:id/concluir', controller.concluir);
  router.get('/:id/excluir', controller.confirmarExclusao);
  router.post('/:id/excluir', controller.excluir);

  return router;
}

module.exports = { criarTarefaRoutes };
