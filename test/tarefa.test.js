const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Tarefa, ErroValidacao } = require('../src/models/Tarefa');
const { createApp } = require('../src/app');

const dados = (extra = {}) => ({
  titulo: 'Estudar MVC', descricao: 'Revisar as camadas.', disciplina: 'Design de Software', ...extra
});

test('Model gera IDs únicos sem reaproveitar os excluídos e sempre inicia pendente', () => {
  const model = new Tarefa();
  const a = model.cadastrar(dados({ id: 999, status: 'concluida' }));
  const b = model.cadastrar(dados());
  assert.equal(a.id, 1);
  assert.equal(a.status, 'pendente');
  assert.equal(b.id, 2);
  model.excluir(a.id);
  assert.equal(model.cadastrar(dados()).id, 3);
  assert.equal(model.buscarPorId(a.id), null);
});

test('Model aplica os limites inclusivos de título, disciplina e descrição', () => {
  const model = new Tarefa();
  model.cadastrar(dados({ titulo: 'abc', disciplina: 'AB', descricao: '' }));
  model.cadastrar(dados({ titulo: 'x'.repeat(100), disciplina: 'd'.repeat(80), descricao: 'z'.repeat(500) }));
  for (const extra of [
    { titulo: '' }, { titulo: 'ab' }, { titulo: 'x'.repeat(101) }, { titulo: '   ' },
    { disciplina: '' }, { disciplina: 'A' }, { disciplina: 'd'.repeat(81) },
    { descricao: 'z'.repeat(501) }, { titulo: ['Texto', 'duplicado'] }, { descricao: {} }
  ]) assert.throws(() => model.cadastrar(dados(extra)), ErroValidacao);
  assert.equal(model.listar().length, 2);
});

test('Model normaliza espaços, aceita descrição omitida e não expõe o array interno', () => {
  const model = new Tarefa();
  const a = model.cadastrar({ titulo: '  Estudar  ', disciplina: '  MVC  ' });
  assert.equal(a.titulo, 'Estudar');
  assert.equal(a.disciplina, 'MVC');
  assert.equal(a.descricao, '');
  a.status = 'concluida';
  model.listar()[0].titulo = 'Alteração externa';
  assert.equal(model.buscarPorId(a.id).status, 'pendente');
  assert.equal(model.buscarPorId(a.id).titulo, 'Estudar');
});

test('Model edita sem trocar ID/status, conclui, filtra e exclui', () => {
  const model = new Tarefa();
  const a = model.cadastrar(dados());
  model.cadastrar(dados({ titulo: 'Outro trabalho' }));
  model.concluir(a.id);
  model.editar(a.id, dados({ titulo: 'Apresentar trabalho', status: 'pendente', id: 88 }));
  const alterada = model.buscarPorId(a.id);
  assert.equal(alterada.titulo, 'Apresentar trabalho');
  assert.equal(alterada.id, a.id);
  assert.equal(alterada.status, 'concluida');
  assert.equal(model.listar('pendente').length, 1);
  assert.equal(model.listar('concluida').length, 1);
  assert.throws(() => model.editar(a.id, dados({ titulo: 'a' })), ErroValidacao);
  assert.equal(model.buscarPorId(a.id).titulo, 'Apresentar trabalho');
  assert.equal(model.excluir(a.id), true);
  assert.equal(model.excluir(a.id), false);
  assert.equal(model.editar(999, dados()), null);
  assert.equal(model.concluir(999), null);
});

async function comServidor(t, executar) {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close(erro => erro ? reject(erro) : resolve());
    server.closeAllConnections();
  }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = caminho => fetch(base + caminho, { redirect: 'manual' });
  const post = (caminho, campos) => fetch(base + caminho, {
    method: 'POST', body: new URLSearchParams(campos), redirect: 'manual'
  });
  await executar({ get, post, base });
}

test('HTTP renderiza a lista vazia e os formulários', async t => comServidor(t, async ({ get }) => {
  const raiz = await get('/');
  assert.equal(raiz.status, 302);
  assert.equal(raiz.headers.get('location'), '/tarefas');
  const lista = await get('/tarefas');
  assert.equal(lista.status, 200);
  assert.match(await lista.text(), /Seu planejamento começa aqui/);
  const novo = await get('/tarefas/nova');
  assert.equal(novo.status, 200);
  assert.match(await novo.text(), /Cadastrar tarefa/);
  const css = await get('/css/style.css');
  assert.equal(css.status, 200);
}));

