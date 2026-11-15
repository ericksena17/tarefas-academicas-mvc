const { createApp } = require('./src/app');

const port = Number(process.env.PORT) || 3000;
createApp().listen(port, '127.0.0.1', () => {
  console.log(`Aplicação disponível em http://localhost:${port}`);
  console.log('Armazenamento em memória: reiniciar o servidor apaga as tarefas.');
});
