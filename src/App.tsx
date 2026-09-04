import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowLeft, ArrowRight, BatteryCharging, BookOpen, Box,
  Check, ChevronRight, CircleGauge, Cpu, ExternalLink, Flame, Gauge,
  HardDrive, Info, Lightbulb, LockKeyhole, Network, PanelTop, Play,
  Power, RotateCcw, Router, SearchCheck, Server, ShieldCheck, Thermometer,
  TriangleAlert, Waypoints, Zap,
} from 'lucide-react'

type Layer = 'energia' | 'rede' | 'computacao' | 'gestao'
type Screen = 'intro' | 'rack' | 'energy' | 'network' | 'compute' | 'evidence' | 'scenario' | 'finish'

type RackUnit = {
  id: string
  name: string
  short: string
  layer: Layer
  units: number
  description: string
  caution: string
}

type ExamQuestion = {
  question: string
  options: string[]
  answer: number
  explanation: string
}

const examQuestions: Record<'rack' | 'energy' | 'network' | 'compute' | 'evidence', ExamQuestion[]> = {
  rack: [
    { question: 'Um servidor ocupa 2U. O que essa informação comprova?', options: ['Possui duas CPUs', 'Tem 88,9 mm de altura nominal', 'É mais potente que um servidor 1U', 'Possui duas fontes'], answer: 1, explanation: 'U é apenas uma unidade padronizada de altura. 2 × 44,45 mm = 88,9 mm. CPU, fontes e desempenho exigem consulta à configuração.' },
    { question: 'Qual elemento aprende endereços MAC?', options: ['Patch panel', 'Organizador horizontal', 'Switch', 'Trilho'], answer: 2, explanation: 'O switch é ativo e mantém tabela MAC por VLAN. Patch panel, organizador e trilho são elementos passivos ou mecânicos.' },
    { question: 'A etiqueta HOST01-VMWARE permite concluir que:', options: ['O ESXi está saudável', 'Todas as VMs estão ligadas', 'O chassi foi rotulado com esse papel', 'O host pertence a um cluster HA'], answer: 2, explanation: 'A etiqueta comprova somente o texto observado no chassi. Função atual, hipervisor e cluster precisam de inventário e plataforma lógica.' },
    { question: 'Qual combinação descreve corretamente frente e traseira de um servidor?', options: ['Frente: apenas energia; traseira: discos', 'Frente: baias/LEDs; traseira: fontes, NICs e gestão', 'Ambas sempre são idênticas', 'Traseira: somente ventilação'], answer: 1, explanation: 'A disposição varia por modelo, mas baias e indicadores são comuns na frente; fontes, interfaces de dados e porta de gestão aparecem normalmente atrás.' },
  ],
  energy: [
    { question: 'Uma UPS indica 80% de carga. Ao reduzir a carga para 40%, a tendência é:', options: ['Reduzir autonomia', 'Aumentar autonomia', 'Desligar o inversor', 'Transformar a PDU em bateria'], answer: 1, explanation: 'Menor potência demandada tende a aumentar a autonomia. A relação não é perfeitamente linear por causa da eficiência e da curva de descarga.' },
    { question: 'Duas fontes de um servidor estão conectadas à mesma PDU. Qual risco permanece?', options: ['Nenhum; há redundância completa', 'Falha comum da PDU', 'Perda automática de RAID', 'Conflito de endereço MAC'], answer: 1, explanation: 'Há duas fontes, mas um único ponto comum de falha. Redundância real exige caminhos elétricos independentes conforme o projeto.' },
    { question: 'Na UPS online, quem reconstrói a saída AC?', options: ['Patch panel', 'Retificador', 'Inversor', 'Disjuntor'], answer: 2, explanation: 'O retificador converte AC para DC; o inversor converte o barramento DC em AC para a carga.' },
    { question: 'UPS em bypass significa necessariamente operação normal?', options: ['Sim', 'Não; a carga pode estar sem condicionamento/proteção do inversor', 'Sim, se o LED estiver verde', 'Não, porque bypass sempre usa bateria'], answer: 1, explanation: 'No bypass, a entrada alternativa alimenta a saída sem o caminho normal do inversor. É um estado que precisa ser entendido e registrado.' },
  ],
  network: [
    { question: 'Um host acessa outro IP fora de sua sub-rede. Qual MAC será usado como destino no primeiro quadro?', options: ['MAC do servidor remoto', 'MAC do gateway padrão', 'MAC do DNS', 'MAC do firewall remoto'], answer: 1, explanation: 'O pacote mantém o IP do destino remoto, mas o quadro local é endereçado ao próximo salto: o gateway padrão, descoberto via ARP.' },
    { question: 'Uma porta trunk não permite a VLAN 30. Qual efeito é esperado?', options: ['A VLAN atravessa sem tag', 'Quadros da VLAN 30 não cruzam aquele trunk', 'O DNS muda a VLAN', 'O firewall corrige automaticamente'], answer: 1, explanation: 'A lista de VLANs permitidas controla quais VLANs marcadas podem atravessar o trunk 802.1Q.' },
    { question: 'Ping ao IP funciona, mas o nome não resolve. A primeira camada a investigar é:', options: ['Energia', 'DNS/aplicação', 'Bateria', 'Trilho do rack'], answer: 1, explanation: 'A conectividade IP já foi parcialmente demonstrada. A diferença entre nome e IP aponta primeiro para resolução DNS.' },
    { question: 'Qual frase diferencia rota e política no firewall?', options: ['Rota permite; política escolhe cabo', 'Rota escolhe o próximo salto; política autoriza ou bloqueia', 'São sinônimos', 'Política só atua em MAC'], answer: 1, explanation: 'A tabela de rotas determina por onde encaminhar. A política avalia origem, destino, serviço, estado e outros critérios de autorização.' },
    { question: 'O switch recebe um quadro com destino MAC desconhecido. Em regra, ele:', options: ['Descarta sempre', 'Envia ao DNS', 'Inunda nas portas elegíveis da mesma VLAN', 'Roteia para todas as VLANs'], answer: 2, explanation: 'Unknown unicast é difundido dentro do domínio daquela VLAN, exceto pela porta de entrada e respeitando estados como STP.' },
  ],
  compute: [
    { question: 'Perder o vCenter significa que todas as VMs desligam?', options: ['Sempre', 'Não; os ESXi continuam executando as VMs', 'Somente VMs Linux', 'Somente se houver datastore'], answer: 1, explanation: 'vCenter é o plano central de gestão. Os hosts ESXi executam as VMs; a perda da gestão não implica desligamento imediato das cargas.' },
    { question: 'A vNIC de uma VM conecta-se diretamente ao switch físico?', options: ['Sempre', 'Não; passa por port group e vSwitch antes da NIC física', 'Somente via iDRAC', 'Somente via RAID'], answer: 1, explanation: 'O caminho lógico inclui vNIC, port group, switch virtual e uplink/NIC física.' },
    { question: 'RAID 1 oferece principalmente:', options: ['Striping sem redundância', 'Espelhamento de dados', 'Backup externo automático', 'Mais memória RAM'], answer: 1, explanation: 'RAID 1 mantém cópias espelhadas. RAID não substitui backup: erros lógicos e exclusões podem ser replicados.' },
    { question: 'Snapshot de VM deve ser tratado como backup permanente?', options: ['Sim', 'Não; depende da cadeia de discos e não substitui backup', 'Sim, se houver vCenter', 'Apenas em RAID 1'], answer: 1, explanation: 'Snapshots preservam estado para usos pontuais e criam dependência de discos delta. Retenção longa pode afetar capacidade e desempenho.' },
  ],
  evidence: [
    { question: 'Um LED de link está verde. O que está comprovado?', options: ['Aplicação saudável', 'Política liberada', 'Presença de enlace físico naquele instante', 'DNS correto'], answer: 2, explanation: 'O LED é uma evidência limitada do enlace. Não comprova VLAN, IP, rota, política, DNS ou aplicação.' },
    { question: 'Antes de uma mudança, rollback significa:', options: ['Reiniciar tudo', 'Plano para retornar ao estado anterior se o teste falhar', 'Apagar os logs', 'Fechar o chamado'], answer: 1, explanation: 'Rollback deve ser definido antes da execução, com critérios de acionamento, passos e responsáveis.' },
    { question: 'Qual registro é mais útil em um incidente?', options: ['“A rede caiu”', '“Às 14:32, HTTPS falhou; ping ao IP respondeu; DNS não resolveu”', '“Deve ser o firewall”', '“Reiniciei e voltou”'], answer: 1, explanation: 'Um bom registro separa horário, escopo, testes e resultados. Evita conclusão sem evidência e permite continuidade por outra pessoa.' },
    { question: 'Após uma alteração aparentemente bem-sucedida, deve-se:', options: ['Encerrar sem registrar', 'Validar o serviço, monitorar e atualizar documentação/chamado', 'Remover o backup', 'Acionar bypass'], answer: 1, explanation: 'Sucesso técnico precisa ser confirmado do ponto de vista do serviço e documentado para rastreabilidade.' },
  ],
}

