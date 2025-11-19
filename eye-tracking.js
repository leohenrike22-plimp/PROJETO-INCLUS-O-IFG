/*
 * MÓDULO DE EYE TRACKING
 * 
 * Sistema avançado de rastreamento ocular usando WebGazer.js
 * Permite controle total da interface apenas com o olhar
 * 
 * Funcionalidades:
 * - Calibração automática com 9 pontos
 * - Suavização multi-camada (Kalman + média móvel ponderada)
 * - Detecção de fixação com dwell time configurável
 * - Modal de configuração passo a passo
 * - Feedback visual progressivo
 * - Integração com Text-to-Speech
 */

// ========================================
// VARIÁVEIS GLOBAIS DE ESTADO
// ========================================

// Controle de amostras para suavização
let amostrasPosicao = [];
let ultimaPosicaoEstavel = null;
let ultimaPosicaoSuavizada = null;

// Controle de detecção de elementos
let elementoAtual = null;
let startTime = 0;

// 🆕 Compensação de movimento da cabeça
let posicaoNarizReferencia = null;
let historicoNariz = [];
let ultimaPosicaoCompensada = null;

// ========================================
// FUNÇÃO PRINCIPAL DE ATIVAÇÃO
// ========================================

/**
 * Ativa/desativa o Eye Tracking
 * Mostra modal de configuração na primeira ativação
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
  
  console.log("🚀 Iniciando Eye Tracking com detecção aprimorada...");
  
  // Limpa amostras anteriores
  amostrasPosicao = [];
  ultimaPosicaoEstavel = null;
  ultimaPosicaoSuavizada = null;
  
  // Configuração avançada do WebGazer com ALTA RESOLUÇÃO
  webgazer.params.showVideo = true;
  webgazer.params.showFaceOverlay = true;
  webgazer.params.showFaceFeedbackBox = true;
  webgazer.params.imgWidth = 320;      // ⬆️ Aumenta resolução (padrão: 160)
  webgazer.params.imgHeight = 240;     // ⬆️ Aumenta resolução (padrão: 120)
  
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
         .saveDataAcrossSessions(true)    // Salva calibração entre sessões
         .begin();
  
  webgazer.showVideoPreview(true)
         .showPredictionPoints(true)
         .applyKalmanFilter(eyeTrackingConfig.filtroKalman);
  
  // Fecha o modal e inicia processo de calibração
  fecharModalEyeTracking();
  
  // Posiciona preview e customiza ponto vermelho com MELHOR VISUALIZAÇÃO
  setTimeout(() => {
    const video = document.getElementById('webgazerVideoFeed');
    if (video) {
      video.style.position = 'fixed';
      video.style.top = '10px';           // Movido para o topo
      video.style.right = '10px';
      video.style.width = '320px';        // Maior para melhor visualização
      video.style.height = '240px';
      video.style.zIndex = '9996';
      video.style.border = '3px solid #4caf50';
      video.style.borderRadius = '10px';
      video.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
      console.log("✅ Preview da câmera ativado (320x240)");
    }
    
    const overlay = document.getElementById('webgazerFaceOverlay');
    if (overlay) {
      overlay.style.display = 'block';
      overlay.style.position = 'fixed';
      overlay.style.top = '10px';
      overlay.style.right = '10px';
      overlay.style.width = '320px';
      overlay.style.height = '240px';
      overlay.style.zIndex = '9997';
      console.log("✅ Overlay de detecção facial ativado");
    }
    
    const canvas = document.getElementById('webgazerGazeDot');
    if (canvas) {
      canvas.style.transition = 'left 0.15s ease-out, top 0.15s ease-out';
      canvas.style.filter = 'blur(1px)';
      canvas.style.zIndex = '99999'; // Garante que o ponto fique por cima de tudo
      canvas.style.pointerEvents = 'none'; // Não interfere com cliques
    }
    
    const style = document.createElement('style');
    style.textContent = `
      #webgazerGazeDot {
        background: rgba(255, 0, 0, 0.7) !important;
        border-radius: 50% !important;
        box-shadow: 0 0 15px rgba(255, 0, 0, 0.6), 0 0 30px rgba(255, 0, 0, 0.3) !important;
        width: 18px !important;
        height: 18px !important;
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;
        z-index: 99999 !important;
        pointer-events: none !important;
        position: fixed !important;
        display: block !important;
        visibility: visible !important;
      }
      .webgazer_dot {
        transition: all 0.1s ease-out !important;
      }
    `;
    document.head.appendChild(style);
    
    // Cria indicador de status de detecção
    criarIndicadorDeteccao();
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
  
  // Torna os botões do modal detectáveis pelo eye tracking
  setTimeout(() => {
    const btnVoltar = document.getElementById('btn-voltar-modal');
    const btnAvancar = document.getElementById('btn-avancar-modal');
    const btnIniciar = document.getElementById('btn-iniciar-eye-tracking');
    const btnFechar = document.querySelector('#modal-eye-tracking .fechar-modal');
    
    // Adiciona classe para identificação pelo eye tracking
    if (btnVoltar) btnVoltar.classList.add('eye-tracking-target');
    if (btnAvancar) btnAvancar.classList.add('eye-tracking-target');
    if (btnIniciar) btnIniciar.classList.add('eye-tracking-target');
    if (btnFechar) btnFechar.classList.add('eye-tracking-target');
  }, 100);
  
  // Lê instrução se TTS estiver ativo
  if (ttsAtivo) {
    setTimeout(() => {
      lerTexto("Configuração do Eye Tracking. Passo 1 de 5: Permitir acesso à câmera. Você pode navegar este modal olhando para os botões por 2 segundos.");
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
  
  // Limpa estado de eye tracking do modal
  if (elementoAtual) {
    elementoAtual.style.boxShadow = '';
    const progressoDiv = elementoAtual.querySelector('.progresso-olhar');
    if (progressoDiv) progressoDiv.remove();
    elementoAtual = null;
    startTime = 0;
  }
}

/**
 * Avança para o próximo passo do modal
 */
