/*
 * SISTEMA DE PROVA INCLUSIVA E ACESSÍVEL
 * 
 * Importância: Este sistema foi criado para promover igualdade de acesso à educação,
 * permitindo que pessoas com limitações físicas participem de avaliações de forma
 * justa, inclusiva e independente.
 * 
 * Funcionalidades:
 * - Questões de múltipla escolha com feedback visual
 * - Questões discursivas com frases prontas selecionáveis
 * - Botões grandes e alto contraste para fácil interação
 * - Suporte futuro para Text-to-Speech e Eye Tracking
 */

// Perguntas de múltipla escolha
const perguntasMultipla = [
  {
    tipo: "multipla",
    texto: "O que significa acessibilidade digital?",
    opcoes: ["Facilidade de uso", "Acesso para todos", "Somente visual bonito"],
    correta: 1
  },
  {
    tipo: "multipla",
    texto: "Quem se beneficia da acessibilidade?",
    opcoes: ["Somente pessoas com deficiência", "Todos os usuários", "Apenas idosos"],
    correta: 1
  },
  {
    tipo: "multipla",
    texto: "Qual é um exemplo de tecnologia assistiva?",
    opcoes: ["Leitores de tela", "Mouse comum", "Teclado padrão"],
    correta: 0
  },
  {
    tipo: "multipla",
    texto: "O que é inclusão digital?",
    opcoes: ["Acesso à internet apenas", "Participação plena de todos na sociedade digital", "Apenas para escolas"],
    correta: 1
  }
];

// Questões discursivas com frases prontas
const perguntasDiscursivas = [
  {
    tipo: "discursiva",
    texto: "Como a tecnologia pode ajudar pessoas com deficiência?",
    frasesProntas: [
      "A tecnologia facilita a comunicação",
      "Permite maior autonomia",
      "Oferece acesso à informação",
      "Possibilita participação social",
      "Cria oportunidades de trabalho",
      "Melhora a qualidade de vida"
    ]
  },
  {
    tipo: "discursiva",
    texto: "Quais são os benefícios da educação inclusiva?",
    frasesProntas: [
      "Promove igualdade",
      "Respeita as diferenças",
      "Desenvolve empatia",
      "Prepara para sociedade diversa",
      "Valoriza todos os alunos",
      "Cria ambiente colaborativo"
    ]
  }
];

// Combina todas as perguntas
const perguntas = [...perguntasMultipla, ...perguntasDiscursivas];

let indice = 0;
let pontuacao = 0;
let respostaDiscursiva = []; // Armazena frases selecionadas

// Estado dos recursos de acessibilidade
let ttsAtivo = false;
let eyeTrackingAtivo = false;
let simularOlharAtivo = false;
let gazeTimeout = null;

// Controle do modal de configuração
let passoAtualModal = 1;
const totalPassosModal = 5;

// Configurações de precisão do Eye Tracking
const eyeTrackingConfig = {
  dwellTime: 2000,              // Tempo de fixação em ms (2 segundos - aumentado)
  toleranciaMovimento: 50,      // Pixels de tolerância para considerar "olhar fixo"
  amostrasNecessarias: 10,      // Número de amostras consecutivas na mesma região
  calibracaoTempo: 36000,       // ⏱️ Tempo de calibração (3 ciclos × 9 pontos × 4s = 108s, ajustado para 36s)
  precisaoMinima: 0.7,          // Precisão mínima aceitável (0-1)
  filtroKalman: true,           // Usar filtro Kalman para suavização
  intervaloRegressao: 1500,     // Intervalo para regressão (ms)
  mostrarDebug: false,          // Mostrar informações de debug
  suavizacaoExtra: true,        // Suavização extra do ponto de predição
  tamanhoJanela: 15,            // Tamanho da janela para média móvel
  fatorSuavizacao: 0.3          // Fator de suavização exponencial (0-1, menor = mais suave)
};