const screens: { id: Screen; label: string; eyebrow: string }[] = [
  { id: 'intro', label: 'O mapa', eyebrow: 'Comece aqui' },
  { id: 'rack', label: 'Leia o rack', eyebrow: 'Capítulo 01' },
  { id: 'energy', label: 'Siga a energia', eyebrow: 'Capítulo 02' },
  { id: 'network', label: 'Siga o pacote', eyebrow: 'Capítulo 03' },
  { id: 'compute', label: 'Entre no host', eyebrow: 'Capítulo 04' },
  { id: 'evidence', label: 'Investigue', eyebrow: 'Capítulo 05' },
  { id: 'scenario', label: 'Decida', eyebrow: 'Missão final' },
  { id: 'finish', label: 'Conclusão', eyebrow: 'Fim da rota' },
]

const rackUnits: RackUnit[] = [
  { id: 'pmu', name: 'Vertiv MSC-PMU', short: 'PAINEL ELÉTRICO', layer: 'energia', units: 2, description: 'Distribui circuitos e permite proteção ou seccionamento por disjuntores.', caution: 'LED aceso não comprova que todas as cargas estejam saudáveis.' },
  { id: 'firewall', name: 'FortiGate', short: 'POLÍTICA / NGFW', layer: 'rede', units: 1, description: 'Pode rotear, aplicar NAT, VPN e políticas entre redes.', caution: 'O modelo e a configuração não podem ser deduzidos só pela aparência.' },
  { id: 'switch', name: 'Cisco Catalyst 3850', short: 'CORE / SWITCH', layer: 'rede', units: 1, description: 'Aprende endereços MAC e encaminha quadros; configurado para isso, também pode rotear.', caution: '“Core” é um papel na topologia, não um servidor de processamento.' },
  { id: 'patch', name: 'Patch panels', short: 'DISTRIBUIÇÃO', layer: 'rede', units: 2, description: 'Terminamos o cabeamento horizontal aqui e usamos patch cords até o switch.', caution: 'É passivo: não aprende MAC, não roteia e não cria segurança.' },
  { id: 'ucs1', name: 'Cisco UCS C220 M3', short: 'MONITORAMENTO', layer: 'computacao', units: 1, description: 'Servidor físico 1U identificado pela etiqueta para monitoramento.', caution: 'Etiqueta é uma pista; inventário e plataforma lógica confirmam o papel atual.' },
  { id: 'ucs2', name: 'Cisco UCS C220 M3', short: 'HOST03 — VMWARE', layer: 'computacao', units: 1, description: 'Host físico que pode fornecer CPU, memória, rede e armazenamento às VMs.', caution: 'O host não é a VM e a VM não ocupa uma gaveta física.' },
  { id: 'ucs3', name: 'Cisco UCS C220 M3', short: 'HOST02 — VMWARE', layer: 'computacao', units: 1, description: 'Um dos hosts VMware observados no rack.', caution: 'Vários hosts só formam redundância se toda a arquitetura suportar falhas.' },
  { id: 'ucs4', name: 'Cisco UCS C220 M3', short: 'LAB — VMWARE', layer: 'computacao', units: 1, description: 'Servidor rotulado como ambiente de laboratório VMware.', caution: 'Nunca confunda ambiente pelo rótulo sem conferir inventário e configuração.' },
  { id: 'ucs5', name: 'Cisco UCS C220 M3', short: 'HOST01 — VMWARE', layer: 'computacao', units: 1, description: 'Servidor físico que executa um hipervisor e hospeda computadores lógicos.', caution: 'Baias e tampas não revelam CPU, RAM ou discos instalados.' },
  { id: 'dell', name: 'Dell PowerEdge R410', short: 'SERVIDOR 1U', layer: 'computacao', units: 1, description: 'Servidor físico; a função atual não está legível na foto-base.', caution: 'Não invente a função: confirme no inventário.' },
  { id: 'hpe1', name: 'HPE ProLiant DL380p Gen8', short: 'SERVIDOR 2U', layer: 'computacao', units: 2, description: 'Servidor 2U com maior altura e baias frontais.', caution: '2U significa altura, não potência.' },
  { id: 'hpe2', name: 'HPE ProLiant DL380p Gen8', short: 'SERVIDOR 2U', layer: 'computacao', units: 2, description: 'Segundo servidor HPE observado no bloco de processamento.', caution: 'Fonte dupla não garante redundância sem cabos e software corretos.' },
  { id: 'ups', name: 'Vertiv Liebert ITA2 5 kVA', short: 'UPS / NOBREAK', layer: 'energia', units: 2, description: 'Condiciona a energia e sustenta a carga por baterias durante falhas.', caution: 'Autonomia varia com carga, bateria, temperatura e manutenção.' },
  { id: 'battery', name: 'Módulo externo de baterias', short: 'BATERIAS', layer: 'energia', units: 2, description: 'Amplia a reserva energética associada à UPS.', caution: 'Presença física não comprova autonomia nem saúde das baterias.' },
]

const colors: Record<Layer, string> = { energia: '#f3b43f', rede: '#2ed6b5', computacao: '#74a7ff', gestao: '#ef795e' }