function avancarPassoModal() {
  if (passoAtualModal < totalPassosModal) {
    passoAtualModal++;
    atualizarPassoModal();
    
    // Limpa estado de eye tracking
    if (elementoAtual) {
      elementoAtual.style.boxShadow = '';
      const progressoDiv = elementoAtual.querySelector('.progresso-olhar');
      if (progressoDiv) progressoDiv.remove();
      elementoAtual = null;
      startTime = 0;
    }
    
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
    
    // Limpa estado de eye tracking
    if (elementoAtual) {
      elementoAtual.style.boxShadow = '';
      const progressoDiv = elementoAtual.querySelector('.progresso-olhar');
      if (progressoDiv) progressoDiv.remove();
      elementoAtual = null;
      startTime = 0;
    }
    
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

// ========================================
// FUNÇÕES DE CALIBRAÇÃO
// ========================================

/**
 * Mostra instruções visuais de calibração
 */
function mostrarInstrucoesCalibracao() {
  const instrucoes = document.createElement('div');
  instrucoes.id = 'calibracao-instrucoes';
  instrucoes.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    padding: 20px 30px;
    border-radius: 15px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.3);
    z-index: 9997;
    text-align: center;
    max-width: 500px;
    border: 4px solid #667eea;
  `;
  
  instrucoes.innerHTML = `
    <h2 style="color: #667eea; margin-bottom: 15px;">🎯 Calibração em Andamento</h2>
    <p style="font-size: 1.1em; line-height: 1.6; color: #333;">
      <strong>Sistema Híbrido de Calibração:</strong><br><br>
      1️⃣ Passe o mouse 🖱️ sobre cada bolinha<br>
      2️⃣ O sistema registra automaticamente (laranja → verde)<br>
      3️⃣ Quando ficar verde, clique para confirmar<br>
      4️⃣ Total de 27 bolinhas (9 posições × 3 ciclos)<br>
      5️⃣ Quanto mais devagar passar, melhor!
    </p>
    <div style="margin-top: 20px; padding: 15px; background: #f0f0f0; border-radius: 10px;">
      <strong style="color: #667eea;">⏱️ Sem limite de tempo - vá no seu ritmo!</strong>
      <div style="margin-top: 10px;">
        <div style="width: 100%; height: 6px; background: #e0e0e0; border-radius: 3px;">
          <div id="barra-progresso" style="width: 0%; height: 100%; background: #667eea; border-radius: 3px; transition: width 0.1s;"></div>
        </div>
      </div>
    </div>
    <div style="margin-top: 15px; font-size: 0.9em; color: #666;">
      💡 🔴 Vermelho = Aguardando | 🟠 Laranja = Registrando | 🟢 Verde = Pronto
    </div>
  `;
  
  document.body.appendChild(instrucoes);
  
  // Remove a barra de progresso automática - agora é controlada pelos cliques
  // A barra é atualizada dentro da função criarPontosCalibracao
  
  // Adiciona pontos de calibração clicáveis
  criarPontosCalibracao();
}

/**
 * Cria pontos de calibração nas bordas da tela
 * Exibe UMA BOLINHA POR VEZ - usuário deve clicar para avançar
 * 3 CICLOS completos = 27 bolinhas total (9 × 3)
 */
function criarPontosCalibracao() {
  const posicoes = [
    { top: '10%', left: '10%', nome: 'Superior Esquerdo' },
    { top: '10%', left: '50%', nome: 'Superior Centro' },
    { top: '10%', left: '90%', nome: 'Superior Direito' },
    { top: '50%', left: '10%', nome: 'Centro Esquerdo' },
    { top: '50%', left: '50%', nome: 'Centro' },
    { top: '50%', left: '90%', nome: 'Centro Direito' },
    { top: '90%', left: '10%', nome: 'Inferior Esquerdo' },
    { top: '90%', left: '50%', nome: 'Inferior Centro' },
    { top: '90%', left: '90%', nome: 'Inferior Direito' }
  ];
  
  const CICLOS = 3;
  const TOTAL_PONTOS = posicoes.length * CICLOS; // 27 pontos
  let pontoAtualIndex = 0;
  let pontoAtualElemento = null;
  let indicadorAtual = null;
  
  // Cria indicador de progresso
  const indicadorProgresso = document.createElement('div');
  indicadorProgresso.id = 'indicador-progresso';
  indicadorProgresso.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(102, 126, 234, 0.95);
    color: white;
    padding: 15px 25px;
    border-radius: 10px;
    font-size: 1.2em;
    font-weight: bold;
    z-index: 10001;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    text-align: center;
    min-width: 200px;
  `;
  document.body.appendChild(indicadorProgresso);
  
  // Função para mostrar próxima bolinha
  function mostrarProximaBolinha() {
    console.log(`🎯 mostrarProximaBolinha() chamada - índice atual: ${pontoAtualIndex}`);
    
    // Remove elementos anteriores se existirem
    if (pontoAtualElemento) {
      pontoAtualElemento.remove();
      console.log('🗑️ Ponto anterior removido');
    }
    if (indicadorAtual) {
      indicadorAtual.remove();
      console.log('🗑️ Indicador anterior removido');
    }
    
    // Verifica se completou todos os pontos
    if (pontoAtualIndex >= TOTAL_PONTOS) {
      console.log('✅ Todos os pontos completados!');
      indicadorProgresso.remove();
      
      // Atualiza barra de progresso do modal para 100%
      const barraModal = document.getElementById('barra-progresso');
      if (barraModal) {
        barraModal.style.width = '100%';
      }
      
      // Remove modal de instruções após completar
      setTimeout(() => {
        const instrucoesModal = document.getElementById('calibracao-instrucoes');
        if (instrucoesModal) instrucoesModal.remove();
      }, 1000);
      
      // Feedback de conclusão
      if (ttsAtivo) {
        lerTexto("Calibração concluída com sucesso!");
      }
      
      return;
    }
    
    // Calcula ciclo e posição atuais
    const cicloAtual = Math.floor(pontoAtualIndex / posicoes.length) + 1;
    const posicaoIndex = pontoAtualIndex % posicoes.length;
    const pos = posicoes[posicaoIndex];
    
    console.log(`📍 Posição calculada: índice=${posicaoIndex}, nome="${pos.nome}", top=${pos.top}, left=${pos.left}`);
    
    // Atualiza indicador de progresso
    indicadorProgresso.innerHTML = `
      🔄 Ciclo ${cicloAtual} de ${CICLOS}<br>
      <span style="font-size: 0.85em;">Ponto ${pontoAtualIndex + 1} de ${TOTAL_PONTOS}</span><br>
      <div style="margin-top: 8px; width: 100%; height: 5px; background: rgba(255,255,255,0.3); border-radius: 3px;">
        <div style="width: ${(pontoAtualIndex / TOTAL_PONTOS * 100)}%; height: 100%; background: white; border-radius: 3px; transition: width 0.3s;"></div>
      </div>
    `;
    
    // Feedback de voz no início
    if (ttsAtivo && pontoAtualIndex === 0) {
      lerTexto(`Iniciando calibração. Clique em cada bolinha vermelha. Total: ${TOTAL_PONTOS} pontos.`);
    }
    
    // Cria indicador de direção
    indicadorAtual = document.createElement('div');
    indicadorAtual.className = 'indicador-olhar';
    indicadorAtual.style.cssText = `
      position: fixed;
      top: ${pos.top};
      left: ${pos.left};
      transform: translate(-50%, calc(-50% - 70px));
      background: rgba(255, 255, 255, 0.95);
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 1em;
      font-weight: bold;
      color: #ff4444;
      z-index: 9999;
      pointer-events: none;
      box-shadow: 0 3px 15px rgba(0,0,0,0.3);
      animation: aparecer 0.4s ease;
    `;
    indicadorAtual.innerHTML = `
      👁️ ${pos.nome}<br>
      <span style="font-size: 0.75em; color: #667eea;">Passe o mouse aqui 🖱️</span>
    `;
    document.body.appendChild(indicadorAtual);
    console.log('✅ Indicador criado e adicionado ao body');
    
    // Cria ponto de calibração
    pontoAtualElemento = document.createElement('div');
    pontoAtualElemento.className = 'ponto-calibracao';
    pontoAtualElemento.style.cssText = `
      position: fixed;
      top: ${pos.top};
      left: ${pos.left};
      transform: translate(-50%, -50%);
      width: 40px;
      height: 40px;
      background: #ff4444;
      border: 6px solid white;
      border-radius: 50%;
      cursor: pointer;
      z-index: 9998;
      animation: pulsar 1.2s infinite;
      box-shadow: 0 0 30px rgba(255, 68, 68, 0.9);
      transition: all 0.3s ease;
    `;
    
    // Adiciona número do ponto no centro
    pontoAtualElemento.innerHTML = `
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-size: 0.8em;
        font-weight: bold;
        text-shadow: 0 1px 3px rgba(0,0,0,0.5);
      ">${pontoAtualIndex + 1}</div>
    `;
    
    // ========================================
    // 🎯 SISTEMA HÍBRIDO: Mouse como referência de olhar
    // ========================================
    
    let mouseOverTime = 0;
    let mouseOverInterval = null;
    let autoCalibracoes = 0;
    const MAX_AUTO_CALIBRACOES = 5; // Registra 5 vezes quando mouse passar por cima
    
    // Evento quando mouse entra na bolinha
    pontoAtualElemento.onmouseenter = function() {
      console.log(`🖱️ Mouse sobre ponto ${pontoAtualIndex + 1} - Iniciando registro automático`);
      
      mouseOverTime = 0;
      
      // Visual feedback que está registrando
      this.style.background = '#ff9800';
      this.style.transform = 'translate(-50%, -50%) scale(1.15)';
      this.style.boxShadow = '0 0 35px rgba(255, 152, 0, 1)';
      
      // Obtém posição central da bolinha
      const rect = this.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Registra posição automaticamente a cada 200ms
      mouseOverInterval = setInterval(() => {
        mouseOverTime += 200;
        
        // Registra no WebGazer usando a posição da bolinha
        if (typeof webgazer !== 'undefined' && webgazer.isReady()) {
          webgazer.recordScreenPosition(centerX, centerY, 'move');
          autoCalibracoes++;
          console.log(`📍 Auto-calibração ${autoCalibracoes}/${MAX_AUTO_CALIBRACOES}: (${Math.round(centerX)}, ${Math.round(centerY)})`);
          
          // Feedback visual de progresso
          const progressoPct = (autoCalibracoes / MAX_AUTO_CALIBRACOES) * 100;
          this.style.background = `linear-gradient(to right, #4caf50 ${progressoPct}%, #ff9800 ${progressoPct}%)`;
          
          // Após N registros, permite clique
          if (autoCalibracoes >= MAX_AUTO_CALIBRACOES) {
            clearInterval(mouseOverInterval);
            this.style.background = '#4caf50';
            this.style.transform = 'translate(-50%, -50%) scale(1.3)';
            this.style.boxShadow = '0 0 45px rgba(76, 175, 80, 1)';
            
            console.log(`✅ Ponto ${pontoAtualIndex + 1} calibrado automaticamente!`);
            
            if (ttsAtivo) {
              lerTexto("Ponto calibrado! Clique para confirmar.");
            }
          }
        }
      }, 200); // Registra a cada 200ms
    };
    
    // Evento quando mouse sai da bolinha
    pontoAtualElemento.onmouseleave = function() {
      clearInterval(mouseOverInterval);
      mouseOverTime = 0;
      autoCalibracoes = 0;
      
      // Volta ao estado normal se não completou
      if (autoCalibracoes < MAX_AUTO_CALIBRACOES) {
        this.style.background = '#ff4444';
        this.style.transform = 'translate(-50%, -50%)';
        this.style.boxShadow = '0 0 30px rgba(255, 68, 68, 0.9)';
      }
      
      console.log(`🖱️ Mouse saiu do ponto ${pontoAtualIndex + 1}`);
    };
    
    // Evento de clique (confirma e avança)
    pontoAtualElemento.onclick = function() {
      console.log(`🔴 Clique registrado no ponto ${pontoAtualIndex + 1} de ${TOTAL_PONTOS}`);
      
      clearInterval(mouseOverInterval);
      
      // Se não completou as auto-calibrações, registra mais algumas no clique
      if (autoCalibracoes < MAX_AUTO_CALIBRACOES) {
        const rect = this.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Registra 3 vezes ao clicar
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            if (typeof webgazer !== 'undefined' && webgazer.isReady()) {
              webgazer.recordScreenPosition(centerX, centerY, 'click');
              console.log(`🎯 Registro no clique ${i + 1}/3: (${Math.round(centerX)}, ${Math.round(centerY)})`);
            }
          }, i * 50);
        }
      }
      
      // Animação de sucesso
      this.style.background = '#4caf50';
      this.style.transform = 'translate(-50%, -50%) scale(1.5)';
      this.style.boxShadow = '0 0 40px rgba(76, 175, 80, 1)';
      
      // Atualiza barra de progresso do modal
      const barraModal = document.getElementById('barra-progresso');
      if (barraModal) {
        const novoProgresso = ((pontoAtualIndex + 1) / TOTAL_PONTOS * 100);
        barraModal.style.width = novoProgresso + '%';
        console.log(`📊 Barra de progresso atualizada: ${novoProgresso.toFixed(1)}%`);
      }
      
      // Feedback sonoro
      if (ttsAtivo) {
        lerTexto("Clique");
      }
      
      // Avança para próximo ponto
      pontoAtualIndex++;
      console.log(`➡️ Avançando para índice ${pontoAtualIndex}`);
      
      setTimeout(() => {
        mostrarProximaBolinha();
      }, 400);
    };
    
    document.body.appendChild(pontoAtualElemento);
    
    // Adiciona efeito hover
    pontoAtualElemento.onmouseenter = function() {
      this.style.transform = 'translate(-50%, -50%) scale(1.2)';
    };
    
    pontoAtualElemento.onmouseleave = function() {
      this.style.transform = 'translate(-50%, -50%)';
    };
    
    console.log('✅ Ponto de calibração criado e adicionado ao body com evento de clique registrado');
  }
  
  // Inicia mostrando a primeira bolinha
  mostrarProximaBolinha();
  
  // Adiciona animações CSS
  if (!document.getElementById('animacao-calibracao')) {
    const style = document.createElement('style');
    style.id = 'animacao-calibracao';
    style.textContent = `
      @keyframes pulsar {
        0%, 100% { 
          transform: translate(-50%, -50%) scale(1); 
          box-shadow: 0 0 30px rgba(255, 68, 68, 0.9);
        }
        50% { 
          transform: translate(-50%, -50%) scale(1.3); 
          box-shadow: 0 0 50px rgba(255, 68, 68, 1);
        }
      }
      
      @keyframes aparecer {
        from { 
          opacity: 0; 
          transform: translate(-50%, calc(-50% - 80px)) scale(0.8);
        }
        to { 
          opacity: 1; 
          transform: translate(-50%, calc(-50% - 70px)) scale(1);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// ========================================
// PROCESSAMENTO DE POSIÇÃO DO OLHAR
// ========================================

/**
 * Processa posição do olhar com filtro de estabilidade
 * Versão otimizada com múltiplas camadas de suavização
 */
function processarPosicaoOlhar(x, y) {
  // 🆕 COMPENSA MOVIMENTO DA CABEÇA
  const posicaoCompensada = compensarMovimentoCabeca(x, y);
  x = posicaoCompensada.x;
  y = posicaoCompensada.y;
  
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

// ========================================
// DETECÇÃO DE ELEMENTOS
// ========================================

/**
 * Detectar elemento sendo olhado com alta precisão
 * Versão melhorada com controle de estabilidade e suporte a todos os elementos interativos
 */
function detectarElementoOlhadoPreciso(x, y) {
  // Elementos clicáveis - incluindo botões do modal
  const elementos = document.querySelectorAll('.option, .frase-option, .btn-primario, .btn-secundario, .btn-proximo, .reiniciar-btn, .btn-recurso, .eye-tracking-target, .fechar-modal, #btn-voltar-modal, #btn-avancar-modal, #btn-iniciar-eye-tracking');
  
  let encontrado = null;
  let distanciaMinima = Infinity;
  
  elementos.forEach(el => {
    // Ignora elementos não visíveis ou desabilitados
    if (el.style.pointerEvents === 'none' || 
        el.style.display === 'none' || 
        el.style.visibility === 'hidden' ||
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
      
      // Verifica se é um botão do modal
      const isModalButton = encontrado.classList.contains('eye-tracking-target') || 
                            encontrado.id === 'btn-voltar-modal' ||
                            encontrado.id === 'btn-avancar-modal' ||
                            encontrado.id === 'btn-iniciar-eye-tracking';
      
      encontrado.click();
      
      // Feedback visual de ativação
      encontrado.style.boxShadow = '0 0 40px rgba(76, 175, 80, 0.8)';
      encontrado.style.transform = 'scale(0.95)';
      
      // Efeito visual adicional
      const originalBg = encontrado.style.background;
      encontrado.style.background = 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)';
      
      // Remove progresso
      if (progressoDiv) progressoDiv.remove();
      
      // Som de feedback via TTS (mais curto para botões do modal)
      if (ttsAtivo && !isModalButton) {
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
    
    // Define novo elemento
    elementoAtual = encontrado;
    startTime = Date.now();
  } else {
    // Não está olhando para nenhum elemento
    if (elementoAtual) {
      elementoAtual.style.boxShadow = '';
      elementoAtual.style.borderColor = '';
      const progressoDiv = elementoAtual.querySelector('.progresso-olhar');
      if (progressoDiv) progressoDiv.remove();
      elementoAtual = null;
      startTime = 0;
    }
  }
}

// ========================================
// FUNÇÕES DE DIAGNÓSTICO E MONITORAMENTO
// ========================================

/**
 * Cria indicador visual de status de detecção em tempo real
 */
function criarIndicadorDeteccao() {
  // Remove indicador anterior se existir
  const indicadorAntigo = document.getElementById('indicador-deteccao');
  if (indicadorAntigo) indicadorAntigo.remove();
  
  const indicador = document.createElement('div');
  indicador.id = 'indicador-deteccao';
  indicador.style.cssText = `
    position: fixed;
    top: 260px;
    right: 10px;
    padding: 15px 20px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    z-index: 9996;
    font-family: 'Segoe UI', sans-serif;
    min-width: 300px;
    border: 3px solid #667eea;
  `;
  
  indicador.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
      <div id="status-led" style="
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #ff5722;
        box-shadow: 0 0 10px rgba(255, 87, 34, 0.5);
      "></div>
      <strong id="status-texto" style="font-size: 1.1em;">Aguardando detecção...</strong>
    </div>
    <div style="font-size: 0.9em; color: #555; line-height: 1.8;">
      <div id="info-rosto">👤 Rosto: <span style="color: #ff5722;">Não detectado</span></div>
      <div id="info-olhos">👁️ Olhos: <span style="color: #999;">Aguardando</span></div>
      <div id="info-precisao">🎯 Posição: <span style="color: #999;">--</span></div>
    </div>
    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd; display: flex; gap: 8px;">
      <button onclick="verificarDeteccaoFacial()" style="
        flex: 1;
        padding: 8px;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
        font-size: 0.9em;
      ">🔍 Diagnosticar</button>
      <button onclick="resetarReferenciaNariz()" style="
        flex: 1;
        padding: 8px;
        background: #f39c12;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
        font-size: 0.9em;
      ">🔄 Resetar Ref</button>
    </div>
  `;
  
  document.body.appendChild(indicador);
  
  // Adiciona animação CSS para o LED
  const style = document.createElement('style');
  style.id = 'animacao-led';
  style.textContent = `
    @keyframes pulse-led {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.1); }
    }
  `;
  if (!document.getElementById('animacao-led')) {
    document.head.appendChild(style);
  }
  
  console.log("✅ Indicador de detecção criado");
  
  // Atualiza status em tempo real
  setInterval(() => {
    if (!eyeTrackingAtivo) return;
    
    webgazer.getCurrentPrediction().then(prediction => {
      const led = document.getElementById('status-led');
      const texto = document.getElementById('status-texto');
      const infoRosto = document.getElementById('info-rosto');
      const infoOlhos = document.getElementById('info-olhos');
      const infoPrecisao = document.getElementById('info-precisao');
      
      if (!led || !texto) return;
      
      if (prediction && prediction.x && prediction.y) {
        // ✅ DETECÇÃO OK
        led.style.background = '#4caf50';
        led.style.boxShadow = '0 0 15px rgba(76, 175, 80, 0.8)';
        led.style.animation = 'pulse-led 2s infinite';
        texto.textContent = '✅ Detecção ativa';
        texto.style.color = '#4caf50';
        infoRosto.innerHTML = '👤 Rosto: <span style="color: #4caf50; font-weight: bold;">Detectado ✓</span>';
        infoOlhos.innerHTML = '👁️ Olhos: <span style="color: #4caf50; font-weight: bold;">Rastreando ✓</span>';
        infoPrecisao.innerHTML = `🎯 Posição: <span style="color: #667eea; font-weight: bold;">(${Math.round(prediction.x)}, ${Math.round(prediction.y)})</span>`;
      } else {
        // ❌ FALHA NA DETECÇÃO
        led.style.background = '#ff5722';
        led.style.boxShadow = '0 0 15px rgba(255, 87, 34, 0.8)';
        led.style.animation = 'pulse-led 1s infinite';
        texto.textContent = '⚠️ Sem detecção';
        texto.style.color = '#ff5722';
        infoRosto.innerHTML = '👤 Rosto: <span style="color: #ff5722; font-weight: bold;">Não detectado</span>';
        infoOlhos.innerHTML = '👁️ Olhos: <span style="color: #999;">Aguardando</span>';
        infoPrecisao.innerHTML = '🎯 Posição: <span style="color: #999;">--</span>';
      }
    }).catch(err => {
      console.error("Erro ao obter predição:", err);
    });
  }, 500); // Atualiza a cada 0.5 segundos
}