// Seleciona elementos
const perguntaEl = document.getElementById("question-container");
const opcoesEl = document.getElementById("options-container");
const botaoEl = document.getElementById("next-btn");
const resultadoEl = document.getElementById("result");
const scoreEl = document.getElementById("score");
const areaDiscursivaEl = document.getElementById("discursiva-area");
const textoDiscursivoEl = document.getElementById("texto-discursivo");
const botaoLimparEl = document.getElementById("limpar-btn");
const botaoEnviarDiscursivaEl = document.getElementById("enviar-discursiva-btn");

// Função para mostrar pergunta
function mostrarPergunta() {
  const atual = perguntas[indice];
  perguntaEl.innerHTML = `<h2>Questão ${indice + 1} de ${perguntas.length}</h2><p>${atual.texto}</p>`;

  if (atual.tipo === "multipla") {
    mostrarMultiplaEscolha(atual);
  } else if (atual.tipo === "discursiva") {
    mostrarDiscursiva(atual);
  }

  resultadoEl.classList.add("hidden");
  scoreEl.textContent = "";
  
  // Lê a pergunta automaticamente se TTS estiver ativo
  if (ttsAtivo) {
    lerTexto(atual.texto);
  }
}

// Função para questões de múltipla escolha
function mostrarMultiplaEscolha(pergunta) {
  opcoesEl.innerHTML = "";
  areaDiscursivaEl.classList.add("hidden");
  
  pergunta.opcoes.forEach((opcao, i) => {
    const btn = document.createElement("div");
    btn.className = "option";
    btn.textContent = opcao;
    btn.onclick = () => selecionarMultipla(i, btn, pergunta.correta);
    
    // Adiciona atributo para melhor detecção pelo eye tracking
    btn.setAttribute('data-opcao-index', i);
    btn.setAttribute('data-tipo', 'multipla-escolha');
    
    opcoesEl.appendChild(btn);
  });
  
  // Lê as opções se TTS estiver ativo
  if (ttsAtivo) {
    setTimeout(() => {
      const textoOpcoes = pergunta.opcoes.map((op, i) => `Opção ${i + 1}: ${op}`).join('. ');
      lerTexto(textoOpcoes);
    }, 1000);
  }
}

// Função para questões discursivas
function mostrarDiscursiva(pergunta) {
  opcoesEl.innerHTML = "";
  areaDiscursivaEl.classList.remove("hidden");
  respostaDiscursiva = [];
  textoDiscursivoEl.textContent = "";
  
  pergunta.frasesProntas.forEach((frase, index) => {
    const btn = document.createElement("div");
    btn.className = "frase-option";
    btn.textContent = frase;
    btn.onclick = () => adicionarFrase(frase);
    
    // Adiciona atributo para melhor detecção pelo eye tracking
    btn.setAttribute('data-frase-index', index);
    btn.setAttribute('data-tipo', 'frase-discursiva');
    
    opcoesEl.appendChild(btn);
  });
  
  botaoEl.classList.add("hidden");
  
  // Lê as frases prontas se TTS estiver ativo
  if (ttsAtivo) {
    setTimeout(() => {
      lerTexto("Selecione as frases para compor sua resposta. Total de " + pergunta.frasesProntas.length + " frases disponíveis.");
    }, 1000);
  }
}