const rackKnowledge: Record<string, { what: string; inside: string; connections: string; observe: string[]; failures: string[]; confirm: string }> = {
  pmu: { what: 'É o ponto de distribuição e proteção de circuitos elétricos. Ele organiza a alimentação que chega ao rack antes de ela alcançar as cargas.', inside: 'Barramentos conduzem energia; disjuntores interrompem correntes anormais; módulos de medição podem ler tensão, corrente e potência. Proteção não é a mesma coisa que autonomia.', connections: 'Recebe energia da instalação e entrega circuitos para UPSs ou PDUs. Se esse ponto falhar, vários equipamentos a jusante podem apagar ao mesmo tempo.', observe: ['Display e código de alarme', 'Circuito identificado no diagrama', 'Tensão, corrente e carga — se monitoradas'], failures: ['Sobrecarga ou circuito aberto', 'Perda de alimentação a montante', 'Medição ou sensor incoerente'], confirm: 'Diagrama unifilar, identificação do circuito, monitoramento elétrico e procedimento autorizado.' },
  firewall: { what: 'É um equipamento de rede que decide quais comunicações podem atravessar limites entre zonas, como Internet, servidores, usuários e gestão.', inside: 'Cada pacote chega por uma interface. O equipamento consulta rota, política e estado da sessão; pode traduzir endereços com NAT, terminar VPNs e aplicar perfis de segurança.', connections: 'Fica entre redes com níveis de confiança diferentes. Recebe o link do provedor e entrega tráfego autorizado ao switch ou a outros segmentos.', observe: ['Estado físico e lógico da interface', 'Rota escolhida e política correspondente', 'Sessão, NAT e motivo de bloqueio nos logs'], failures: ['Rota ausente ou gateway indisponível', 'Política não correspondente', 'NAT, VPN ou inspeção TLS incompatível'], confirm: 'Configuração, tabela de rotas, sessões e logs. Um LED verde confirma apenas sinal físico, não permissão de tráfego.' },
  switch: { what: 'É o equipamento que conecta dispositivos dentro de uma rede local e encaminha quadros Ethernet entre portas.', inside: 'Aprende o MAC de origem por porta e VLAN. Para um destino conhecido, encaminha só à porta correta; destinos desconhecidos e broadcasts são difundidos apenas naquela VLAN.', connections: 'Liga firewall, hosts, pontos de acesso e cabeamento estruturado. Trunks transportam várias VLANs; portas de acesso normalmente entregam uma VLAN ao dispositivo.', observe: ['Link, velocidade, erros e flaps', 'VLAN de acesso ou trunk', 'MAC aprendido e estado de STP'], failures: ['Porta na VLAN errada', 'VLAN ausente no trunk', 'Loop, bloqueio STP, erros físicos ou MAC flapping'], confirm: 'Configuração da porta, contadores, tabela MAC, STP e mapa de portas.' },
  patch: { what: 'É um painel passivo que termina e organiza o cabeamento permanente do prédio. Não é um equipamento de rede ativo.', inside: 'A tomada frontal é ligada mecanicamente aos condutores do cabo horizontal na traseira. Não há CPU, tabela MAC, endereço IP ou regra de segurança.', connections: 'O percurso típico é tomada da sala → cabo permanente → patch panel → patch cord curto → porta do switch.', observe: ['Etiqueta nas duas extremidades', 'Conector bem encaixado e sem tensão', 'Correspondência com o mapa de portas'], failures: ['Identificação trocada', 'Conector mal terminado', 'Cabo rompido ou patch cord defeituoso'], confirm: 'Mapa de cabeamento e certificação do enlace. Não mova cabos sem chamado e autorização.' },
  ups: { what: 'É a fonte de alimentação ininterrupta: condiciona energia e mantém temporariamente as cargas quando a entrada falha.', inside: 'Em uma UPS online, o retificador cria um barramento DC, carrega baterias e o inversor reconstrói a saída AC. O bypass é um caminho alternativo controlado.', connections: 'Recebe um circuito protegido, usa baterias como reserva e alimenta PDUs ou cargas. A autonomia cai quando a potência consumida aumenta.', observe: ['Modo: normal, bateria ou bypass', 'Carga percentual e autonomia estimada', 'Alarmes, temperatura e estado das baterias'], failures: ['Sobrecarga', 'Bateria degradada', 'Falha do inversor ou entrada fora de faixa'], confirm: 'Display, histórico de alarmes, monitoramento e teste de bateria registrado. Nunca acione bypass para “testar”.' },
  battery: { what: 'É o armazenamento eletroquímico que fornece energia DC à UPS durante uma interrupção.', inside: 'Células ligadas em série formam a tensão necessária; módulos podem ser combinados para aumentar a energia disponível. Calor e idade aceleram a degradação.', connections: 'Conecta-se ao barramento DC da UPS. Sem bateria saudável, a UPS pode condicionar energia, mas não sustentar a carga por tempo útil.', observe: ['Idade e último teste', 'Autonomia estimada e alarmes', 'Calor, odor ou deformação — sem tocar'], failures: ['Perda de capacidade', 'Célula aberta ou desequilibrada', 'Temperatura excessiva'], confirm: 'Teste de bateria, histórico e manutenção. Presença do módulo não comprova capacidade.' },
}

const serverKnowledge = { what: 'É um computador físico preparado para operação contínua. O chassi reúne processamento, memória, rede, armazenamento, refrigeração e fontes.', inside: 'CPU executa instruções; RAM mantém dados ativos; controladora e discos persistem dados; NICs levam quadros à rede; firmware inicializa e monitora o hardware.', connections: 'Recebe energia das PDUs, dados do switch e uma rede separada de gestão. Pode executar ESXi e hospedar várias VMs e serviços.', observe: ['Saúde em CIMC, iDRAC ou iLO', 'Fontes, ventiladores, discos e temperatura', 'NICs, hipervisor e VMs afetadas'], failures: ['Disco ou fonte degradada', 'Memória/CPU com erro', 'Sistema, hipervisor ou interface travada'], confirm: 'Inventário + controladora fora de banda + hipervisor + monitoramento. Etiqueta frontal não confirma a função atual.' }
const equipmentAnalogies: Record<string, string> = {
  pmu: 'Pense no quadro elétrico de uma casa, mas atendendo um armário inteiro de tecnologia. Ele separa circuitos e interrompe uma corrente perigosa; não guarda energia e não garante que os aparelhos estejam funcionando.',
  firewall: 'Imagine a portaria de um condomínio. Saber para qual bloco uma pessoa vai é a rota; verificar se ela está autorizada é a política; registrar sua entrada é o estado da sessão. A portaria pode conhecer o caminho e, ainda assim, negar a passagem.',
  switch: 'Funciona como um entregador dentro de um único prédio. Ele aprende em qual sala está cada destinatário e entrega diretamente. Quando ainda não conhece a sala, pergunta em todas as salas daquele andar lógico, isto é, daquela VLAN.',
  patch: 'É semelhante a uma central de tomadas identificadas: organiza onde cada cabo permanente termina e permite ligá-lo ao switch com um cabo curto. Ele apenas conduz o sinal; não lê, decide nem protege o conteúdo.',
  ups: 'É uma caixa-d’água com filtro para energia: durante o abastecimento normal, trata a entrada e mantém a reserva; quando a rua para de fornecer, a reserva sustenta o consumo por tempo limitado. Quanto mais torneiras abertas, menor o tempo.',
  battery: 'É o reservatório da UPS. Ver o reservatório instalado não informa quanto ainda cabe nele nem por quanto tempo sustentará o ambiente; idade, calor e testes determinam sua capacidade real.',
  server: 'É como um prédio preparado para abrigar empresas. O hardware fornece espaço, energia e estrutura; o hipervisor administra os ambientes; as VMs são salas independentes; e os serviços são os trabalhos realizados dentro delas.',
}

const equipmentPhotos: Record<string, { src: string; alt: string; position: string }> = {
  pmu: { src: '/equipment/pmu.jpg', alt: 'Painel de monitoramento e distribuição elétrica instalado no rack Aptum', position: '50% 58%' },
  firewall: { src: '/equipment/firewall.jpg', alt: 'Firewall Fortinet FortiGate instalado no rack Aptum', position: '50% 43%' },
  switch: { src: '/equipment/switch.jpg', alt: 'Switch Cisco Catalyst com suas portas e conexões de rede', position: '50% 50%' },
  patch: { src: '/equipment/patch-panel.jpg', alt: 'Patch panels e cabos de rede organizados no rack Aptum', position: '50% 38%' },
  ups: { src: '/equipment/ups.jpg', alt: 'UPS ou nobreak instalado na parte inferior do rack Aptum', position: '50% 32%' },
  battery: { src: '/equipment/battery.jpg', alt: 'Módulos externos de bateria instalados abaixo da UPS', position: '50% 78%' },
  server: { src: '/equipment/server.jpg', alt: 'Servidor físico Dell EMC PowerEdge instalado no rack Aptum', position: '50% 52%' },
}

const sources = [
  { label: 'Fortinet — inspeção profunda SSL/TLS', url: 'https://docs.fortinet.com/document/fortigate/7.6.4/administration-guide/122078/deep-inspection' },
  { label: 'Cisco — servidores UCS C-Series', url: 'https://www.cisco.com/c/en/us/support/servers-unified-computing/ucs-c-series-rack-servers/series.html' },
  { label: 'VMware — visão geral do ESXi', url: 'https://www.vmware.com/products/cloud-infrastructure/esxi-and-esx' },
]

function Brand() {
  return <div className="brand" aria-label="Aptum Tecnologia"><span className="brand-wordmark">APTUM</span><small>TECNOLOGIA</small></div>
}

function LayerPill({ layer }: { layer: Layer }) {
  const icons = { energia: Zap, rede: Network, computacao: Cpu, gestao: Activity }
  const Icon = icons[layer]
  return <span className="layer-pill" style={{ '--layer': colors[layer] } as React.CSSProperties}><Icon size={14} />{layer}</span>
}