/**
 * Função de diagnóstico para verificar detecção facial
 */
function verificarDeteccaoFacial() {
  if (!eyeTrackingAtivo) {
    console.warn("⚠️ Eye Tracking não está ativo");
    alert("⚠️ Ative o Eye Tracking primeiro!");
    return;
  }
  
  console.log("🔍 ========== DIAGNÓSTICO WEBGAZER ==========");
  
  // Verifica elementos do WebGazer
  const video = document.getElementById('webgazerVideoFeed');
  const canvas = document.getElementById('webgazerFaceOverlay');
  const gazeDot = document.getElementById('webgazerGazeDot');
  
  console.log("📹 Vídeo encontrado:", !!video);
  console.log("🎨 Canvas overlay encontrado:", !!canvas);
  console.log("🔴 Ponto vermelho encontrado:", !!gazeDot);
  console.log("✅ WebGazer pronto:", webgazer.isReady());
  
  // Testa predição manual
  webgazer.getCurrentPrediction()
    .then(prediction => {
      if (prediction && prediction.x && prediction.y) {
        console.log("✅ DETECÇÃO OK!");
        console.log("📍 Posição atual:", prediction);
        
        if (ttsAtivo) {
          lerTexto("Detecção funcionando corretamente!");
        }
        
        alert(`✅ DETECÇÃO OK!\n\nPosição: (${Math.round(prediction.x)}, ${Math.round(prediction.y)})\n\nSeu rosto está sendo detectado corretamente!`);
      } else {
        console.error("❌ FALHA NA DETECÇÃO - Nenhuma predição retornada");
        mostrarSugestoesDeCorrecao();
      }
    })
    .catch(err => {
      console.error("❌ ERRO:", err);
      mostrarSugestoesDeCorrecao();
    });
  
  console.log("🔍 =========================================");
}