// Selecionar resposta de múltipla escolha
function selecionarMultipla(i, botaoClicado, correta) {
  // Remove seleção anterior
  document.querySelectorAll(".option").forEach(btn => {
    btn.classList.remove("selected", "correto", "errado");
  });
  
  // Marca botão selecionado
  botaoClicado.classList.add("selected");
  
  // Feedback visual
  if (i === correta) {
    pontuacao++;
    botaoClicado.classList.add("correto");
    scoreEl.textContent = "✅ Resposta correta!";
    scoreEl.style.color = "#4caf50";
    
    // Lê feedback se TTS estiver ativo
    if (ttsAtivo) {
      lerTexto("Correto!");
    }
  } else {
    botaoClicado.classList.add("errado");
    scoreEl.textContent = "❌ Resposta incorreta!";
    scoreEl.style.color = "#f44336";
    
    // Lê feedback se TTS estiver ativo
    if (ttsAtivo) {
      lerTexto("Incorreto. A resposta correta é mostrada em verde.");
    }
    
    // Mostra resposta correta
    const opcoes = document.querySelectorAll(".option");
    opcoes[correta].classList.add("correto");
  }

  resultadoEl.classList.remove("hidden");
  botaoEl.classList.remove("hidden");
  
  // Lê texto do botão "Próxima Pergunta" se TTS estiver ativo
  if (ttsAtivo) {
    setTimeout(() => {
      lerTexto("Clique em próxima pergunta para continuar.");
    }, 1500);
  }
}

// Adicionar frase à resposta discursiva
function adicionarFrase(frase) {
  respostaDiscursiva.push(frase);
  atualizarTextoDiscursivo();
  
  // Feedback visual
  scoreEl.textContent = "✅ Frase adicionada!";
  scoreEl.style.color = "#4caf50";
  resultadoEl.classList.remove("hidden");
  
  // Lê a frase adicionada se TTS estiver ativo
  if (ttsAtivo) {
    lerTexto("Frase adicionada: " + frase);
  }
  
  setTimeout(() => {
    resultadoEl.classList.add("hidden");
  }, 1000);
}

// Atualizar área de texto discursivo
function atualizarTextoDiscursivo() {
  textoDiscursivoEl.textContent = respostaDiscursiva.join(". ") + (respostaDiscursiva.length > 0 ? "." : "");
}

// Limpar resposta discursiva
botaoLimparEl.onclick = () => {
  respostaDiscursiva = [];
  textoDiscursivoEl.textContent = "";
  scoreEl.textContent = "🗑️ Resposta limpa!";
  scoreEl.style.color = "#ff9800";
  resultadoEl.classList.remove("hidden");
  
  // Lê feedback se TTS estiver ativo
  if (ttsAtivo) {
    lerTexto("Resposta limpa.");
  }
  
  setTimeout(() => {
    resultadoEl.classList.add("hidden");
  }, 1000);
};

// Enviar resposta discursiva
botaoEnviarDiscursivaEl.onclick = () => {
  if (respostaDiscursiva.length === 0) {
    scoreEl.textContent = "⚠️ Selecione pelo menos uma frase!";
    scoreEl.style.color = "#ff9800";
    resultadoEl.classList.remove("hidden");
    
    // Lê aviso se TTS estiver ativo
    if (ttsAtivo) {
      lerTexto("Atenção: Selecione pelo menos uma frase antes de enviar.");
    }
    return;
  }
  
  scoreEl.textContent = "✅ Resposta enviada com sucesso!";
  scoreEl.style.color = "#4caf50";
  resultadoEl.classList.remove("hidden");
  botaoEl.classList.remove("hidden");
  
  // Lê confirmação e próxima ação se TTS estiver ativo
  if (ttsAtivo) {
    lerTexto("Resposta enviada com sucesso. Clique em próxima pergunta para continuar.");
  }
  
  // Desabilita botões de frase
  document.querySelectorAll(".frase-option").forEach(btn => {
    btn.style.opacity = "0.5";
    btn.style.pointerEvents = "none";
  });
};
 
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
  
  const totalMultipla = perguntasMultipla.length;
  const porcentagem = Math.round((pontuacao / totalMultipla) * 100);
  
  scoreEl.innerHTML = `
    <h2>🎉 Prova Finalizada!</h2>
    <div class="resultado-final">
      <p><strong>Questões de múltipla escolha:</strong></p>
      <p class="pontuacao-destaque">Você acertou ${pontuacao} de ${totalMultipla} questões</p>
      <p class="porcentagem">Sua nota: ${porcentagem}%</p>
      <p><strong>Questões discursivas respondidas:</strong> ${perguntasDiscursivas.length}</p>
    </div>
    <button onclick="reiniciarProva()" class="reiniciar-btn">🔄 Refazer Prova</button>
  `;
  scoreEl.style.color = "#2c3e50";
  
  // Lê resultado final se TTS estiver ativo
  if (ttsAtivo) {
    setTimeout(() => {
      lerTexto(`Prova finalizada! Você acertou ${pontuacao} de ${totalMultipla} questões. Sua nota é ${porcentagem} por cento. ${perguntasDiscursivas.length} questões discursivas foram respondidas.`);
    }, 500);
  }
}