test('HTTP executa cadastro, detalhes, edição, conclusão, filtros e exclusão confirmada', async t => comServidor(t, async ({ get, post }) => {
  let resposta = await post('/tarefas', dados());
  assert.equal(resposta.status, 303);
  let pagina = await (await get('/tarefas/1')).text();
  assert.match(pagina, /Estudar MVC/);
  assert.match(pagina, /Revisar as camadas\./);
  assert.match(pagina, /Design de Software/);
  assert.match(pagina, /Pendente/);
  assert.equal((await get('/tarefas/1/editar')).status, 200);
  resposta = await post('/tarefas/1/editar', dados({ titulo: 'Gravar apresentação', descricao: 'Explicar o MVC.', disciplina: 'Tópicos Especiais' }));
  assert.equal(resposta.status, 303);
  pagina = await (await get('/tarefas/1')).text();
  assert.match(pagina, /Gravar apresentação/);
  assert.match(pagina, /Explicar o MVC\./);
  assert.match(pagina, /Tópicos Especiais/);
  assert.equal((await post('/tarefas/1/concluir', {})).status, 303);
  assert.equal((await post('/tarefas/1/concluir', {})).status, 303);
  assert.match(await (await get('/tarefas/1')).text(), /Esta tarefa já foi concluída/);
  assert.doesNotMatch(await (await get('/tarefas?status=pendente')).text(), /Gravar apresentação/);
  assert.match(await (await get('/tarefas?status=concluida')).text(), /Gravar apresentação/);
  assert.equal((await get('/tarefas/1/excluir')).status, 200);
  assert.equal((await post('/tarefas/1/excluir', {})).status, 422);
  assert.equal((await post('/tarefas/1/excluir', { confirmacao: 'nao' })).status, 422);
  assert.equal((await get('/tarefas/1')).status, 200);
  assert.equal((await post('/tarefas/1/excluir', { confirmacao: 'sim' })).status, 303);
  assert.equal((await get('/tarefas/1')).status, 404);
}));

test('HTTP valida no servidor, mantém os campos e não salva edição inválida', async t => comServidor(t, async ({ get, post }) => {
  let resposta = await post('/tarefas', dados({ titulo: 'a' }));
  assert.equal(resposta.status, 422);
  assert.match(await resposta.text(), /Revisar as camadas\./);
  assert.match(await (await get('/tarefas')).text(), /Seu planejamento começa aqui/);
  await post('/tarefas', dados());
  resposta = await post('/tarefas/1/editar', dados({ disciplina: 'x', descricao: 'a'.repeat(501) }));
  assert.equal(resposta.status, 422);
  const pagina = await (await get('/tarefas/1')).text();
  assert.match(pagina, /Design de Software/);
  assert.match(pagina, /Revisar as camadas/);
  assert.equal((await post('/tarefas', new URLSearchParams('titulo=Primeiro&titulo=Segundo&disciplina=DS'))).status, 422);
}));

test('HTTP trata IDs ausentes/inválidos e filtros inválidos sem alterar tarefas', async t => comServidor(t, async ({ get, post }) => {
  await post('/tarefas', dados());
  for (const id of ['0', '-1', 'abc', '1e0', '1.0', '999', '9007199254740993']) {
    assert.equal((await get(`/tarefas/${id}`)).status, 404);
    assert.equal((await post(`/tarefas/${id}/editar`, dados())).status, 404);
    assert.equal((await post(`/tarefas/${id}/concluir`, {})).status, 404);
    assert.equal((await post(`/tarefas/${id}/excluir`, { confirmacao: 'sim' })).status, 404);
  }
  assert.equal((await get('/nao-existe')).status, 404);
  assert.equal((await get('/tarefas?status=qualquer')).status, 400);
  assert.equal((await get('/tarefas?status=pendente&status=concluida')).status, 400);
  assert.match(await (await get('/tarefas/1')).text(), /Pendente/);
}));

test('HTTP escapa HTML em todas as views e não aceita status/ID enviados no cadastro', async t => comServidor(t, async ({ get, post }) => {
  const titulo = '<script>alert(1)</script>';
  await post('/tarefas', dados({ titulo, descricao: '<img src=x onerror=alert(2)>', id: '200', status: 'concluida' }));
  for (const caminho of ['/tarefas', '/tarefas/1', '/tarefas/1/editar', '/tarefas/1/excluir']) {
    const pagina = await (await get(caminho)).text();
    assert.doesNotMatch(pagina, /<script>alert/);
    assert.doesNotMatch(pagina, /<img src=x/);
    assert.match(pagina, /&lt;script&gt;/);
  }
  assert.match(await (await get('/tarefas/1')).text(), /Pendente/);
  assert.equal((await get('/tarefas/200')).status, 404);
}));

test('HTTP lida com POST sem corpo e tamanho excessivo', async t => comServidor(t, async ({ base }) => {
  let resposta = await fetch(base + '/tarefas', { method: 'POST' });
  assert.equal(resposta.status, 422);
  resposta = await fetch(base + '/tarefas', {
    method: 'POST', body: new URLSearchParams({ titulo: 'x'.repeat(20000) })
  });
  assert.equal(resposta.status, 413);
}));

test('Uma nova instância da aplicação inicia sem as tarefas da instância anterior', async t => {
  await comServidor(t, async ({ post }) => { await post('/tarefas', dados()); });
  await comServidor(t, async ({ get }) => {
    assert.match(await (await get('/tarefas')).text(), /Seu planejamento começa aqui/);
  });
});
