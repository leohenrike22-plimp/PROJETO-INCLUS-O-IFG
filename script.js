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
  calibracaoTempo: 8000,        // Tempo de calibração inicial (8 segundos - aumentado)
  precisaoMinima: 0.7,          // Precisão mínima aceitável (0-1)
  filtroKalman: true,           // Usar filtro Kalman para suavização
  intervaloRegressao: 1500,     // Intervalo para regressão (ms)
  mostrarDebug: false,          // Mostrar informações de debug
  suavizacaoExtra: true,        // Suavização extra do ponto de predição
  tamanhoJanela: 15,            // Tamanho da janela para média móvel
  fatorSuavizacao: 0.3          // Fator de suavização exponencial (0-1, menor = mais suave)
};

// Controle de amostras para eye tracking
let amostrasPosicao = [];
let ultimaPosicaoEstavel = null;
let ultimaPosicaoSuavizada = null;

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
 * Função para ativar Eye Tracking usando WebGazer.js
 * Versão com alta precisão e calibração melhorada
 */
function ativarEyeTracking() {
  const btn = document.getElementById("btn-eye-tracking");
  const statusEl = btn.querySelector(".status");
  
  // Verifica se WebGazer está disponível
  if (typeof webgazer === 'undefined') {
    alert("❌ WebGazer.js não está carregado.\n\nVerifique a conexão com a internet e recarregue a página.");
    return;
  }
  
  // Se já está ativo, desativa
  if (eyeTrackingAtivo) {
    btn.classList.remove("ativo");
    statusEl.textContent = "Em breve";
    btn.style.borderColor = '';
    
    webgazer.end();
    amostrasPosicao = [];
    ultimaPosicaoEstavel = null;
    ultimaPosicaoSuavizada = null;
    
    console.log("❌ Eye Tracking Desativado");
    return;
  }
  
  // Mostra modal de configuração
  mostrarModalEyeTracking();
}

/**
 * Inicia Eye Tracking após configuração no modal
 */
