import React, { useState } from 'react';
import { 
  Smartphone, 
  Terminal, 
  Code, 
  Layers, 
  Download, 
  CheckCircle2, 
  Apple, 
  ArrowRight, 
  ExternalLink,
  ChevronRight,
  Info,
  Copy,
  FolderLock
} from 'lucide-react';

export default function IPhoneGuide() {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const steps = [
    {
      id: 'step1',
      title: 'Instalar o Capacitor no Projeto',
      description: 'Capacitor é a biblioteca oficial da Ionic que envelopa seu app web (React/Vite) em um contêiner nativo de iOS super rápido.',
      cmd: 'npm install @capacitor/core @capacitor/cli'
    },
    {
      id: 'step2',
      title: 'Inicializar a Configuração',
      description: 'Configure o nome do seu aplicativo e o ID de pacote (ex: com.gabriel.financasinteligentes) que será usado na App Store.',
      cmd: 'npx cap init "Finanças Inteligentes" "com.gabriel.financasinteligentes" --web-dir=dist'
    },
    {
      id: 'step3',
      title: 'Adicionar a Plataforma iOS',
      description: 'Instale o pacote nativo do iOS e adicione o diretório correspondente para Xcode.',
      cmd: 'npm install @capacitor/ios\nnpx cap add ios'
    },
    {
      id: 'step4',
      title: 'Compilar e Sincronizar Código',
      description: 'Sempre que fizer alterações no React, compile o build de produção e sincronize com a pasta do iPhone.',
      cmd: 'npm run build\nnpx cap sync'
    },
    {
      id: 'step5',
      title: 'Abrir no Xcode & Testar no iPhone',
      description: 'Este comando abrirá o Xcode automaticamente para você rodar o simulador oficial da Apple ou conectar seu próprio iPhone via USB.',
      cmd: 'npx cap open ios'
    }
  ];

  return (
    <div id="iphone-guide-container" className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-linear-to-r from-neutral-900 to-[#121214] p-6 rounded-2xl border border-neutral-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
              iOS nativo
            </span>
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
              Progressive Web App
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white font-display">Transformar em Aplicativo de iPhone</h2>
          <p className="text-xs text-neutral-400 max-w-xl">
            Este aplicativo foi inteiramente otimizado com design de UI nativo do iOS. Veja abaixo como instalá-lo hoje no seu iPhone físico de duas formas fáceis.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-neutral-950/80 px-4 py-3 rounded-xl border border-neutral-800 shrink-0">
          <Apple className="w-5 h-5 text-neutral-200" />
          <div className="text-left">
            <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest leading-none">Apple Dev</div>
            <div className="text-[11px] text-emerald-400 font-bold mt-0.5">Compatível com iOS 15+</div>
          </div>
        </div>
      </div>

      {/* Two paths: PWA vs Capacitor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PATH A: PWA (Free & Instant) */}
        <div className="bg-[#0c0c0e] border border-neutral-800/80 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/15">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Método 1: Instalação PWA (Instante e Grátis)</h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">Adicione diretamente no Safari sem precisar de computador ou conta da Apple.</p>
            </div>
          </div>

          <div className="space-y-3 bg-neutral-950/60 p-4 rounded-xl border border-neutral-900 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-[10px] font-bold text-neutral-300 mt-0.5 shrink-0">1</div>
              <p className="text-neutral-300 leading-relaxed">
                Abra o navegador <strong className="text-white">Safari</strong> no seu iPhone e acesse a URL deste aplicativo.
              </p>
            </div>
            
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-[10px] font-bold text-neutral-300 mt-0.5 shrink-0">2</div>
              <p className="text-neutral-300 leading-relaxed">
                Toque no ícone de <strong className="text-white">Compartilhar</strong> (o quadrado com uma seta para cima na barra inferior do Safari).
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-[10px] font-bold text-neutral-300 mt-0.5 shrink-0">3</div>
              <p className="text-neutral-300 leading-relaxed">
                Role a folha de opções para baixo e selecione <strong className="text-amber-400">"Adicionar à Tela de Início"</strong>.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-[10px] font-bold text-neutral-300 mt-0.5 shrink-0">4</div>
              <p className="text-neutral-300 leading-relaxed">
                Confirme o nome e toque em <strong className="text-white">Adicionar</strong>. O ícone aparecerá instantaneamente na tela do seu iPhone como um app de verdade!
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-emerald-950/20 border border-emerald-900/30 rounded-xl flex gap-3">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-neutral-300 leading-normal">
              <strong className="text-emerald-400">Dica:</strong> Quando aberto pela Tela de Início, o navegador remove as barras de endereço do Safari, abrindo o app em <strong className="text-white">tela cheia imersiva (Standalone)</strong> com performance ultrarrápida.
            </div>
          </div>
        </div>

        {/* PATH B: Capacitor (Native App Store Compilation) */}
        <div className="bg-[#0c0c0e] border border-neutral-800/80 rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/15">
                <Code className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Método 2: Compilação Nativa (Capacitor & Xcode)</h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">Gere um executável oficial para distribuir na App Store da Apple.</p>
              </div>
            </div>

            <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800/80 text-xs text-neutral-300 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Arquitetura de Exportação</span>
                <span className="text-[10px] text-emerald-400 font-mono">React v18 → iOS Cordova/Capacitor</span>
              </div>
              <div className="flex justify-around items-center py-2 bg-neutral-900/40 rounded-lg">
                <div className="text-center">
                  <div className="text-[10px] text-neutral-400">UI / Lógica</div>
                  <div className="font-bold text-white text-[11px] mt-0.5">Vite + React</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-600" />
                <div className="text-center">
                  <div className="text-[10px] text-neutral-400">Ponte Nativa</div>
                  <div className="font-bold text-emerald-400 text-[11px] mt-0.5">Capacitor Engine</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-600" />
                <div className="text-center">
                  <div className="text-[10px] text-neutral-400">App Store</div>
                  <div className="font-bold text-white text-[11px] mt-0.5">Xcode .IPA</div>
                </div>
              </div>
              <p className="text-[11px] text-neutral-400 leading-normal">
                Com o Capacitor, sua câmera (Scanner de Recibos IA), armazenamento offline (LocalStorage) e conexões seguras com o Supabase continuarão funcionando nativamente no iPhone.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between p-3 bg-neutral-900/40 border border-neutral-800 rounded-xl">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-neutral-400" />
              <span className="text-[11px] text-neutral-300 font-medium">Requer MacOS & Xcode para compilar</span>
            </div>
            <span className="text-[10px] font-bold text-neutral-500">Apple SDK 17+</span>
          </div>
        </div>
      </div>

      {/* Steps of Capacitor build */}
      <div className="bg-[#0c0c0e] border border-neutral-800/80 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-widest">Passo a Passo de Terminal para Compilar o App</h3>
        </div>

        <div className="space-y-4">
          {steps.map((step, idx) => (
            <div key={step.id} className="border-b border-neutral-900 pb-4 last:border-b-0 last:pb-0">
              <div className="flex justify-between items-start mb-1.5">
                <div className="flex gap-2 items-center">
                  <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <h4 className="text-xs font-bold text-white">{step.title}</h4>
                </div>
                <button
                  onClick={() => handleCopy(step.cmd, step.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] text-neutral-400 hover:text-white bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 rounded-lg cursor-pointer transition-all"
                >
                  {copiedText === step.id ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-neutral-400 pl-7 leading-relaxed max-w-3xl mb-2">
                {step.description}
              </p>
              <div className="pl-7">
                <code className="block bg-neutral-950 p-2.5 rounded-xl border border-neutral-900 text-[10px] text-emerald-400 font-mono whitespace-pre overflow-x-auto leading-relaxed">
                  {step.cmd}
                </code>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pro Tips for iOS UX */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 bg-neutral-900/30 border border-neutral-800 rounded-2xl flex gap-3.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Ajuste de Área Segura (Safe Area)</h4>
            <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
              O app possui tags HTML `viewport-fit=cover` e classes CSS que respeitam o espaço do Notch/Dynamic Island e da barra de navegação inferior do iOS, evitando cortes indesejados.
            </p>
          </div>
        </div>

        <div className="p-5 bg-neutral-900/30 border border-neutral-800 rounded-2xl flex gap-3.5">
          <FolderLock className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Autenticação Biométrica (FaceID)</h4>
            <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
              Ao compilar nativamente via Capacitor, você pode instalar o plugin `@capacitor-community/face-id` para que seus usuários façam login usando o reconhecimento facial do iPhone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