/**
 * Mostra sugestões para melhorar detecção
 */
function mostrarSugestoesDeCorrecao() {
  const mensagem = `
🔧 PROBLEMAS DE DETECÇÃO DETECTADOS

Tente as seguintes soluções:

1. 🔆 ILUMINAÇÃO
   ✓ Use luz frontal no rosto
   ✗ Evite luz de trás (contraluz)
   ✗ Evite sombras fortes

2. 📏 POSICIONAMENTO
   ✓ Centralize o rosto na tela
   ✓ Distância: 50-70cm da câmera
   ✓ Olhe direto para a tela

3. 👓 OBSTÁCULOS
   ✗ Remova óculos escuros
   ✗ Tire o cabelo do rosto
   ✗ Evite chapéus/bonés

4. 🎥 CÂMERA
   ✓ Limpe a lente da webcam
   ✓ Verifique se está focada
   ✓ Teste em outros apps

5. 🔄 REINICIE
   ✓ Desative e reative o Eye Tracking
   ✓ Recarregue a página
   ✓ Feche outras abas usando webcam
  `;
  
  console.log(mensagem);
  
  alert("⚠️ PROBLEMAS DE DETECÇÃO\n\nVerifique:\n• Iluminação adequada\n• Rosto centralizado\n• Câmera limpa\n• Sem óculos escuros\n\nVeja o console (F12) para mais detalhes.");
  
  if (ttsAtivo) {
    lerTexto("Problemas na detecção. Verifique iluminação, posicionamento e se a câmera está limpa e desobstruída.");
  }
}