function iniciarEyeTracking() {
  const btn = document.getElementById("btn-eye-tracking");
  const statusEl = btn.querySelector(".status");
  
  eyeTrackingAtivo = true;
  btn.classList.add("ativo");
  statusEl.textContent = "Inicializando...";
  
  // Limpa amostras anteriores
  amostrasPosicao = [];
  ultimaPosicaoEstavel = null;
  ultimaPosicaoSuavizada = null;
  
  // Configuração avançada do WebGazer
  webgazer.params.showVideo = true;
  webgazer.params.showFaceOverlay = true;
  webgazer.params.showFaceFeedbackBox = true;
  
  // Inicia WebGazer com configurações otimizadas
  webgazer.setRegression('ridge')
         .setTracker('TFFacemesh')
         .setGazeListener((data, clock) => {
            if (data == null) return;
            
            let x = data.x;
            let y = data.y;
            
            if (eyeTrackingConfig.suavizacaoExtra) {
              if (ultimaPosicaoSuavizada) {
                x = ultimaPosicaoSuavizada.x + (x - ultimaPosicaoSuavizada.x) * eyeTrackingConfig.fatorSuavizacao;
                y = ultimaPosicaoSuavizada.y + (y - ultimaPosicaoSuavizada.y) * eyeTrackingConfig.fatorSuavizacao;
              }
              ultimaPosicaoSuavizada = { x, y };
            }
            
            processarPosicaoOlhar(x, y);
         })
         .begin();
  
  webgazer.showVideoPreview(true)
         .showPredictionPoints(true)
         .applyKalmanFilter(eyeTrackingConfig.filtroKalman);
  
  // Fecha o modal e inicia processo de calibração
  fecharModalEyeTracking();
  
  // Posiciona preview e customiza ponto vermelho
  setTimeout(() => {
    const video = document.getElementById('webgazerVideoFeed');
    if (video) {
      video.style.position = 'fixed';
      video.style.bottom = '10px';
      video.style.right = '10px';
      video.style.width = '200px';
      video.style.height = '150px';
      video.style.zIndex = '9999';
      video.style.border = '3px solid #667eea';
      video.style.borderRadius = '10px';
    }
    
    const canvas = document.getElementById('webgazerGazeDot');
    if (canvas) {
      canvas.style.transition = 'left 0.15s ease-out, top 0.15s ease-out';
      canvas.style.filter = 'blur(1px)';
    }
    
    const style = document.createElement('style');
    style.textContent = `
      #webgazerGazeDot {
        background: rgba(255, 0, 0, 0.5) !important;
        border-radius: 50% !important;
        box-shadow: 0 0 10px rgba(255, 0, 0, 0.3) !important;
        width: 15px !important;
        height: 15px !important;
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      .webgazer_dot {
        transition: all 0.1s ease-out !important;
      }
    `;
    document.head.appendChild(style);
  }, 500);
  
  // Mostra instruções de calibração
  statusEl.textContent = "Calibrando...";
  mostrarInstrucoesCalibracao();
  
  // Solicita regressão periódica
  const intervaloRegressao = setInterval(() => {
    if (eyeTrackingAtivo) {
      webgazer.applyKalmanFilter(true);
      const canvas = document.getElementById('webgazerGazeDot');
      if (canvas) {
        canvas.style.transition = 'left 0.15s ease-out, top 0.15s ease-out';
      }
    } else {
      clearInterval(intervaloRegressao);
    }
  }, eyeTrackingConfig.intervaloRegressao);
  
  // Após calibração
  setTimeout(() => {
    statusEl.textContent = "Ativo ✓";
    btn.style.borderColor = '#4caf50';
    
    if (ttsAtivo) {
      lerTexto("Eye tracking calibrado e ativo. Olhe fixamente para os botões por 2 segundos para selecioná-los.");
    }
    
  }, eyeTrackingConfig.calibracaoTempo);
  
  console.log("✅ Eye Tracking Ativado com Alta Precisão");
}
    
    // Configuração avançada do WebGazer
    webgazer.params.showVideo = true;
    webgazer.params.showFaceOverlay = true;
    webgazer.params.showFaceFeedbackBox = true;
    
    // Inicia WebGazer com configurações otimizadas
    webgazer.setRegression('ridge') // Regressão Ridge para maior precisão
           .setTracker('TFFacemesh')  // TFFacemesh é mais preciso que clmtrackr
           .setGazeListener((data, clock) => {
              if (data == null) return;
              
              let x = data.x;
              let y = data.y;
              
              // Aplica suavização exponencial para reduzir tremores
              if (eyeTrackingConfig.suavizacaoExtra) {
                if (ultimaPosicaoSuavizada) {
                  x = ultimaPosicaoSuavizada.x + (x - ultimaPosicaoSuavizada.x) * eyeTrackingConfig.fatorSuavizacao;
                  y = ultimaPosicaoSuavizada.y + (y - ultimaPosicaoSuavizada.y) * eyeTrackingConfig.fatorSuavizacao;
                }
                ultimaPosicaoSuavizada = { x, y };
              }
              
              // Processa posição com filtro de estabilidade
              processarPosicaoOlhar(x, y);
           })
           .begin();
    
    // Configurações adicionais de precisão
    webgazer.showVideoPreview(true)
           .showPredictionPoints(true)
           .applyKalmanFilter(eyeTrackingConfig.filtroKalman);
    
    // Posiciona o preview no canto inferior direito
    setTimeout(() => {
      const video = document.getElementById('webgazerVideoFeed');
      if (video) {
        video.style.position = 'fixed';
        video.style.bottom = '10px';
        video.style.right = '10px';
        video.style.width = '200px';
        video.style.height = '150px';
        video.style.zIndex = '9999';
        video.style.border = '3px solid #667eea';
        video.style.borderRadius = '10px';
      }
      
      // Suaviza o ponto vermelho de predição
      const canvas = document.getElementById('webgazerGazeDot');
      if (canvas) {
        canvas.style.transition = 'left 0.15s ease-out, top 0.15s ease-out';
        canvas.style.filter = 'blur(1px)'; // Leve blur para suavizar
      }
      
      // Customiza o estilo dos pontos de predição para serem menos chamativos
      const style = document.createElement('style');
      style.textContent = `
        #webgazerGazeDot {
          background: rgba(255, 0, 0, 0.5) !important;
          border-radius: 50% !important;
          box-shadow: 0 0 10px rgba(255, 0, 0, 0.3) !important;
          width: 15px !important;
          height: 15px !important;
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .webgazer_dot {
          transition: all 0.1s ease-out !important;
        }
      `;
      document.head.appendChild(style);
    }, 500);
    
    // Período de calibração com instruções
    mostrarInstrucoesCalibracao();
    
    setTimeout(() => {
      statusEl.textContent = "Calibrando...";
    }, 1000);
    
    // Solicita regressão periódica para manter precisão
    const intervaloRegressao = setInterval(() => {
      if (eyeTrackingAtivo) {
        webgazer.applyKalmanFilter(true);
        
        // Re-aplica suavização ao ponto vermelho
        const canvas = document.getElementById('webgazerGazeDot');
        if (canvas) {
          canvas.style.transition = 'left 0.15s ease-out, top 0.15s ease-out';
        }
      } else {
        clearInterval(intervaloRegressao);
      }
    }, eyeTrackingConfig.intervaloRegressao);
    
    setTimeout(() => {
      statusEl.textContent = "Ativo ✓";
      btn.style.borderColor = '#4caf50';
      
      if (ttsAtivo) {
        lerTexto("Eye tracking calibrado. Olhe fixamente para os botões por 1.5 segundos para selecioná-los. Mantenha a cabeça estável.");
      }
      
      alert("✅ Eye Tracking Ativo\n\n📌 Dicas para melhor precisão:\n\n1. Mantenha iluminação adequada no rosto\n2. Posicione-se a 50-70cm da tela\n3. Evite movimentos bruscos de cabeça\n4. Olhe fixamente para o alvo por 1.5 segundos\n5. Clique nos cantos da tela para calibrar melhor\n\n💡 O ponto vermelho foi suavizado para melhor experiência visual");
      
    }, eyeTrackingConfig.calibracaoTempo);
    
    console.log("✅ Eye Tracking Ativado com Alta Precisão");
}

