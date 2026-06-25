export interface ControlField {
  id: string;
  type: 'slider' | 'button' | 'checkbox' | 'select';
  label: string;
  min?: number;
  max?: number;
  step?: number;
  value: any;
  options?: string[];
}

export interface Block {
  id: string;
  type: 'controls' | 'canvas' | 'chart' | 'markdown';
  title: string;
  fields?: ControlField[];
  jsCode?: string;
  xAxisKey?: string;
  yAxisKey?: string;
  content?: string;
}

export function compileBlocksToHtml(blocks: Block[]): string {
  // 1. Gerar os cards dos blocos
  let blocksHtml = '';

  blocks.forEach(block => {
    if (block.type === 'controls') {
      let fieldsHtml = '';
      (block.fields || []).forEach(f => {
        if (f.type === 'slider') {
          fieldsHtml += `
            <div class="flex flex-col gap-2 bg-slate-950 p-4 rounded-2xl border border-slate-900 hover:border-slate-800 transition-all duration-300">
              <div class="flex justify-between items-center">
                <label class="text-xs font-black tracking-widest text-slate-400 uppercase">${f.label}</label>
                <span id="val-${f.id}" class="text-sm font-mono font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">${f.value}</span>
              </div>
              <input 
                type="range" 
                id="control-${f.id}" 
                min="${f.min ?? 0}" 
                max="${f.max ?? 100}" 
                step="${f.step ?? 1}" 
                value="${f.value}"
                class="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
                oninput="updateState('${f.id}', this.value)"
              />
            </div>
          `;
        } else if (f.type === 'button') {
          fieldsHtml += `
            <button 
              id="control-${f.id}" 
              onclick="triggerButton('${f.id}', '${f.value}')"
              class="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white rounded-2xl font-black text-xs tracking-widest uppercase shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.98] transition-all duration-300 cursor-pointer border border-indigo-400/20"
            >
              ${f.label}
            </button>
          `;
        } else if (f.type === 'checkbox') {
          const checked = f.value === true || f.value === 'true' ? 'checked' : '';
          fieldsHtml += `
            <label class="flex items-center gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-900 hover:border-slate-800 transition-all duration-300 cursor-pointer">
              <input 
                type="checkbox" 
                id="control-${f.id}" 
                ${checked}
                onchange="updateState('${f.id}', this.checked)"
                class="w-5 h-5 bg-slate-800 rounded-lg border-slate-700 text-indigo-500 focus:ring-indigo-500 accent-indigo-500 cursor-pointer"
              />
              <span class="text-xs font-black tracking-widest text-slate-400 uppercase">${f.label}</span>
            </label>
          `;
        } else if (f.type === 'select') {
          let optionsHtml = '';
          (f.options || []).forEach(opt => {
            const selected = opt === f.value ? 'selected' : '';
            optionsHtml += `<option value="${opt}" ${selected} class="bg-slate-950 text-slate-200">${opt}</option>`;
          });
          fieldsHtml += `
            <div class="flex flex-col gap-2 bg-slate-950 p-4 rounded-2xl border border-slate-900 hover:border-slate-800 transition-all duration-300">
              <label class="text-xs font-black tracking-widest text-slate-400 uppercase">${f.label}</label>
              <select 
                id="control-${f.id}" 
                onchange="updateState('${f.id}', this.value)"
                class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 font-medium focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
              >
                ${optionsHtml}
              </select>
            </div>
          `;
        }
      });

      blocksHtml += `
        <div id="block-${block.id}" class="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
          <div class="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div class="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/50"></div>
            <h2 class="text-sm font-black tracking-widest uppercase text-slate-200">${block.title}</h2>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${fieldsHtml}
          </div>
        </div>
      `;
    } 
    else if (block.type === 'canvas') {
      blocksHtml += `
        <div id="block-${block.id}" class="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <div class="flex items-center gap-3">
              <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div>
              <h2 class="text-sm font-black tracking-widest uppercase text-slate-200">${block.title}</h2>
            </div>
          </div>
          <div class="relative w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-900 flex items-center justify-center shadow-inner">
            <canvas id="canvas-${block.id}" class="w-full h-full block bg-slate-950"></canvas>
          </div>
        </div>
      `;
    } 
    else if (block.type === 'chart') {
      blocksHtml += `
        <div id="block-${block.id}" class="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
          <div class="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div class="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-lg shadow-rose-500/50"></div>
            <h2 class="text-sm font-black tracking-widest uppercase text-slate-200">${block.title}</h2>
          </div>
          <div class="relative w-full aspect-[21/9] bg-slate-950 rounded-2xl p-4 overflow-hidden border border-slate-900">
            <canvas id="chart-canvas-${block.id}" class="w-full h-full"></canvas>
          </div>
        </div>
      `;
    } 
    else if (block.type === 'markdown') {
      blocksHtml += `
        <div id="block-${block.id}" class="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
          <div class="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div class="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50"></div>
            <h2 class="text-sm font-black tracking-widest uppercase text-slate-200">${block.title}</h2>
          </div>
          <div class="prose prose-invert prose-indigo max-w-none text-slate-300 text-sm leading-relaxed" id="md-content-${block.id}">
            <!-- Markdown content will render here -->
          </div>
        </div>
      `;
    }
  });

  // 2. Coletar os valores iniciais dos states dos controles
  const initialState: Record<string, any> = {};
  blocks.forEach(block => {
    if (block.type === 'controls' && block.fields) {
      block.fields.forEach(f => {
        initialState[f.id] = f.value;
      });
    }
  });

  // 3. Montar scripts específicos para os Canvas e Gráficos
  let initCanvasScripts = '';
  blocks.forEach(block => {
    if (block.type === 'canvas' && block.jsCode) {
      // Injeta o código do canvas associando ao canvas específico deste bloco
      initCanvasScripts += `
        (function() {
          const canvas = document.getElementById('canvas-${block.id}');
          const ctx = canvas.getContext('2d');
          
          // Função para redimensionar o canvas conforme sua escala real
          function resize() {
            const rect = canvas.parentNode.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
          }
          resize();
          window.addEventListener('resize', resize);
          
          // Lógica do código JS da simulação
          ${block.jsCode}
        })();
      `;
    }
    else if (block.type === 'chart') {
      initCanvasScripts += `
        (function() {
          const ctx = document.getElementById('chart-canvas-${block.id}').getContext('2d');
          const chart = new Chart(ctx, {
            type: 'line',
            data: {
              labels: [],
              datasets: [{
                label: '${block.title}',
                data: [],
                borderColor: '#f43f5e',
                borderWidth: 2,
                backgroundColor: 'rgba(244, 63, 94, 0.05)',
                fill: true,
                tension: 0.3,
                pointRadius: 0
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false }
              },
              scales: {
                x: {
                  type: 'linear',
                  position: 'bottom',
                  grid: { color: 'rgba(255, 255, 255, 0.05)' },
                  ticks: { color: '#94a3b8', font: { size: 9 } },
                  title: { display: true, text: '${block.xAxisKey || 'Tempo'}', color: '#94a3b8', font: { size: 9, weight: 'bold' } }
                },
                y: {
                  grid: { color: 'rgba(255, 255, 255, 0.05)' },
                  ticks: { color: '#94a3b8', font: { size: 9 } },
                  title: { display: true, text: '${block.yAxisKey || 'Valor'}', color: '#94a3b8', font: { size: 9, weight: 'bold' } }
                }
              }
            }
          });

          // Listener para atualizar o gráfico a partir dos eventos de dados
          window.addEventListener('sim-data-point', (e) => {
            const point = e.detail; // Espera { x: number, y: number }
            if (point && point.x !== undefined && point.y !== undefined) {
              chart.data.datasets[0].data.push({ x: point.x, y: point.y });
              // Limitar a 200 pontos para não travar
              if (chart.data.datasets[0].data.length > 200) {
                chart.data.datasets[0].data.shift();
              }
              chart.update('none'); // Update sem animação para melhor performance
            }
          });

          window.addEventListener('sim-state-change', (e) => {
            const state = e.detail;
            // Se reiniciar a simulação, limpar dados do gráfico
            if (state['start-btn'] === 'start' || state['fire-btn'] === 'fire') {
              chart.data.datasets[0].data = [];
              chart.update();
            }
          });
        })();
      `;
    }
    else if (block.type === 'markdown' && block.content) {
      initCanvasScripts += `
        document.getElementById('md-content-${block.id}').innerHTML = marked.parse(\`${block.content.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`);
      `;
    }
  });

  // 4. Montar o HTML completo com Tailwind, ChartJS e MarkedJS via CDN
  return `<!DOCTYPE html>
<html lang="pt-BR" class="h-full">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Laboratório SCAFFL</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Chart.js CDN -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <!-- Marked.js CDN -->
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  
  <style>
    /* Estilos Customizados de Barra de Rolagem */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: #0f172a;
    }
    ::-webkit-scrollbar-thumb {
      background: #1e293b;
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #334155;
    }
    body {
      background-color: #020617;
      color: #f8fafc;
      font-family: ui-sans-serif, system-ui, sans-serif;
    }
  </style>
</head>
<body class="h-full flex flex-col overflow-y-auto p-4 md:p-6 gap-6">

  <!-- Container de Grade de Blocos -->
  <div class="flex flex-col gap-6 max-w-5xl mx-auto w-full">
    ${blocksHtml}
  </div>

  <script>
    // Estado Reativo Global
    window.simState = ${JSON.stringify(initialState)};

    // Atualização de Estado
    function updateState(key, val) {
      // Converter para número se possível
      let parsedVal = val;
      if (val === 'true') parsedVal = true;
      else if (val === 'false') parsedVal = false;
      else if (!isNaN(val) && val !== '') parsedVal = parseFloat(val);

      window.simState[key] = parsedVal;
      
      // Atualizar valor textual visível no slider
      const elVal = document.getElementById('val-' + key);
      if (elVal) elVal.innerText = parsedVal;

      // Disparar evento reativo
      const event = new CustomEvent('sim-state-change', { detail: window.simState });
      window.dispatchEvent(event);
    }

    // Trigger de botões (enviam sinal de pulso rápido)
    function triggerButton(key, val) {
      window.simState[key] = val;
      
      const event = new CustomEvent('sim-state-change', { detail: window.simState });
      window.dispatchEvent(event);

      // Limpar o sinal do botão após 100ms para evitar loop infinito
      setTimeout(() => {
        window.simState[key] = null;
      }, 100);
    }

    // Função auxiliar que a simulação pode usar para enviar pontos ao gráfico
    window.sendDataToChart = function(x, y) {
      const event = new CustomEvent('sim-data-point', { detail: { x, y } });
      window.dispatchEvent(event);
    };

    // Inicialização assíncrona dos scripts injetados
    window.addEventListener('DOMContentLoaded', () => {
      // Dispara estado inicial para todos os listeners começarem alinhados
      setTimeout(() => {
        const event = new CustomEvent('sim-state-change', { detail: window.simState });
        window.dispatchEvent(event);
      }, 200);
    });
  </script>

  <!-- Scripts específicos dos Canvas e Gráficos -->
  <script>
    ${initCanvasScripts}
  </script>

</body>
</html>`;
}