// Reiniciar prova
function reiniciarProva() {
  indice = 0;
  pontuacao = 0;
  respostaDiscursiva = [];
  document.getElementById("quiz-container").classList.remove("hidden");
  resultadoEl.classList.add("hidden");
  mostrarPergunta();
  botaoEl.classList.add("hidden");
  
  // Lê instrução se TTS estiver ativo
  if (ttsAtivo) {
    setTimeout(() => {
      lerTexto("Prova reiniciada. Primeira questão.");
    }, 500);
  }
}

// ========================================
// FUNÇÕES PREPARADAS PARA FUTURAS IMPLEMENTAÇÕES
// ========================================

/**
 * Função para ativar leitura automática de texto (Text-to-Speech)
 * Usa Web Speech API para ler texto em voz alta
 */
function ativarLeituraAutomatica(texto) {
  const btn = document.getElementById("btn-tts");
  const statusEl = btn.querySelector(".status");
  
  // Verifica se o navegador suporta Speech Synthesis
  if (!('speechSynthesis' in window)) {
    alert("❌ Seu navegador não suporta Text-to-Speech.\n\nTente usar Chrome, Edge ou Firefox atualizado.");
    return;
  }
  
  // Toggle do recurso
  ttsAtivo = !ttsAtivo;
  
  if (ttsAtivo) {
    btn.classList.add("ativo");
    statusEl.textContent = "Ativo";
    
    // Para qualquer fala em andamento
    window.speechSynthesis.cancel();
    
    // Lê a pergunta atual
    const perguntaAtual = document.getElementById("question-container").textContent;
    lerTexto("Leitura automática ativada. " + perguntaAtual);
    
    console.log("✅ TTS Ativado");
  } else {
    btn.classList.remove("ativo");
    statusEl.textContent = "Em breve";
    window.speechSynthesis.cancel();
    console.log("❌ TTS Desativado");
  }
}

/**
 * Função auxiliar para ler texto usando Speech Synthesis
 */
function lerTexto(texto) {
  if (!ttsAtivo || !texto) return;
  
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(texto);
  utterance.lang = 'pt-BR';
  utterance.rate = 0.9; // Velocidade um pouco mais lenta
  utterance.pitch = 1;
  utterance.volume = 1;
  
  window.speechSynthesis.speak(utterance);
}

/**
 * Função para simular olhar (modo apresentação/demonstração)
 * Cria cursor simulado que segue o mouse
 */
function simularOlhar() {
  const btn = document.getElementById("btn-simular-olhar");
  const statusEl = btn.querySelector(".status");
  
  // Toggle do recurso
  simularOlharAtivo = !simularOlharAtivo;
  
  if (simularOlharAtivo) {
    btn.classList.add("ativo");
    statusEl.textContent = "Ativo";
    
    // Cria cursor de simulação
    criarCursorSimulado();
    
    // Adiciona event listener para mouse
    document.addEventListener('mousemove', handleSimularOlhar);
    
    if (ttsAtivo) lerTexto("Modo simulação ativado. Mantenha o cursor sobre os botões por 2 segundos para selecioná-los.");
    
    console.log("✅ Simulação de Olhar Ativado");
  } else {
    btn.classList.remove("ativo");
    statusEl.textContent = "Em breve";
    
    // Remove cursor de simulação
    const cursor = document.getElementById("cursor-simulado");
    if (cursor) cursor.remove();
    
    // Remove event listener
    document.removeEventListener('mousemove', handleSimularOlhar);
    
    // Limpa timeout se houver
    if (gazeTimeout) {
      clearTimeout(gazeTimeout);
      gazeTimeout = null;
    }
    
    console.log("❌ Simulação de Olhar Desativado");
  }
}