// ========================================
// FUNÇÕES DO MODAL DE CONFIGURAÇÃO
// ========================================

/**
 * Mostra o modal de configuração do Eye Tracking
 */
function mostrarModalEyeTracking() {
  const modal = document.getElementById('modal-eye-tracking');
  modal.classList.remove('hidden');
  passoAtualModal = 1;
  atualizarPassoModal();
  
  // Lê instrução se TTS estiver ativo
  if (ttsAtivo) {
    setTimeout(() => {
      lerTexto("Configuração do Eye Tracking. Passo 1 de 5: Permitir acesso à câmera.");
    }, 500);
  }
}

/**
 * Fecha o modal de configuração
 */
function fecharModalEyeTracking() {
  const modal = document.getElementById('modal-eye-tracking');
  modal.classList.add('hidden');
  passoAtualModal = 1;
  atualizarPassoModal();
}

/**
 * Avança para o próximo passo do modal
 */
function avancarPassoModal() {
  if (passoAtualModal < totalPassosModal) {
    passoAtualModal++;
    atualizarPassoModal();
    
    // Lê título do passo se TTS estiver ativo
    if (ttsAtivo) {
      const stepPanel = document.getElementById(`step-${passoAtualModal}`);
      const titulo = stepPanel.querySelector('h3').textContent;
      lerTexto(titulo);
    }
  }
}

/**
 * Volta para o passo anterior do modal
 */
