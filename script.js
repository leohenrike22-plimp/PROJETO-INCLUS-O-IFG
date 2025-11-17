// Perguntas e respostas
const perguntas = [
  {
    texto: "O que significa acessibilidade digital?",
    opcoes: ["Facilidade de uso", "Acesso para todos", "Somente visual bonito"],
    correta: 1
  },
  {
    texto: "Quem se beneficia da acessibilidade?",
    opcoes: ["Somente pessoas com deficiência", "Todos os usuários", "Apenas idosos"],
    correta: 1
  }
];

let indice = 0;
let pontuacao = 0;

// Seleciona elementos
const perguntaEl = document.getElementById("question-container");
const opcoesEl = document.getElementById("options-container");
const botaoEl = document.getElementById("next-btn");
const resultadoEl = document.getElementById("result");
const scoreEl = document.getElementById("score");

// Função para mostrar pergunta
function mostrarPergunta() {
  const atual = perguntas[indice];
  perguntaEl.textContent = atual.texto;

  // Limpa e mostra opções
  opcoesEl.innerHTML = "";
  atual.opcoes.forEach((opcao, i) => {
    const btn = document.createElement("div");
    btn.className = "option";
    btn.textContent = opcao;
    btn.onclick = () => selecionar(i, btn);
    opcoesEl.appendChild(btn);
  });

  resultadoEl.classList.add("hidden");
  scoreEl.textContent = "";
}

// Selecionar resposta
function selecionar(i, botaoClicado) {
  // Remove seleção anterior
  document.querySelectorAll(".option").forEach(btn => {
    btn.classList.remove("selected");
  });
  
  // Marca botão selecionado
  botaoClicado.classList.add("selected");
  
  const correta = perguntas[indice].correta;
  if (i === correta) {
    pontuacao++;
    scoreEl.textContent = "✅ Resposta correta!";
  } else {
    scoreEl.textContent = "❌ Resposta incorreta!";
  }

  resultadoEl.classList.remove("hidden");
  botaoEl.classList.remove("hidden");
}

// Passar para próxima
botaoEl.onclick = () => {
  indice++;
  if (indice < perguntas.length) {
    mostrarPergunta();
    botaoEl.classList.add("hidden");
  } else {
    mostrarResultadoFinal();
  }
};

// Resultado final
function mostrarResultadoFinal() {
  document.getElementById("quiz-container").classList.add("hidden");
  resultadoEl.classList.remove("hidden");
  
  const porcentagem = Math.round((pontuacao / perguntas.length) * 100);
  scoreEl.innerHTML = `
    <strong>Você acertou ${pontuacao} de ${perguntas.length} questões</strong><br>
    Sua nota: ${porcentagem}%
  `;
}

// Inicia
mostrarPergunta();
botaoEl.classList.add("hidden");