/**
 * Reseta a referência do nariz para recalibrar o sistema de compensação
 * Útil quando o usuário muda de posição
 */
function resetarReferenciaNariz() {
  posicaoNarizReferencia = null;
  historicoNariz = [];
  ultimaPosicaoCompensada = null;
  
  console.log("🔄 Referência do nariz resetada - aguardando nova captura");
  
  if (ttsAtivo) {
    lerTexto("Referência resetada. Mantenha o rosto centralizado por alguns segundos.");
  }
  
  // Atualiza visualmente o indicador
  const statusTexto = document.getElementById('status-texto');
  if (statusTexto) {
    statusTexto.textContent = '🔄 Recalibrando referência...';
    statusTexto.style.color = '#f39c12';
    
    setTimeout(() => {
      statusTexto.textContent = '✅ Detecção ativa';
      statusTexto.style.color = '#4caf50';
    }, 3000);
  }
}

/**
 * Obtém a posição do centro do nariz do TFFacemesh
 * Usa como ponto de referência estático para compensar movimento da cabeça
 */
function obterPosicaoNariz() {
  try {
    // Acessa o tracker do WebGazer (TFFacemesh)
    const tracker = webgazer.getTracker();
    
    if (!tracker || !tracker.predictionReady) {
      return null;
    }
    
    // TFFacemesh retorna landmarks faciais
    // O índice 1 é aproximadamente o centro do nariz
    const faces = tracker.getPositions();
    
    if (!faces || faces.length === 0) {
      return null;
    }
    
    const face = faces[0];
    
    // Pega múltiplos pontos do nariz para mais precisão
    // Índices: 1 (centro), 168 (ponta), 6 (entre olhos)
    if (face && face.positions) {
      const narizCentro = face.positions[1];
      const narizPonta = face.positions[168];
      const entreOlhos = face.positions[6];
      
      if (narizCentro && narizPonta && entreOlhos) {
        // Média dos 3 pontos para ponto de referência mais estável
        return {
          x: (narizCentro[0] + narizPonta[0] + entreOlhos[0]) / 3,
          y: (narizCentro[1] + narizPonta[1] + entreOlhos[1]) / 3
        };
      }
    }
    
    return null;
  } catch (error) {
    console.warn("Erro ao obter posição do nariz:", error);
    return null;
  }
}

