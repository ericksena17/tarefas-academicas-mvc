class ErroValidacao extends Error {
  constructor(erros, valores) {
    super('Revise os campos informados.');
    this.erros = erros;
    this.valores = valores;
  }
}

// Model: guarda os objetos em um array e aplica as regras dos dados.
class Tarefa {
  #tarefas = [];
  #proximoId = 1;

  static validar(dados = {}) {
    const valores = {};
    const erros = {};
    const regras = {
      titulo: { nome: 'O título', min: 3, max: 100 },
      descricao: { nome: 'A descrição', min: 0, max: 500 },
      disciplina: { nome: 'A disciplina', min: 2, max: 80 }
    };

    for (const [campo, regra] of Object.entries(regras)) {
      const recebido = dados[campo];
      valores[campo] = typeof recebido === 'string' ? recebido.trim() : '';
      if (recebido !== undefined && typeof recebido !== 'string') {
        erros[campo] = `${regra.nome} deve ser um texto.`;
      } else if (valores[campo].length < regra.min) {
        erros[campo] = `${regra.nome} deve ter entre ${regra.min} e ${regra.max} caracteres.`;
      } else if (valores[campo].length > regra.max) {
        erros[campo] = `${regra.nome} deve ter no máximo ${regra.max} caracteres.`;
      }
    }

    if (Object.keys(erros).length) throw new ErroValidacao(erros, valores);
    return valores;
  }

  listar(status = 'todas') {
    return this.#tarefas
      .filter(tarefa => status === 'todas' || tarefa.status === status)
      .map(tarefa => ({ ...tarefa }));
  }

  buscarPorId(id) {
    const tarefa = this.#tarefas.find(item => item.id === id);
    return tarefa ? { ...tarefa } : null;
  }

  cadastrar(dados) {
    const valores = Tarefa.validar(dados);
    // id e status sempre são definidos pela aplicação.
    const tarefa = { id: this.#proximoId++, ...valores, status: 'pendente' };
    this.#tarefas.push(tarefa);
    return { ...tarefa };
  }

  editar(id, dados) {
    const tarefa = this.#tarefas.find(item => item.id === id);
    if (!tarefa) return null;
    Object.assign(tarefa, Tarefa.validar(dados));
    return { ...tarefa };
  }

  concluir(id) {
    const tarefa = this.#tarefas.find(item => item.id === id);
    if (!tarefa) return null;
    tarefa.status = 'concluida';
    return { ...tarefa };
  }

  excluir(id) {
    const indice = this.#tarefas.findIndex(item => item.id === id);
    if (indice === -1) return false;
    this.#tarefas.splice(indice, 1);
    return true;
  }
}

module.exports = { Tarefa, ErroValidacao };