/**
 * Cria elemento visual do cursor simulado
 */
function criarCursorSimulado() {
  // Remove cursor anterior se existir
  const cursorAntigo = document.getElementById("cursor-simulado");
  if (cursorAntigo) cursorAntigo.remove();
  
  const cursor = document.createElement("div");
  cursor.id = "cursor-simulado";
  cursor.style.cssText = `
    position: fixed;
    width: 30px;
    height: 30px;
    border: 3px solid #667eea;
    border-radius: 50%;
    pointer-events: none;
    z-index: 9999;
    transition: transform 0.1s ease;
    background: rgba(102, 126, 234, 0.2);
    box-shadow: 0 0 15px rgba(102, 126, 234, 0.5);
  `;
  
  document.body.appendChild(cursor);
}

/**
 * Handler para movimento do mouse no modo simulação
 */
let elementoOlhado = null;
let tempoOlhando = 0;

function handleSimularOlhar(e) {
  const cursor = document.getElementById("cursor-simulado");
  if (!cursor) return;
  
  // Atualiza posição do cursor
  cursor.style.left = (e.clientX - 15) + 'px';
  cursor.style.top = (e.clientY - 15) + 'px';
  
  // Detecta elemento sob o cursor
  detectarElementoOlhado(e.clientX, e.clientY);
}

/**
 * Detectar elemento sendo olhado (versão para simulação)
 */
let dwellTime = 2000; // 2 segundos de olhar fixo
let elementoOlhadoSimulacao = null;
let startTimeSimulacao = 0;

function detectarElementoOlhado(x, y) {
  // Se eye tracking de alta precisão estiver ativo, usa a função precisa
  if (eyeTrackingAtivo) {
    detectarElementoOlhadoPreciso(x, y);
    return;
  }
  
  // Versão simplificada para modo simulação
  const elementos = document.querySelectorAll('.option, .frase-option, .btn-primario, .btn-secundario, .btn-proximo');
  
  let encontrado = null;
  
  elementos.forEach(el => {
    const rect = el.getBoundingClientRect();
    
    if (x >= rect.left && x <= rect.right && 
        y >= rect.top && y <= rect.bottom) {
      encontrado = el;
    }
  });
  
  if (encontrado && encontrado === elementoOlhadoSimulacao) {
    const elapsed = Date.now() - startTimeSimulacao;
    encontrado.style.boxShadow = `0 0 ${Math.min(30, elapsed / 50)}px rgba(102, 126, 234, 0.8)`;
    
    if (elapsed >= dwellTime) {
      encontrado.click();
      elementoOlhadoSimulacao = null;
      startTimeSimulacao = 0;
      encontrado.style.boxShadow = '';
      
      encontrado.style.transform = 'scale(0.95)';
      setTimeout(() => {
        encontrado.style.transform = '';
      }, 200);
    }
  } else if (encontrado) {
    if (elementoOlhadoSimulacao) {
      elementoOlhadoSimulacao.style.boxShadow = '';
    }
    elementoOlhadoSimulacao = encontrado;
    startTimeSimulacao = Date.now();
  } else {
    if (elementoOlhadoSimulacao) {
      elementoOlhadoSimulacao.style.boxShadow = '';
    }
    elementoOlhadoSimulacao = null;
    startTimeSimulacao = 0;
  }
}

// Aguarda carregamento do DOM antes de iniciar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializar);
} else {
  inicializar();
}

function inicializar() {
  // Inicia o quiz
  mostrarPergunta();
  botaoEl.classList.add("hidden");
  
  console.log("✅ Sistema inicializado com sucesso");
}