function voltarPassoModal() {
  if (passoAtualModal > 1) {
    passoAtualModal--;
    atualizarPassoModal();
    
    // Lê título do passo se TTS estiver ativo
    if (ttsAtivo) {
      const stepPanel = document.getElementById(`step-${passoAtualModal}`);
      const titulo = stepPanel.querySelector('h3').textContent;
      lerTexto(titulo);
    }
  }
}

/**
 * Atualiza a interface do modal conforme o passo atual
 */
function atualizarPassoModal() {
  // Atualiza indicadores de progresso
  for (let i = 1; i <= totalPassosModal; i++) {
    const stepIndicator = document.getElementById(`step-indicator-${i}`);
    const stepPanel = document.getElementById(`step-${i}`);
    
    if (i < passoAtualModal) {
      stepIndicator.classList.add('completed');
      stepIndicator.classList.remove('active');
    } else if (i === passoAtualModal) {
      stepIndicator.classList.add('active');
      stepIndicator.classList.remove('completed');
    } else {
      stepIndicator.classList.remove('active', 'completed');
    }
    
    // Mostra/esconde painéis
    if (i === passoAtualModal) {
      stepPanel.classList.add('active');
    } else {
      stepPanel.classList.remove('active');
    }
  }
  
  // Atualiza botões do rodapé
  const btnVoltar = document.getElementById('btn-voltar-modal');
  const btnAvancar = document.getElementById('btn-avancar-modal');
  const btnIniciar = document.getElementById('btn-iniciar-modal');
  
  // Botão voltar
  if (passoAtualModal === 1) {
    btnVoltar.style.visibility = 'hidden';
  } else {
    btnVoltar.style.visibility = 'visible';
  }
  
  // Botões avançar/iniciar
  if (passoAtualModal === totalPassosModal) {
    btnAvancar.classList.add('hidden');
    btnIniciar.classList.remove('hidden');
  } else {
    btnAvancar.classList.remove('hidden');
    btnIniciar.classList.add('hidden');
  }
}

/**
 * Mostra instruções visuais de calibração
 */