/**
 * Compensa movimento da cabeça usando o nariz como referência
 */
function compensarMovimentoCabeca(olharX, olharY) {
  const posicaoNarizAtual = obterPosicaoNariz();
  
  if (!posicaoNarizAtual) {
    // Sem detecção do nariz, retorna posição original
    return { x: olharX, y: olharY };
  }
  
  // Adiciona ao histórico
  historicoNariz.push({
    ...posicaoNarizAtual,
    timestamp: Date.now()
  });
  
  // Mantém apenas últimos 2 segundos
  const agora = Date.now();
  historicoNariz = historicoNariz.filter(h => (agora - h.timestamp) < 2000);
  
  // Estabelece referência na primeira detecção
  if (!posicaoNarizReferencia && historicoNariz.length >= 10) {
    // Média das primeiras posições como referência
    const somaX = historicoNariz.reduce((sum, h) => sum + h.x, 0);
    const somaY = historicoNariz.reduce((sum, h) => sum + h.y, 0);
    
    posicaoNarizReferencia = {
      x: somaX / historicoNariz.length,
      y: somaY / historicoNariz.length
    };
    
    console.log("📍 Referência do nariz estabelecida:", posicaoNarizReferencia);
  }
  
  if (!posicaoNarizReferencia) {
    // Ainda estabelecendo referência
    return { x: olharX, y: olharY };
  }
  
  // Calcula deslocamento da cabeça
  const deslocamentoX = posicaoNarizAtual.x - posicaoNarizReferencia.x;
  const deslocamentoY = posicaoNarizAtual.y - posicaoNarizReferencia.y;
  
  // Fator de compensação (ajuste conforme necessário)
  const FATOR_COMPENSACAO = 2.5; // Multiplica o deslocamento do nariz
  
  // Aplica compensação INVERTIDA (se nariz move direita, olhar precisa compensar)
  const olharCompensadoX = olharX - (deslocamentoX * FATOR_COMPENSACAO);
  const olharCompensadoY = olharY - (deslocamentoY * FATOR_COMPENSACAO);
  
  // Log de debug (opcional)
  if (eyeTrackingConfig.mostrarDebug) {
    console.log(`👃 Nariz: (${Math.round(posicaoNarizAtual.x)}, ${Math.round(posicaoNarizAtual.y)})`);
    console.log(`📏 Deslocamento: (${Math.round(deslocamentoX)}, ${Math.round(deslocamentoY)})`);
    console.log(`👁️ Original: (${Math.round(olharX)}, ${Math.round(olharY)})`);
    console.log(`✅ Compensado: (${Math.round(olharCompensadoX)}, ${Math.round(olharCompensadoY)})`);
  }
  
  return {
    x: olharCompensadoX,
    y: olharCompensadoY
  };
}