function App() {
  const [step, setStep] = useState(() => Number(localStorage.getItem('aptum-noc-step')) || 0)
  const [selectedUnit, setSelectedUnit] = useState<RackUnit>(rackUnits[0])
  const [activeLayer, setActiveLayer] = useState<Layer | 'all'>('all')
  const [packetStep, setPacketStep] = useState(0)
  const [energyFailed, setEnergyFailed] = useState(false)
  const [quiz, setQuiz] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [complete, setComplete] = useState(false)
  const current = screens[step]

  useEffect(() => {
    localStorage.setItem('aptum-noc-step', String(step))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  useEffect(() => {
    if (current.id !== 'network') return
    const timer = window.setInterval(() => setPacketStep((value) => (value + 1) % 5), 1500)
    return () => window.clearInterval(timer)
  }, [current.id])

  const progress = Math.round((step / (screens.length - 1)) * 100)
  const next = () => setStep((value) => Math.min(value + 1, screens.length - 1))
  const previous = () => setStep((value) => Math.max(value - 1, 0))

  const content = useMemo(() => {
    switch (current.id) {
      case 'intro': return <Intro onStart={next} />
      case 'rack': return <RackChapter selected={selectedUnit} setSelected={setSelectedUnit} activeLayer={activeLayer} setActiveLayer={setActiveLayer} />
      case 'energy': return <EnergyChapter failed={energyFailed} setFailed={setEnergyFailed} />
      case 'network': return <NetworkChapter packetStep={packetStep} setPacketStep={setPacketStep} />
      case 'compute': return <ComputeChapter />
      case 'evidence': return <EvidenceChapter />
      case 'scenario': return <Scenario quiz={quiz} setQuiz={setQuiz} showAnswer={showAnswer} setShowAnswer={setShowAnswer} />
      case 'finish': return <Finish complete={complete} setComplete={setComplete} restart={() => setStep(0)} />
    }
  }, [current.id, selectedUnit, activeLayer, energyFailed, packetStep, quiz, showAnswer, complete])

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <div className="route-progress" aria-label={`Progresso: ${progress}%`}>
          <div className="progress-copy"><span>{current.eyebrow}</span><strong>{progress}% concluído</strong></div>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
        </div>
        <div className="internal"><LockKeyhole size={13} /> Uso interno</div>
      </header>

      <main key={current.id} className="screen">{content}</main>

      {current.id !== 'intro' && current.id !== 'finish' && (
        <nav className="bottom-nav" aria-label="Navegação do treinamento">
          <button className="button ghost" onClick={previous}><ArrowLeft size={18} /> Voltar</button>
          <div className="step-dots">{screens.slice(1, -1).map((screen, index) => <span key={screen.id} className={index + 1 <= step ? 'done' : ''} />)}</div>
          <button className="button primary" onClick={next}>{step === screens.length - 2 ? 'Concluir rota' : 'Seguir rota'} <ArrowRight size={18} /></button>
        </nav>
      )}
    </div>
  )
}

function Intro({ onStart }: { onStart: () => void }) {
  return <section className="hero">
    <div className="hero-copy">
      <div className="kicker"><span className="pulse-dot" /> Formação técnica · teoria + exercícios</div>
      <h1>Por dentro<br />do <em>NOC</em></h1>
      <p className="hero-lead">Uma rota de estudo para dominar <strong>energia, rede, computação, virtualização e diagnóstico</strong> — com teoria, relações entre camadas e questões comentadas.</p>
      <div className="promise"><Lightbulb size={21} /><p><strong>A ideia que amarra tudo</strong>O rack é o endereço físico. O serviço é o que o usuário consome. Entre os dois existe uma cadeia — e você vai percorrê-la.</p></div>
      <button className="button primary large" onClick={onStart}><Play size={18} fill="currentColor" /> Iniciar exploração</button>
      <span className="resume-note">Seu progresso fica salvo neste navegador.</span>
    </div>
    <div className="hero-visual" aria-label="Diagrama animado das quatro camadas do NOC">
      <div className="orbit orbit-one" /><div className="orbit orbit-two" />
      <div className="central-rack"><RackMini /></div>
      <div className="orbit-node node-energy"><Zap /> <span>ENERGIA<small>alimenta</small></span></div>
      <div className="orbit-node node-network"><Network /> <span>REDE<small>conecta</small></span></div>
      <div className="orbit-node node-compute"><Cpu /> <span>COMPUTAÇÃO<small>executa</small></span></div>
      <div className="orbit-node node-manage"><Activity /> <span>GESTÃO<small>observa</small></span></div>
      <div className="signal s1" /><div className="signal s2" /><div className="signal s3" />
    </div>
  </section>
}

function RackMini() {
  return <div className="rack-mini"><div className="rack-top">APTUM · R01</div>{['power','net','net','gap','server','server','server','server','big','big','ups'].map((kind, i) => <div key={i} className={`mini-unit ${kind}`}><span /><span /><i /><i /></div>)}</div>
}

function ChapterTitle({ number, title, lead, icon: Icon }: { number: string; title: string; lead: string; icon: React.ElementType }) {
  return <div className="chapter-title"><div className="chapter-icon"><Icon /></div><div><span>{number}</span><h2>{title}</h2><p>{lead}</p></div></div>
}

function Analogy({ children }: { children: React.ReactNode }) {
  return <div className="analogy"><Lightbulb /><p><strong>Pense assim</strong>{children}</p></div>
}

function EquipmentPhoto({ equipmentId, name }: { equipmentId: string; name: string }) {
  const photo = equipmentPhotos[equipmentId] ?? equipmentPhotos.server
  return <figure className="equipment-photo">
    <img src={photo.src} alt={photo.alt} loading="lazy" style={{ objectPosition: photo.position }} />
    <figcaption><span>Foto do ambiente · {name}</span><small>Acervo Aptum</small></figcaption>
  </figure>
}

function ExamBlock({ chapter }: { chapter: keyof typeof examQuestions }) {
  const questions = examQuestions[chapter]
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const question = questions[current]
  const answered = selected !== null
  const correct = selected === question.answer
  const score = Object.entries(answers).filter(([index, answer]) => questions[Number(index)].answer === answer).length
  const choose = (index: number) => {
    if (answered) return
    setSelected(index)
    setAnswers((value) => ({ ...value, [current]: index }))
  }
  const go = (index: number) => {
    setCurrent(index)
    setSelected(answers[index] ?? null)
  }
  return <section className="exam-block">
    <div className="exam-head"><div><span>PREPARAÇÃO PARA PROVA</span><h3>Teste o que aprendeu</h3></div><strong>{score}/{questions.length} acertos</strong></div>
    <div className="exam-progress">{questions.map((_, index) => <button aria-label={`Questão ${index + 1}`} key={index} className={`${index === current ? 'current' : ''} ${answers[index] === questions[index].answer ? 'right' : answers[index] !== undefined ? 'wrong' : ''}`} onClick={() => go(index)}>{index + 1}</button>)}</div>
    <p className="exam-question"><b>Q{String(current + 1).padStart(2, '0')}</b>{question.question}</p>
    <div className="exam-options">{question.options.map((option, index) => <button key={option} className={`${selected === index ? 'selected' : ''} ${answered && index === question.answer ? 'correct' : ''} ${answered && selected === index && index !== question.answer ? 'incorrect' : ''}`} onClick={() => choose(index)}><i>{String.fromCharCode(65 + index)}</i><span>{option}</span>{answered && index === question.answer && <Check />}</button>)}</div>
    {answered && <div className={`exam-explanation ${correct ? 'success' : 'retry'}`}><strong>{correct ? 'Resposta correta.' : 'Resposta incorreta.'}</strong><p>{question.explanation}</p></div>}
    <div className="exam-nav"><button disabled={current === 0} onClick={() => go(current - 1)}><ArrowLeft /> Anterior</button><span>Questão {current + 1} de {questions.length}</span><button disabled={!answered || current === questions.length - 1} onClick={() => go(current + 1)}>Próxima <ArrowRight /></button></div>
  </section>
}

function RackChapter({ selected, setSelected, activeLayer, setActiveLayer }: { selected: RackUnit; setSelected: (unit: RackUnit) => void; activeLayer: Layer | 'all'; setActiveLayer: (layer: Layer | 'all') => void }) {
  const knowledge = rackKnowledge[selected.id] ?? serverKnowledge
  const [tab, setTab] = useState<'what' | 'inside' | 'connections' | 'diagnose'>('what')
  return <section className="chapter wide">
    <ChapterTitle number="CAPÍTULO 01" title="Leia o rack como um mapa" lead="Não procure “o servidor”. Primeiro reconheça as camadas e a posição de cada peça." icon={SearchCheck} />
    <div className="filter-row"><span>Filtrar camada</span>{(['all','energia','rede','computacao'] as const).map((layer) => <button key={layer} className={activeLayer === layer ? 'active' : ''} onClick={() => setActiveLayer(layer)}>{layer === 'all' ? 'Todas' : layer}</button>)}</div>
    <div className="rack-lab">
      <div className="u-ruler"><span>42U</span><span>36U</span><span>30U</span><span>24U</span><span>18U</span><span>12U</span><span>06U</span><span>01U</span></div>
      <div className="rack-frame">
        <div className="rack-brand">RACK APTUM <span>● SENSOR 20,8 °C</span></div>
        {rackUnits.map((unit) => <button key={unit.id} style={{ '--unit-color': colors[unit.layer], '--units': unit.units } as React.CSSProperties} className={`rack-unit layer-${unit.layer} ${selected.id === unit.id ? 'selected' : ''} ${activeLayer !== 'all' && activeLayer !== unit.layer ? 'muted' : ''}`} onClick={() => setSelected(unit)}><i className="handle" /><span>{unit.short}</span><div className="unit-leds"><i /><i /><i /></div></button>)}
      </div>
      <aside className="inspection-card" key={selected.id}>
        <div className="inspection-top"><LayerPill layer={selected.layer} /><span>{selected.units}U</span></div>
        <h3>{selected.name}</h3><p>{selected.description}</p>
        <div className="learning-tabs" role="tablist" aria-label="Detalhes do equipamento">
          {([['what','O que é'],['inside','Por dentro'],['connections','Conexões'],['diagnose','Diagnóstico']] as const).map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
        </div>
        <div className="knowledge-panel" key={`${selected.id}-${tab}`}>
          {tab === 'what' && <><span>FUNÇÃO NO AMBIENTE</span><p>{knowledge.what}</p><Analogy>{equipmentAnalogies[selected.id] ?? equipmentAnalogies.server}</Analogy><strong>Por que existe?</strong><p>{selected.description} Sem essa função, a cadeia perde organização, conectividade, processamento ou continuidade.</p></>}
          {tab === 'inside' && <><span>COMO FUNCIONA</span><p>{knowledge.inside}</p><EquipmentPhoto equipmentId={selected.id} name={selected.name} /><small className="photo-note">A foto ajuda no reconhecimento visual. O modelo ou a configuração instalada pode variar.</small></>}
          {tab === 'connections' && <><span>ENTRADA → FUNÇÃO → SAÍDA</span><p>{knowledge.connections}</p><div className="connection-chain"><i>ENTRADA</i><ChevronRight /><b>{selected.short}</b><ChevronRight /><i>PRÓXIMA CAMADA</i></div><strong>Dependência importante</strong><p>O equipamento pode estar saudável e ainda assim o serviço falhar em uma peça anterior ou posterior.</p></>}
          {tab === 'diagnose' && <div className="diagnose-grid"><div><span>O QUE OBSERVAR</span>{knowledge.observe.map(item => <p key={item}><Check />{item}</p>)}</div><div><span>FALHAS TÍPICAS</span>{knowledge.failures.map(item => <p key={item}><TriangleAlert />{item}</p>)}</div><section><strong>Como confirmar</strong><p>{knowledge.confirm}</p></section></div>}
        </div>
        <div className="caution"><TriangleAlert size={19} /><p><strong>Não presuma</strong>{selected.caution}</p></div>
        <div className="u-note"><Gauge size={18} /><p><strong>1U = 44,45 mm.</strong> U mede altura. Chassi é a carcaça. Trilhos fixam o equipamento.</p></div>
      </aside>
    </div>
    <TheoryReference title="O que memorizar sobre racks" columns={[
      ['Rack, chassi e U', 'Rack é o gabinete padronizado; chassi é a carcaça do equipamento; U mede altura; trilhos e porcas-gaiola fazem a fixação. Profundidade, peso, fluxo de ar e capacidade elétrica também precisam ser compatíveis.'],
      ['Frente e traseira', 'Na frente ficam normalmente identificação, LEDs e baias. Atrás aparecem fontes, interfaces de rede, gestão e cabos. Fotografar só a frente nunca documenta toda a conectividade.'],
      ['Fluxo de ar', 'Muitos servidores aspiram ar frio pela frente e expelem ar quente atrás. Cabos obstruindo saídas, tampas ausentes e mistura de corredores podem criar pontos quentes mesmo com uma leitura ambiente aceitável.'],
      ['Etiquetagem', 'Uma boa identificação relaciona rack, posição U, equipamento, porta, origem e destino. Cor ajuda, mas não substitui etiqueta, inventário e mapa de portas.'],
    ]} />
    <ExamBlock chapter="rack" />
  </section>
}

function TheoryReference({ title, columns }: { title: string; columns: [string, string][] }) {
  return <section className="theory-reference"><div className="theory-title"><BookOpen /><div><span>CADERNO DE ESTUDO</span><h3>{title}</h3></div></div><div className="theory-grid">{columns.map(([heading, text]) => <article key={heading}><h4>{heading}</h4><p>{text}</p></article>)}</div></section>
}

function EnergyChapter({ failed, setFailed }: { failed: boolean; setFailed: (value: boolean) => void }) {
  const path = failed ? 3 : 0
  return <section className="chapter">
    <ChapterTitle number="CAPÍTULO 02" title="A energia é uma cadeia" lead="Cada peça resolve um problema diferente. Clique para simular uma falha da concessionária." icon={BatteryCharging} />
      <Analogy>A energia percorre uma cadeia parecida com o abastecimento de água. A concessionária é a rede da cidade; o painel separa e protege os encanamentos; a PDU distribui os pontos dentro do rack; e a UPS é uma reserva temporária. Uma peça não substitui a outra.</Analogy>
    <button className={`failure-switch ${failed ? 'failed' : ''}`} onClick={() => setFailed(!failed)}><Power size={18} />{failed ? 'Restaurar concessionária' : 'Simular queda de energia'}</button>
    <div className={`energy-stage ${failed ? 'is-failed' : ''}`}>
      <div className="energy-flow">
        <FlowNode icon={Zap} title="Rede elétrica" text={failed ? 'INDISPONÍVEL' : 'Entrada disponível'} status={failed ? 'danger' : 'ok'} />
        <FlowCable active={!failed} />
        <FlowNode icon={PanelTop} title="Painel / PMU" text="Protege e secciona" status={failed ? 'idle' : 'ok'} />
        <FlowCable active={!failed} />
        <FlowNode icon={BatteryCharging} title="UPS" text={failed ? 'Bateria sustentando' : 'Condiciona + recarrega'} status={failed ? 'warn' : 'ok'} />
        <FlowCable active power={failed ? 'battery' : 'grid'} />
        <FlowNode icon={Server} title="Carga crítica" text={failed ? 'Ainda em operação' : 'Operação normal'} status="ok" />
      </div>
      <div className="battery-scene"><BatteryCharging size={56} /><div className="charge"><span style={{ width: failed ? `${78 - path * 12}%` : '100%' }} /></div><strong>{failed ? 'UPS assumiu a carga' : 'Baterias em espera'}</strong><p>{failed ? 'Há tempo para agir — não uma garantia infinita.' : 'A autonomia depende da carga e da saúde das baterias.'}</p></div>
    </div>
    <div className="three-differences">
      <article><PanelTop /><span>01</span><h3>Painel elétrico</h3><p>Distribui circuitos e os protege com disjuntores.</p></article>
      <article><Box /><span>02</span><h3>PDU</h3><p>Distribui tomadas dentro do rack. PDU não significa bateria.</p></article>
      <article><BatteryCharging /><span>03</span><h3>UPS / nobreak</h3><p>Condiciona e sustenta a carga durante uma falha.</p></article>
    </div>
    <div className="deep-dive">
      <article><span>POR DENTRO DE UMA UPS ONLINE</span><h3>AC entra, DC sustenta, AC sai</h3><div className="process-chain"><b>Entrada AC</b><ChevronRight /><b>Retificador</b><ChevronRight /><b>Barramento DC + bateria</b><ChevronRight /><b>Inversor</b><ChevronRight /><b>Saída AC</b></div><p>O retificador converte e alimenta o barramento DC; o inversor recria a saída. Na queda, a bateria mantém o barramento sem exigir que a carga troque de fonte. Bypass é um caminho alternativo e não deve ser operado como teste.</p></article>
      <article><span>AUTONOMIA NÃO É UM NÚMERO FIXO</span><h3>Mais carga, menos tempo</h3><p className="formula">autonomia ≈ energia útil × eficiência ÷ potência consumida</p><p>É uma aproximação: idade, temperatura, eficiência e curva de descarga alteram o resultado. “UPS online” descreve o modo; não comprova bateria saudável.</p></article>
    </div>
    <div className="safety-banner"><Flame size={22} /><p><strong>Limite operacional do estagiário</strong>Não opere disjuntores, bypass, baterias ou cabos de energia sem procedimento, autorização e acompanhamento habilitado.</p></div>
    <TheoryReference title="Grandezas e estados elétricos" columns={[
      ['Potência e capacidade', 'Watt (W) mede potência ativa consumida; volt-ampère (VA) mede potência aparente. UPSs são especificadas nos dois limites, e nenhum deles deve ser excedido. Fator de potência relaciona W e VA.'],
      ['Carga e autonomia', 'Autonomia depende da energia útil das baterias e da potência exigida. Carga de 100% deixa pouca margem para picos ou crescimento, mesmo antes de ocorrer uma falha.'],
      ['Online, bateria e bypass', 'Online é o caminho normal pelo retificador/inversor; em bateria, a reserva mantém o barramento DC; em bypass, uma entrada alternativa alimenta a saída. Cada estado tem riscos diferentes.'],
      ['Redundância A/B', 'Fontes duplas devem chegar, quando o projeto prevê, a caminhos independentes. Duas fontes na mesma PDU protegem contra falha de uma fonte, mas não contra falha da PDU ou circuito.'],
    ]} />
    <ExamBlock chapter="energy" />
  </section>
}

function FlowNode({ icon: Icon, title, text, status }: { icon: React.ElementType; title: string; text: string; status: string }) {
  return <div className={`flow-node ${status}`}><div><Icon /></div><strong>{title}</strong><span>{text}</span></div>
}
function FlowCable({ active = true, power = 'grid' }: { active?: boolean; power?: string }) { return <div className={`flow-cable ${active ? 'active' : ''} ${power}`}><i /><i /><i /></div> }

function NetworkChapter({ packetStep, setPacketStep }: { packetStep: number; setPacketStep: (step: number) => void }) {
  const nodes = [
    { icon: Router, label: 'Entrada', title: 'CPE / ONT', copy: 'O provedor entrega o link.' },
    { icon: ShieldCheck, label: 'Política', title: 'FortiGate', copy: 'Roteia, faz NAT/VPN e aplica regras.' },
    { icon: Network, label: 'Comutação', title: 'Catalyst', copy: 'Encaminha quadros pela tabela MAC.' },
    { icon: Waypoints, label: 'Distribuição', title: 'Patch panel', copy: 'Conduz a conexão pelo meio físico.' },
    { icon: Server, label: 'Destino', title: 'Serviço', copy: 'Sistema e aplicação respondem.' },
  ]
  return <section className="chapter wide">
    <ChapterTitle number="CAPÍTULO 03" title="Acompanhe um pacote" lead="Uma solicitação atravessa responsabilidades diferentes até virar resposta para o usuário." icon={Network} />
      <Analogy>Trate cada pacote como uma encomenda. O DNS encontra o endereço, o IP identifica origem e destino, o gateway é a saída do bairro, os roteadores escolhem as próximas estradas e o firewall funciona como uma fiscalização. Cada etapa responde a uma pergunta diferente.</Analogy>
    <div className="packet-flow">
      <div className="packet-line"><span style={{ width: `${packetStep * 25}%` }} /></div>
      {nodes.map(({ icon: Icon, label, title, copy }, index) => <button key={title} className={index === packetStep ? 'active' : index < packetStep ? 'passed' : ''} onClick={() => setPacketStep(index)}><div className="packet-icon"><Icon /><span className="packet-dot" /></div><small>0{index + 1} · {label}</small><strong>{title}</strong><p>{copy}</p></button>)}
    </div>
    <div className="network-grid">
      <article className="vlan-card"><div><span className="eyebrow">SEGMENTAÇÃO VISUAL</span><h3>VLAN separa. Política controla.</h3><p>Uma VLAN divide um mesmo switch físico em bairros lógicos separados. Os anúncios feitos em um bairro — os broadcasts — não chegam automaticamente ao outro. Para atravessar bairros é preciso um elemento de Camada 3, como um roteador ou firewall. Essa travessia cria o caminho, mas não a permissão: ACLs e políticas decidem quem pode passar, para onde e usando qual serviço.</p></div><VlanDiagram /></article>
      <article className="tls-card"><span className="eyebrow">POR DENTRO DO TLS</span><h3>Criptografado não significa invisível por mágica</h3><div className="tls-flow"><div><LockKeyhole /> Cliente</div><ChevronRight /><div className="forti"><ShieldCheck /> FortiGate<small>descriptografa · inspeciona · recriptografa</small></div><ChevronRight /><div><Server /> Servidor</div></div><p>A inspeção profunda só ocorre quando configurada e quando os clientes confiam na autoridade certificadora usada pelo firewall.</p></article>
    </div>
    <div className="diagnostic-ladder"><span>Roteiro mental de diagnóstico</span>{['Físico','Enlace','Rede','Política','Serviço'].map((item, i) => <div key={item}><b>{i + 1}</b>{item}<small>{['energia · link · LEDs','porta · trunk · VLAN · MAC','IP · gateway · rota','ACL · firewall · NAT · VPN','DNS · porta · aplicação'][i]}</small></div>)}</div>
    <div className="deep-dive network-lesson">
      <article><span>O QUE ACONTECE ANTES DO PRIMEIRO PACOTE</span><h3>Nome, destino e gateway</h3><ol><li><b>DNS</b> traduz o nome do serviço para um endereço IP.</li><li>O host compara destino e máscara: se estiver fora da rede local, usa o <b>gateway</b>.</li><li><b>ARP</b> descobre o MAC do próximo salto na rede local.</li><li>O quadro leva MACs; o pacote leva IPs. A cada roteamento, o quadro muda, mas os IPs normalmente permanecem — salvo NAT.</li></ol></article>
      <article><span>SWITCH POR DENTRO</span><h3>Aprender, consultar, encaminhar</h3><p>O switch aprende o MAC de origem na porta e VLAN de entrada. Depois consulta o MAC de destino: se souber a porta, encaminha seletivamente; se não souber, inunda apenas aquela VLAN. Um patch panel não participa dessa decisão.</p><div className="fact-row"><b>Trunk</b><p>Transporta várias VLANs com identificação 802.1Q.</p><b>STP</b><p>Evita loops de Camada 2 bloqueando caminhos redundantes.</p></div></article>
      <article><span>FIREWALL STATEFUL</span><h3>Rota e política são perguntas diferentes</h3><p>A rota responde “por onde enviar?”. A política responde “é permitido?”. O firewall também registra estado da sessão; NAT pode trocar endereços ou portas. Por isso, ping funcionar não prova que HTTPS esteja autorizado.</p></article>
    </div>
    <TheoryReference title="Modelo de rede para diagnóstico" columns={[
      ['Ethernet e VLAN', 'Quadros Ethernet usam MAC na rede local. VLAN separa domínios de broadcast; portas access pertencem normalmente a uma VLAN, enquanto trunks transportam várias VLANs com tags 802.1Q.'],
      ['ARP, IP e gateway', 'ARP associa IPv4 local a MAC. Máscara define se o destino é local. Para destino remoto, o host envia o quadro ao MAC do gateway, mantendo no pacote o IP final.'],
      ['TCP, UDP e portas', 'TCP estabelece sessão, confirma entrega e ordena dados; UDP não estabelece sessão nem garante entrega. Portas identificam processos: HTTPS costuma usar TCP/443, DNS frequentemente UDP/53 e também TCP/53.'],
      ['DNS e TLS', 'DNS traduz nomes; TLS autentica o servidor por certificado e cifra a sessão. Certificado expirado, nome divergente ou CA não confiável pode interromper a experiência mesmo com IP e porta alcançáveis.'],
      ['Firewall, NAT e VPN', 'Firewall stateful acompanha sessões; NAT traduz endereços/portas; VPN cria um túnel protegido entre pontos. São funções relacionadas, mas não equivalentes.'],
      ['Ordem prática', 'Teste físico → VLAN/MAC → IP/gateway/rota → TCP/UDP e política → DNS/TLS/aplicação. Começar na camada compatível com o sintoma reduz suposições.'],
    ]} />
    <ExamBlock chapter="network" />
  </section>
}

function VlanDiagram() {
  return <div className="vlan-diagram"><div className="vlan vlan-a"><span>VLAN 10</span><i /><i /><i /></div><div className="l3"><Router /><small>CAMADA 3</small></div><div className="vlan vlan-b"><span>VLAN 20</span><i /><i /><i /></div><div className="policy-lock"><LockKeyhole /></div></div>
}

function ComputeChapter() {
  const [active, setActive] = useState(0)
  const layers = [
    { title: 'Serviço', subtitle: 'O que o usuário consome', icon: Activity, items: ['Zabbix', 'Grafana', 'Telefonia'] },
    { title: 'Máquinas virtuais', subtitle: 'Computadores lógicos isolados', icon: Box, items: ['VM 01', 'VM 02', 'VM 03'] },
    { title: 'ESXi', subtitle: 'O hipervisor divide recursos', icon: CircleGauge, items: ['CPU', 'RAM', 'Rede'] },
    { title: 'Host físico', subtitle: 'O hardware dentro do rack', icon: Server, items: ['Discos', 'NICs', 'Fontes'] },
  ]
  return <section className="chapter">
    <ChapterTitle number="CAPÍTULO 04" title="Da caixa física à aplicação" lead="O usuário não consome um chassi: ele consome um serviço apoiado por várias camadas." icon={Cpu} />
      <Analogy>Imagine um edifício comercial. O host físico é o prédio; o ESXi é a administração que reparte seus recursos; cada VM é uma sala independente; e o serviço é a atividade entregue ao cliente. Se faltar energia no prédio, várias salas param, mas um problema em uma sala não significa necessariamente falha do edifício inteiro.</Analogy>
    <div className="compute-stack">
      <div className="stack-visual">{layers.map(({ title, subtitle, icon: Icon, items }, i) => <button key={title} className={`stack-layer layer-${i} ${active === i ? 'active' : ''}`} onClick={() => setActive(i)}><div className="stack-label"><Icon /><span><strong>{title}</strong><small>{subtitle}</small></span></div><div className="stack-items">{items.map(item => <i key={item}>{item}</i>)}</div></button>)}</div>
      <aside className="stack-explain"><span>CAMADA {4 - active} DE 4</span><h3>{layers[active].title}</h3><p>{[
        'Windows, Linux, bancos e aplicações podem rodar em VMs ou diretamente no hardware. É aqui que a infraestrutura vira valor para alguém.',
        'Uma VM não é uma gaveta no rack. É um computador lógico, com sistema e recursos virtuais, executado pelo hipervisor.',
        'O ESXi compartilha os recursos do host entre VMs. O vCenter coordena hosts e VMs, mas não substitui o hipervisor.',
        'CPU, memória ECC, rede, controladoras e discos fornecem capacidade. Aparência externa não revela a configuração interna.',
      ][active]}</p><div className="connection-note"><Lightbulb /><p><strong>A conexão importante</strong>Quando um serviço falha, a causa pode estar em qualquer camada — inclusive rede e energia.</p></div></aside>
    </div>
    <div className="oob-panel"><div className="oob-server"><HardDrive /><span className="normal-os">SISTEMA<br />OPERACIONAL</span><span className="oob-chip">CIMC · iDRAC · iLO</span></div><div><span className="eyebrow">ACESSO FORA DE BANDA</span><h3>Uma porta lateral para gestão</h3><p>Controladoras independentes do sistema operacional permitem consultar sensores, abrir console remoto e controlar energia — com credencial e procedimento autorizados.</p></div></div>
    <div className="myth"><Info /><p><strong>Redundância não se vê por quantidade.</strong> Fontes duplas, vários discos e múltiplos hosts só são redundantes quando hardware, cabeamento, armazenamento e software estão configurados para suportar falhas.</p></div>
    <div className="deep-dive compute-lesson"><article><span>COMO UMA VM USA O HARDWARE</span><h3>Virtual não significa imaginário</h3><p>A vCPU é agendada sobre CPUs físicas; a memória virtual ocupa RAM do host; a vNIC conecta-se a um switch virtual; e o disco virtual reside em um datastore. As VMs são isoladas, mas ainda disputam capacidade física.</p></article><article><span>ESXi ≠ VCENTER</span><h3>Execução e coordenação</h3><p>O ESXi executa as VMs no host. O vCenter administra vários hosts, permissões e operações. Perder o vCenter não desliga automaticamente VMs; perder um host afeta as VMs nele, salvo mecanismos de alta disponibilidade corretamente configurados.</p></article><article><span>CAMINHO DE UMA REQUISIÇÃO</span><div className="process-chain"><b>NIC física</b><ChevronRight /><b>vSwitch</b><ChevronRight /><b>Port group / VLAN</b><ChevronRight /><b>vNIC</b><ChevronRight /><b>Sistema + aplicação</b></div><p>Cada ponto acrescenta uma evidência possível: link físico, VLAN, estado da vNIC, IP do sistema e processo ouvindo na porta.</p></article></div>
    <TheoryReference title="Hardware, armazenamento e virtualização" columns={[
      ['CPU, RAM ECC e NIC', 'CPU executa instruções; RAM mantém dados de trabalho e ECC detecta/corrige determinados erros; NIC conecta o host à rede. Saturação ou falha de qualquer recurso pode degradar muitas VMs.'],
      ['RAID não é backup', 'RAID 0 prioriza desempenho sem redundância; RAID 1 espelha; RAID 5 usa paridade e tolera uma falha; RAID 6 tolera duas. Nenhum protege sozinho contra exclusão, corrupção lógica ou desastre.'],
      ['Datastore', 'É o armazenamento apresentado ao ESXi para arquivos de VM. Pode ser local ou compartilhado. Latência, falta de espaço ou perda de acesso pode afetar várias VMs simultaneamente.'],
      ['vSwitch e port group', 'O vSwitch comuta tráfego virtual. Port group reúne parâmetros como VLAN e políticas para vNICs. Configuração lógica precisa corresponder ao trunk e às VLANs da rede física.'],
      ['Snapshot', 'Registra um ponto de estado usando discos delta; é útil temporariamente, mas cresce, depende da cadeia anterior e pode degradar desempenho. Não substitui backup.'],
      ['Gestão fora de banda', 'CIMC, iDRAC e iLO funcionam independentemente do sistema operacional, permitindo ver sensores e console. Ainda dependem de energia auxiliar, rede de gestão e autorização.'],
    ]} />
    <ExamBlock chapter="compute" />
  </section>
}

function EvidenceChapter() {
  const [level, setLevel] = useState(0)
  const evidence = [
    { title: 'Foto e etiqueta', icon: SearchCheck, proof: 'Modelo aparente, posição e cabo visível.', example: '“HOST01-VMWARE” está rotulado no chassi.' },
    { title: 'Inventário', icon: BookOpen, proof: 'Patrimônio, serial, garantia, IP de gestão e responsável.', example: 'Confirma qual equipamento físico é aquele.' },
    { title: 'Configuração', icon: Network, proof: 'VLAN, trunk, rota, política, RAID e interfaces.', example: 'Mostra como o equipamento opera agora.' },
    { title: 'Plataforma lógica', icon: Cpu, proof: 'Hosts, VMs, serviços e dependências.', example: 'vCenter, Zabbix, Grafana e backups.' },
    { title: 'Logs e métricas', icon: Activity, proof: 'Comportamento, erro e tendência ao longo do tempo.', example: 'Porta oscilando, disco degradado ou temperatura.' },
  ]
  const CurrentIcon = evidence[level].icon
  return <section className="chapter">
    <ChapterTitle number="CAPÍTULO 05" title="Suba a escada da evidência" lead="Observar é o começo. Confirmar exige cruzar fontes antes de concluir ou agir." icon={SearchCheck} />
      <Analogy>Diagnosticar infraestrutura se parece com investigar um caso. Uma etiqueta é uma pista, não um veredito. Inventário, configuração, logs, métricas e testes são testemunhas diferentes; quando elas concordam, a conclusão fica mais confiável.</Analogy>
    <div className="evidence-layout">
      <div className="evidence-stairs">{evidence.map((item, i) => <button key={item.title} style={{ '--i': i } as React.CSSProperties} className={i === level ? 'active' : ''} onClick={() => setLevel(i)}><span>0{i + 1}</span>{item.title}<ChevronRight /></button>)}</div>
      <div className="evidence-detail" key={level}><div className="evidence-icon"><CurrentIcon /></div><span>NÍVEL DE CONFIANÇA {level + 1}/5</span><h3>{evidence[level].title}</h3><p>{evidence[level].proof}</p><div><strong>O que isso permite afirmar?</strong>{evidence[level].example}</div></div>
    </div>
    <div className="golden-rule"><SearchCheck /><p><span>REGRA DE OURO</span><strong>Descreva primeiro o que foi observado.<br />Só depois conclua a função.</strong>Uma dúvida bem registrada é mais segura que uma suposição apresentada como fato.</p></div>
    <div className="action-checklist"><h3>Antes de tocar em qualquer coisa</h3>{['Identifique equipamento, porta, cabo e serviço afetado.','Confira chamado, autorização, janela, impacto e responsável.','Registre o estado atual e garanta backup quando aplicável.','Defina teste de sucesso e como desfazer a mudança.','Valide o serviço e atualize inventário, mapa e chamado.'].map((item, i) => <div key={item}><span>{i + 1}</span><p>{item}</p></div>)}</div>
    <TheoryReference title="Operação orientada por evidência" columns={[
      ['Sintoma ≠ causa', '“Dashboard indisponível” é sintoma. A causa pode estar em DNS, política, processo, VM, host, armazenamento, rede ou energia. A investigação deve reduzir hipóteses com testes.'],
      ['Escopo e impacto', 'Determine quem é afetado, desde quando, quais serviços e locais. Um usuário sugere problema local; muitos serviços simultâneos sugerem dependência compartilhada, mas ainda exigem confirmação.'],
      ['Mudança e rollback', 'Toda alteração deve ter autorização, risco, janela, plano, teste de sucesso e retorno. Rollback é o caminho previamente preparado para restaurar o estado anterior.'],
      ['Registro técnico', 'Documente horário, fonte da informação, comando ou teste, resultado e próxima ação. Evite frases vagas e atribuição de causa antes da evidência.'],
      ['Correlação', 'Métrica mostra comportamento numérico; log registra eventos; configuração mostra intenção atual; inventário mostra identidade. Cruzar fontes aumenta confiança.'],
      ['Escalonamento', 'Escalone com resumo, impacto, linha do tempo, evidências, ações já feitas e risco. Isso reduz repetição e permite decisão rápida por quem possui autorização.'],
    ]} />
    <ExamBlock chapter="evidence" />
  </section>
}

function Scenario({ quiz, setQuiz, showAnswer, setShowAnswer }: { quiz: number | null; setQuiz: (value: number) => void; showAnswer: boolean; setShowAnswer: (value: boolean) => void }) {
  const options = [
    'Reiniciar o servidor rotulado como MONITORAMENTO.',
    'Trocar o patch cord da porta que parece apagada.',
    'Correlacionar alerta, energia/link, VLAN/IP, política e serviço.',
    'Acionar o bypass da UPS para eliminar energia como causa.',
  ]
  const correct = quiz === 2
  return <section className="chapter scenario">
    <ChapterTitle number="MISSÃO FINAL" title="Um serviço ficou indisponível" lead="Às 14:32, o monitoramento alerta: “Dashboard de telefonia indisponível”. No rack, nenhum alarme sonoro. Qual é o primeiro raciocínio seguro?" icon={CircleGauge} />
    <div className="incident-board"><div className="alert-pulse"><TriangleAlert /><span>INCIDENTE ATIVO<small>14:32:08 · prioridade a confirmar</small></span></div><div className="telemetry"><div><Thermometer /><span>20,8 °C<small>leitura local</small></span></div><div><Power /><span>UPS online<small>estado aparente</small></span></div><div><Network /><span>Link incerto<small>requer evidência</small></span></div></div></div>
    <div className="quiz-card"><span>ESCOLHA UMA AÇÃO</span><h3>O que você faz primeiro?</h3>{options.map((option, i) => <button key={option} className={`${quiz === i ? 'selected' : ''} ${showAnswer && i === 2 ? 'correct' : ''} ${showAnswer && quiz === i && i !== 2 ? 'wrong' : ''}`} onClick={() => { setQuiz(i); setShowAnswer(false) }}><i>{String.fromCharCode(65 + i)}</i>{option}{showAnswer && i === 2 && <Check />}</button>)}<button className="button primary check-answer" disabled={quiz === null} onClick={() => setShowAnswer(true)}>Confirmar decisão <ChevronRight /></button>{showAnswer && <div className={`feedback ${correct ? 'success' : 'retry'}`}><strong>{correct ? 'Boa leitura: investigue por camadas.' : 'Essa ação pula evidências e pode ampliar o impacto.'}</strong><p>{correct ? 'Comece pelo estado físico, avance por enlace, rede, política e serviço. Só aja quando o ponto de falha estiver sustentado por evidências e houver autorização.' : 'Não toque no ambiente com base em aparência. Registre o observado, consulte o chamado e percorra a cadeia de dependências.'}</p></div>}</div>
  </section>
}

function Finish({ complete, setComplete, restart }: { complete: boolean; setComplete: (value: boolean) => void; restart: () => void }) {
  return <section className="finish-screen"><div className="finish-glow" /><div className="finish-badge"><Check /></div><span>ROTA CONCLUÍDA</span><h1>Agora o rack<br />conta uma <em>história.</em></h1><p>Você aprendeu a conectar o que vê no gabinete ao serviço que alguém usa — sem transformar aparência em certeza.</p><div className="takeaways">{[['Rack ≠ servidor','É o endereço físico das camadas.'],['VLAN ≠ segurança','Segmentação precisa de política.'],['PDU ≠ UPS','Distribuir não é sustentar.'],['Foto ≠ verdade atual','Cruze inventário, configuração e métricas.']].map(([title, text]) => <div key={title}><Check /><p><strong>{title}</strong>{text}</p></div>)}</div><label className={`completion-check ${complete ? 'checked' : ''}`}><input type="checkbox" checked={complete} onChange={(event) => setComplete(event.target.checked)} /><span><Check /></span>Confirmo que concluí a ambientação inicial.</label><div className="finish-actions"><button className="button ghost" onClick={restart}><RotateCcw /> Refazer rota</button><a className="button primary" href="/Guia_de_Leitura_do_Rack_Aptum.pdf" target="_blank">Consultar guia original <ExternalLink /></a></div><div className="sources"><span>FONTES PARA APROFUNDAR</span>{sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label}<ExternalLink /></a>)}</div></section>
}

export default App