function mostrarInstrucoesCalibracao() {
  const instrucoes = document.createElement('div');
  instrucoes.id = 'calibracao-instrucoes';
  instrucoes.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 30px;
    border-radius: 15px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.3);
    z-index: 10000;
    text-align: center;
    max-width: 500px;
    border: 4px solid #667eea;
  `;
  
  instrucoes.innerHTML = `
    <h2 style="color: #667eea; margin-bottom: 15px;">🎯 Calibração em Andamento</h2>
    <p style="font-size: 1.1em; line-height: 1.6; color: #333;">
      <strong>Siga os pontos vermelhos:</strong><br><br>
      1️⃣ Olhe diretamente para cada ponto<br>
      2️⃣ Clique no centro de cada ponto<br>
      3️⃣ Mantenha a cabeça imóvel<br>
      4️⃣ Clique em pelo menos 5 pontos
    </p>
    <div style="margin-top: 20px; padding: 15px; background: #f0f0f0; border-radius: 10px;">
      <strong style="color: #667eea;">Tempo de calibração: 8 segundos</strong>
      <div style="margin-top: 10px;">
        <div style="width: 100%; height: 6px; background: #e0e0e0; border-radius: 3px;">
          <div id="barra-progresso" style="width: 0%; height: 100%; background: #667eea; border-radius: 3px; transition: width 0.1s;"></div>
        </div>
      </div>
    </div>
    <div style="margin-top: 15px; font-size: 0.9em; color: #666;">
      💡 Quanto mais pontos você clicar, melhor será a precisão
    </div>
  `;
  
  document.body.appendChild(instrucoes);
  
  // Barra de progresso
  let progresso = 0;
  const intervalo = setInterval(() => {
    progresso += 1.25; // 100 / 80 steps = 1.25 per step (8 segundos)
    const barra = document.getElementById('barra-progresso');
    if (barra) {
      barra.style.width = progresso + '%';
    }
    
    if (progresso >= 100) {
      clearInterval(intervalo);
      setTimeout(() => {
        if (instrucoes.parentNode) {
          instrucoes.remove();
        }
      }, 500);
    }
  }, eyeTrackingConfig.calibracaoTempo / 80);
  
  // Adiciona pontos de calibração clicáveis
  criarPontosCalibracao();
}

/**
 * Cria pontos de calibração nas bordas da tela
 */
function criarPontosCalibracao() {
  const posicoes = [
    { top: '10%', left: '10%' },
    { top: '10%', left: '50%' },
    { top: '10%', left: '90%' },
    { top: '50%', left: '10%' },
    { top: '50%', left: '50%' },
    { top: '50%', left: '90%' },
    { top: '90%', left: '10%' },
    { top: '90%', left: '50%' },
    { top: '90%', left: '90%' }
  ];
  
  posicoes.forEach((pos, index) => {
    setTimeout(() => {
      const ponto = document.createElement('div');
      ponto.className = 'ponto-calibracao';
      ponto.style.cssText = `
        position: fixed;
        top: ${pos.top};
        left: ${pos.left};
        transform: translate(-50%, -50%);
        width: 25px;
        height: 25px;
        background: #667eea;
        border: 4px solid white;
        border-radius: 50%;
        cursor: pointer;
        z-index: 9998;
        animation: pulsar 1s infinite;
        box-shadow: 0 0 20px rgba(102, 126, 234, 0.6);
      `;
      
      ponto.onclick = function() {
        this.style.background = '#4caf50';
        this.style.transform = 'translate(-50%, -50%) scale(1.3)';
        
        // Feedback sonoro
        if (ttsAtivo) {
          lerTexto("Ponto");
        }
        
        setTimeout(() => this.remove(), 400);
      };
      
      document.body.appendChild(ponto);
      
      // Remove pontos automaticamente após 4 segundos (mais tempo)
      setTimeout(() => {
        if (ponto.parentNode) ponto.remove();
      }, 4000);
    }, index * 600); // Intervalo maior entre pontos (600ms)
  });
  
  // Adiciona animação CSS
  if (!document.getElementById('animacao-calibracao')) {
    const style = document.createElement('style');
    style.id = 'animacao-calibracao';
    style.textContent = `
      @keyframes pulsar {
        0%, 100% { transform: translate(-50%, -50%) scale(1); }
        50% { transform: translate(-50%, -50%) scale(1.3); }
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Processa posição do olhar com filtro de estabilidade
 * Versão otimizada com múltiplas camadas de suavização
 */
function processarPosicaoOlhar(x, y) {
  // Adiciona amostra ao histórico
  amostrasPosicao.push({ x, y, timestamp: Date.now() });
  
  // Mantém apenas amostras recentes (último 1.5 segundos)
  const agora = Date.now();
  amostrasPosicao = amostrasPosicao.filter(
    amostra => (agora - amostra.timestamp) < 1500
  );
  
  // Precisa de amostras suficientes
  if (amostrasPosicao.length < eyeTrackingConfig.amostrasNecessarias) {
    return;
  }
  
  // Aplica média móvel ponderada (dá mais peso às amostras recentes)
  const tamanhoJanela = Math.min(eyeTrackingConfig.tamanhoJanela, amostrasPosicao.length);
  const ultimasAmostras = amostrasPosicao.slice(-tamanhoJanela);
  
  let somaX = 0;
  let somaY = 0;
  let somaPesos = 0;
  
  ultimasAmostras.forEach((amostra, index) => {
    // Peso linear crescente (amostras mais recentes têm mais peso)
    const peso = (index + 1) / tamanhoJanela;
    somaX += amostra.x * peso;
    somaY += amostra.y * peso;
    somaPesos += peso;
  });
  
  const mediaX = somaX / somaPesos;
  const mediaY = somaY / somaPesos;
  
  // Calcula desvio padrão para verificar estabilidade
  const varianciaX = ultimasAmostras.reduce((sum, a) => sum + Math.pow(a.x - mediaX, 2), 0) / ultimasAmostras.length;
  const varianciaY = ultimasAmostras.reduce((sum, a) => sum + Math.pow(a.y - mediaY, 2), 0) / ultimasAmostras.length;
  const desvioX = Math.sqrt(varianciaX);
  const desvioY = Math.sqrt(varianciaY);
  
  // Verifica se o olhar está estável (baixo desvio)
  const estaEstavel = desvioX < eyeTrackingConfig.toleranciaMovimento && 
                       desvioY < eyeTrackingConfig.toleranciaMovimento;
  
  if (estaEstavel) {
    // Olhar estável, pode detectar elemento
    detectarElementoOlhadoPreciso(mediaX, mediaY);
    
    // Atualiza posição estável
    ultimaPosicaoEstavel = { x: mediaX, y: mediaY };
    
    // Debug opcional
    if (eyeTrackingConfig.mostrarDebug) {
      console.log(`Olhar estável em: (${Math.round(mediaX)}, ${Math.round(mediaY)}) | Desvio: (${Math.round(desvioX)}, ${Math.round(desvioY)})`);
    }
  } else {
    // Movimento detectado, reseta elemento atual
    if (elementoAtual) {
      elementoAtual.style.boxShadow = '';
      const progressoDiv = elementoAtual.querySelector('.progresso-olhar');
      if (progressoDiv) progressoDiv.remove();
      elementoAtual = null;
      startTime = 0;
    }
  }
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
 * Detectar elemento sendo olhado com alta precisão
 * Versão melhorada com controle de estabilidade e suporte a todos os elementos interativos
 */
let elementoAtual = null;
let startTime = 0;

function detectarElementoOlhadoPreciso(x, y) {
  // Elementos clicáveis - incluindo todos os botões e opções
  const elementos = document.querySelectorAll('.option, .frase-option, .btn-primario, .btn-secundario, .btn-proximo, .reiniciar-btn, .btn-recurso');
  
  let encontrado = null;
  let distanciaMinima = Infinity;
  
  elementos.forEach(el => {
    // Ignora elementos não visíveis ou desabilitados
    if (el.style.pointerEvents === 'none' || 
        el.style.display === 'none' || 
        el.classList.contains('hidden')) {
      return;
    }
    
    const rect = el.getBoundingClientRect();
    
    // Expande área de detecção em 10px para facilitar seleção
    const margemExtra = 10;
    
    if (x >= rect.left - margemExtra && x <= rect.right + margemExtra && 
        y >= rect.top - margemExtra && y <= rect.bottom + margemExtra) {
      
      // Calcula distância do centro para priorizar elementos mais centralizados
      const centroX = rect.left + rect.width / 2;
      const centroY = rect.top + rect.height / 2;
      const distancia = Math.sqrt(Math.pow(x - centroX, 2) + Math.pow(y - centroY, 2));
      
      if (distancia < distanciaMinima) {
        distanciaMinima = distancia;
        encontrado = el;
      }
    }
  });
  
  if (encontrado && encontrado === elementoAtual) {
    // Continua olhando para o mesmo elemento
    const elapsed = Date.now() - startTime;
    const progresso = Math.min(1, elapsed / eyeTrackingConfig.dwellTime);
    
    // Feedback visual progressivo mais suave
    const intensidade = Math.floor(progresso * 255);
    const cor = `rgba(102, 126, 234, ${0.3 + progresso * 0.5})`;
    encontrado.style.boxShadow = `0 0 ${10 + progresso * 30}px ${cor}`;
    encontrado.style.borderColor = `rgb(102, 126, ${234 - intensidade * 0.5})`;
    
    // Indicador de progresso visual
    if (!encontrado.querySelector('.progresso-olhar')) {
      const progressoDiv = document.createElement('div');
      progressoDiv.className = 'progresso-olhar';
      progressoDiv.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        height: 4px;
        background: linear-gradient(90deg, #667eea, #4caf50);
        border-radius: 0 0 10px 10px;
        transition: width 0.1s linear;
        width: 0%;
        z-index: 10;
      `;
      encontrado.style.position = 'relative';
      encontrado.appendChild(progressoDiv);
    }
    
    const progressoDiv = encontrado.querySelector('.progresso-olhar');
    if (progressoDiv) {
      progressoDiv.style.width = (progresso * 100) + '%';
    }
    
    // Lê o texto do elemento quando começa a olhar (apenas uma vez)
    if (ttsAtivo && elapsed > 300 && elapsed < 500) {
      const textoElemento = encontrado.textContent.trim();
      if (textoElemento && !textoElemento.includes('Em breve')) {
        lerTexto(textoElemento);
      }
    }
    
    if (elapsed >= eyeTrackingConfig.dwellTime) {
      // Aciona o clique após tempo de dwell
      encontrado.click();
      
      // Feedback visual de ativação
      encontrado.style.boxShadow = '0 0 40px rgba(76, 175, 80, 0.8)';
      encontrado.style.transform = 'scale(0.95)';
      
      // Efeito visual adicional
      const originalBg = encontrado.style.background;
      encontrado.style.background = 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)';
      
      // Remove progresso
      if (progressoDiv) progressoDiv.remove();
      
      // Som de feedback via TTS
      if (ttsAtivo) {
        window.speechSynthesis.cancel(); // Para leitura anterior
        lerTexto("Selecionado");
      }
      
      setTimeout(() => {
        encontrado.style.boxShadow = '';
        encontrado.style.transform = '';
        encontrado.style.borderColor = '';
        encontrado.style.background = originalBg;
      }, 400);
      
      // Reset
      elementoAtual = null;
      startTime = 0;
    }
  } else if (encontrado) {
    // Começou a olhar para um novo elemento
    if (elementoAtual) {
      // Limpa elemento anterior
      elementoAtual.style.boxShadow = '';
      elementoAtual.style.borderColor = '';
      const progressoAntigo = elementoAtual.querySelector('.progresso-olhar');
      if (progressoAntigo) progressoAntigo.remove();
    }
    
    elementoAtual = encontrado;
    startTime = Date.now();
    
    // Feedback inicial suave
    encontrado.style.transition = 'all 0.2s ease';
    encontrado.style.boxShadow = '0 0 10px rgba(102, 126, 234, 0.3)';
  } else {
    // Não está olhando para nenhum elemento clicável
    if (elementoAtual) {
      elementoAtual.style.boxShadow = '';
      elementoAtual.style.borderColor = '';
      const progressoDiv = elementoAtual.querySelector('.progresso-olhar');
      if (progressoDiv) progressoDiv.remove();
    }
    elementoAtual = null;
    startTime = 0;
  }
}

/**
 * Detectar elemento sendo olhado (versão para simulação)
 */
let dwellTime = 2000; // 2 segundos de olhar fixo

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
  
  if (encontrado && encontrado === elementoAtual) {
    const elapsed = Date.now() - startTime;
    encontrado.style.boxShadow = `0 0 ${Math.min(30, elapsed / 50)}px rgba(102, 126, 234, 0.8)`;
    
    if (elapsed >= dwellTime) {
      encontrado.click();
      elementoAtual = null;
      startTime = 0;
      encontrado.style.boxShadow = '';
      
      encontrado.style.transform = 'scale(0.95)';
      setTimeout(() => {
        encontrado.style.transform = '';
      }, 200);
    }
  } else if (encontrado) {
    if (elementoAtual) {
      elementoAtual.style.boxShadow = '';
    }
    elementoAtual = encontrado;
    startTime = Date.now();
  } else {
    if (elementoAtual) {
      elementoAtual.style.boxShadow = '';
    }
    elementoAtual = null;
    startTime = 0;
  }
}

// Inicia
mostrarPergunta();
botaoEl.classList.add("hidden");