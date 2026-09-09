'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

interface EquipamentoItem {
  id: string
  tipo: string
  marca: string | null
  marca_custom: string | null
  modelo: string | null
  patrimonio: string | null
  status: string
  foto_url: string | null
  observacoes: string | null
  qtd_funcionando: number
  qtd_defeito: number
  tem_reserva: boolean
}

interface AuditoriaItem {
  id: string
  created_at: string
  auditor_email: string
  problema_internet_sistema: boolean
  detalhe_internet_sistema: string | null
  problema_PDV_equipamento: boolean
  detalhe_PDV_equipamento: string | null
  problema_fisico: boolean
  detalhe_problema_fisico: string | null
  tipo_unidade: 'loja' | 'er'
  validacao_status: 'pendente' | 'aprovado' | 'ajuste_solicitado'
  parecer_supervisor: string | null
  validado_por: string | null
  validado_em: string | null
  lojas?: { nome: string; codigo_loja: string }
  er?: { nome: string; codigo_er: string }
  equipamentos?: EquipamentoItem[]
}

const PERFIS_QUE_PODEM_VALIDAR = ['admin', 'gestor', 'auditor_chefe']

export default function RelatorioAuditoria() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [verificandoAcesso, setVerificandoAcesso] = useState(true)
  const [usuario, setUsuario] = useState<any>(null)
  const [auditorias, setAuditorias] = useState<AuditoriaItem[]>([])
  const [filtroLoja, setFiltroLoja] = useState('')
  const [filtroStatusEquip, setFiltroStatusEquip] = useState('todos')

  // Estado para controlar quais cards estão expandidos (guarda o ID das auditorias)
  const [cardsExpandidos, setCardsExpandidos] = useState<Record<string, boolean>>({})
  const [fotoModal, setFotoModal] = useState<string | null>(null)
  const [ajusteModal, setAjusteModal] = useState<{ id: string; texto: string } | null>(null)
  const [salvandoValidacao, setSalvandoValidacao] = useState<string | null>(null)

  // Verifica login e permissão antes de liberar o acesso ao relatório
  useEffect(() => {
    async function verificarAcesso() {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        router.replace('/login')
        return
      }

      const { data: perfil } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      const role = perfil?.role || user.user_metadata?.role

      if (!role || !PERFIS_QUE_PODEM_VALIDAR.includes(String(role).toLowerCase())) {
        router.replace('/')
        return
      }

      setUsuario(user)
      setVerificandoAcesso(false)
    }

    verificarAcesso()
  }, [router])

  useEffect(() => {
    if (!verificandoAcesso) {
      carregarRelatorios()
    }
  }, [verificandoAcesso])

  async function carregarRelatorios() {
    setLoading(true)
    const { data, error } = await supabase
      .from('auditorias')
      .select(`
        *,
        lojas (nome, codigo_loja),
        er (nome, codigo_er),
        equipamentos (*)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao carregar relatórios:', error)
      alert('Erro ao carregar dados do relatório: ' + error.message)
    } else if (data) {
      setAuditorias(data as any)
    }
    setLoading(false)
  }

  // Função para alternar entre expandir e recolher um card
  const toggleExpandir = (id: string) => {
    setCardsExpandidos((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  // Aprova a auditoria, liberando o parecer anterior (se houver)
  const handleAprovar = async (id: string) => {
    setSalvandoValidacao(id)
    const validado_em = new Date().toISOString()

    const { error } = await supabase
      .from('auditorias')
      .update({
        validacao_status: 'aprovado',
        parecer_supervisor: null,
        validado_por: usuario?.email ?? null,
        validado_em,
      })
      .eq('id', id)

    if (error) {
      alert('Erro ao aprovar auditoria: ' + error.message)
    } else {
      setAuditorias((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, validacao_status: 'aprovado', parecer_supervisor: null, validado_por: usuario?.email ?? null, validado_em }
            : a
        )
      )
    }
    setSalvandoValidacao(null)
  }

  // Registra um pedido de ajuste com o parecer escrito pelo validador
  const handleConfirmarAjuste = async () => {
    if (!ajusteModal) return

    if (!ajusteModal.texto.trim()) {
      alert('Descreva o que precisa ser ajustado antes de enviar.')
      return
    }

    const { id, texto } = ajusteModal
    setSalvandoValidacao(id)
    const validado_em = new Date().toISOString()
    const parecer = texto.trim()

    const { error } = await supabase
      .from('auditorias')
      .update({
        validacao_status: 'ajuste_solicitado',
        parecer_supervisor: parecer,
        validado_por: usuario?.email ?? null,
        validado_em,
      })
      .eq('id', id)

    if (error) {
      alert('Erro ao solicitar ajuste: ' + error.message)
    } else {
      setAuditorias((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, validacao_status: 'ajuste_solicitado', parecer_supervisor: parecer, validado_por: usuario?.email ?? null, validado_em }
            : a
        )
      )
      setAjusteModal(null)
    }
    setSalvandoValidacao(null)
  }

  const renderBadgeValidacao = (status: AuditoriaItem['validacao_status']) => {
    switch (status) {
      case 'aprovado':
        return (
          <span className="text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
            ✓ Aprovado
          </span>
        )
      case 'ajuste_solicitado':
        return (
          <span className="text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold px-2.5 py-1 rounded-full border border-amber-500/30 flex items-center gap-1">
            ⚠️ Ajuste Solicitado
          </span>
        )
      default:
        return (
          <span className="text-xs bg-blue-500/15 text-blue-700 dark:text-blue-400 font-bold px-2.5 py-1 rounded-full border border-blue-500/30 flex items-center gap-1">
            ⏳ Pendente
          </span>
        )
    }
  }

  // --- CÁLCULO DAS MÉTRICAS DOS KPIS ---
  const totalAuditorias = auditorias.length

  const totalComProblemaInternet = auditorias.filter(
    (a) => a.problema_internet_sistema
  ).length

  let totalEquipamentosOk = 0
  let totalEquipamentosDefeito = 0

  auditorias.forEach((aud) => {
    aud.equipamentos?.forEach((eq) => {
      if (eq.status === 'ok') totalEquipamentosOk++
      if (eq.status === 'defeito') totalEquipamentosDefeito++
    })
  })

  // --- FILTRAGEM ---
  const auditoriasFiltradas = auditorias.filter((aud) => {
    const nomeUnidade = (aud.tipo_unidade === 'er' ? aud.er?.nome : aud.lojas?.nome)?.toLowerCase() || ''
    const matchLoja = nomeUnidade.includes(filtroLoja.toLowerCase())

    if (!matchLoja) return false

    if (filtroStatusEquip !== 'todos') {
      return aud.equipamentos?.some((eq) => eq.status === filtroStatusEquip)
    }

    return true
  })

  if (verificandoAcesso || loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <p className="text-txt-muted font-medium animate-pulse">Carregando relatório...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-bg-primary text-txt-primary p-6 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* CABEÇALHO */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-bg-card text-txt-primary p-5 rounded-xl shadow-sm border border-border-main gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Relatório Auditoria de TI</h1>
            <p className="text-sm text-txt-muted">Visão geral por loja</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 border border-border-main text-txt-secondary hover:bg-bg-primary rounded-lg text-sm font-semibold transition-colors"
          >
            ← Voltar ao Formulário
          </button>
        </div>

        {/* CARDS DE KPIS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-bg-card text-txt-primary p-4 rounded-xl shadow-sm border border-border-main">
            <p className="text-xs font-semibold text-txt-muted uppercase tracking-wider">Total de Auditorias</p>
            <p className="text-3xl font-extrabold mt-1">{totalAuditorias}</p>
          </div>

          <div className="bg-bg-card text-txt-primary p-4 rounded-xl shadow-sm border border-border-main">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Alertas Conexão/Sistema</p>
            <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{totalComProblemaInternet}</p>
          </div>

          <div className="bg-bg-card text-txt-primary p-4 rounded-xl shadow-sm border border-border-main">
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Equipamentos em Defeito</p>
            <p className="text-3xl font-extrabold text-red-600 dark:text-red-400 mt-1">{totalEquipamentosDefeito}</p>
          </div>

          <div className="bg-bg-card text-txt-primary p-4 rounded-xl shadow-sm border border-border-main">
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Equipamentos Operacionais (OK)</p>
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{totalEquipamentosOk}</p>
          </div>
        </div>

        {/* FILTROS DE BUSCA */}
        <div className="bg-bg-card text-txt-primary p-4 rounded-xl shadow-sm border border-border-main flex flex-col md:flex-row gap-4 items-center">
          <input
            type="text"
            placeholder="Buscar por nome da loja ou ER..."
            value={filtroLoja}
            onChange={(e) => setFiltroLoja(e.target.value)}
            className="w-full md:w-1/3 p-2.5 border border-border-main bg-bg-input text-txt-primary placeholder:text-txt-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />

          <select
            value={filtroStatusEquip}
            onChange={(e) => setFiltroStatusEquip(e.target.value)}
            className="w-full md:w-1/4 p-2.5 border border-border-main bg-bg-input text-txt-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="todos">Todos os Status de Equipamentos</option>
            <option value="ok">Apenas com Equipamentos OK</option>
            <option value="defeito">Com Equipamentos em Defeito</option>
            <option value="manutencao">Com Equipamentos em Manutenção</option>
          </select>

          <button
            onClick={carregarRelatorios}
            className="w-full md:w-auto px-4 py-2.5 bg-brand text-white hover:bg-brand-dark rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            Atualizar Dados
          </button>
        </div>

        {/* LISTA DE CARDS DAS LOJAS */}
        <div className="space-y-4">
          {auditoriasFiltradas.length === 0 ? (
            <div className="bg-bg-card text-txt-primary p-8 text-center rounded-xl border border-border-main text-txt-muted">
              Nenhuma auditoria encontrada com os filtros selecionados.
            </div>
          ) : (
            auditoriasFiltradas.map((aud) => {
              const estaExpandido = cardsExpandidos[aud.id] || false
              const qtdEquipamentos = aud.equipamentos?.length || 0
              const nomeUnidade = aud.tipo_unidade === 'er' ? aud.er?.nome : aud.lojas?.nome
              const codigoUnidade = aud.tipo_unidade === 'er' ? aud.er?.codigo_er : aud.lojas?.codigo_loja

              return (
                <div
                  key={aud.id}
                  className="bg-bg-card text-txt-primary rounded-xl shadow-sm border border-border-main overflow-hidden transition-all duration-200"
                >
                  {/* CABEÇALHO DO CARD DA UNIDADE (CLICÁVEL) */}
                  <div
                    onClick={() => toggleExpandir(aud.id)}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-bg-primary/50 gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-txt-muted bg-bg-primary px-1.5 py-0.5 rounded border border-border-main">
                          {aud.tipo_unidade === 'er' ? 'ER' : 'Loja'}
                        </span>
                        <h2 className="text-xl font-bold tracking-tight">
                          {nomeUnidade || 'Unidade Não Identificada'}
                        </h2>
                        {codigoUnidade && (
                          <span className="text-xs font-semibold text-txt-muted bg-bg-primary px-2 py-0.5 rounded border border-border-main">
                            Cód: {codigoUnidade}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-txt-muted">
                        Auditado por <span className="font-semibold text-txt-primary">{aud.auditor_email}</span> em{' '}
                        {new Date(aud.created_at).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(aud.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* BADGES E BOTÃO DE EXPANDIR */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {renderBadgeValidacao(aud.validacao_status)}

                      {aud.problema_internet_sistema && (
                        <span className="text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold px-2.5 py-1 rounded-full border border-amber-500/30">
                          ⚠️ Falha Conexão
                        </span>
                      )}
                      {aud.problema_PDV_equipamento && (
                        <span className="text-xs bg-red-500/15 text-red-600 dark:text-red-400 font-semibold px-2.5 py-1 rounded-full border border-red-500/30">
                          🚨 Alerta PDV
                        </span>
                      )}
                      {aud.problema_fisico && (
                        <span className="text-xs bg-orange-500/15 text-orange-700 dark:text-orange-400 font-semibold px-2.5 py-1 rounded-full border border-orange-500/30">
                          🔧 Danificação Fís.
                        </span>
                      )}

                      <span className="text-xs font-medium text-txt-muted bg-bg-primary px-3 py-1 rounded-lg border border-border-main">
                        {qtdEquipamentos} {qtdEquipamentos === 1 ? 'equipamento' : 'equipamentos'}
                      </span>

                      {/* AÇÕES DE VALIDAÇÃO */}
                      {aud.validacao_status !== 'aprovado' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAprovar(aud.id)
                          }}
                          disabled={salvandoValidacao === aud.id}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
                        >
                          ✓ Aprovar
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setAjusteModal({ id: aud.id, texto: aud.parecer_supervisor ?? '' })
                        }}
                        disabled={salvandoValidacao === aud.id}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
                      >
                        ✏️ Solicitar Ajuste
                      </button>

                      {/* BOTÃO EXPANDIR / RECOLHER */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleExpandir(aud.id)
                        }}
                        className="px-3 py-1.5 border border-border-main text-txt-secondary hover:bg-bg-primary rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        {estaExpandido ? '▲ Recolher' : '▼ Expandir Equipamentos'}
                      </button>
                    </div>
                  </div>

                  {/* PARECER REGISTRADO NA ÚLTIMA VALIDAÇÃO */}
                  {aud.validacao_status === 'ajuste_solicitado' && aud.parecer_supervisor && (
                    <div className="bg-amber-500/10 border-y border-amber-500/20 p-3.5 px-5 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                      <span className="text-base">💬</span>
                      <div>
                        <strong className="font-bold">Parecer enviado ao auditor:</strong>
                        <p className="mt-0.5">{aud.parecer_supervisor}</p>
                      </div>
                    </div>
                  )}

                  {/* CONTEÚDO EXPANDIDO */}
                  {estaExpandido && (
                    <div className="border-t border-border-main bg-bg-primary/30 p-5 space-y-4">
                      {/* Observações dos Problemas */}
                      {(aud.detalhe_internet_sistema || aud.detalhe_PDV_equipamento || aud.detalhe_problema_fisico) && (
                        <div className="bg-bg-card text-txt-primary p-3 rounded-lg text-xs space-y-1 border border-border-main shadow-sm">
                          <p className="font-bold mb-1">Observações da Loja:</p>
                          {aud.detalhe_internet_sistema && (
                            <p><strong className="text-txt-muted">Internet/Sistema:</strong> {aud.detalhe_internet_sistema}</p>
                          )}
                          {aud.detalhe_PDV_equipamento && (
                            <p><strong className="text-txt-muted">PDV/Impressoras:</strong> {aud.detalhe_PDV_equipamento}</p>
                          )}
                          {aud.detalhe_problema_fisico && (
                            <p><strong className="text-txt-muted">Danificação Física:</strong> {aud.detalhe_problema_fisico}</p>
                          )}
                        </div>
                      )}

                      {/* Tabela de Equipamentos da Loja */}
                      <div className="bg-bg-card text-txt-primary rounded-lg border border-border-main shadow-sm overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-bg-primary text-txt-muted uppercase font-semibold border-b border-border-main">
                            <tr>
                              <th className="p-3">Tipo</th>
                              <th className="p-3">Marca / Modelo</th>
                              <th className="p-3">Patrimônio</th>
                              <th className="p-3">Status</th>
                              <th className="p-3">Qtd. Módulos</th>
                              <th className="p-3">Foto / Anexo</th>
                              <th className="p-3">Observação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-main">
                            {qtdEquipamentos === 0 ? (
                              <tr>
                                <td colSpan={7} className="p-4 text-center text-txt-muted">
                                  Nenhum equipamento cadastrado nesta auditoria.
                                </td>
                              </tr>
                            ) : (
                              aud.equipamentos?.map((eq) => (
                                <tr key={eq.id} className="hover:bg-bg-primary/40 transition-colors">
                                  <td className="p-3 font-semibold">{eq.tipo}</td>
                                  <td className="p-3">
                                    {eq.marca_custom ? (
                                      <span className="text-brand font-semibold">{eq.marca_custom}</span>
                                    ) : (
                                      eq.marca || '-'
                                    )}
                                    {eq.modelo ? ` (${eq.modelo})` : ''}
                                  </td>
                                  <td className="p-3 font-mono text-txt-muted">{eq.patrimonio || '-'}</td>
                                  <td className="p-3">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${eq.status === 'ok'
                                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                          : eq.status === 'defeito'
                                            ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30'
                                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                                        }`}
                                    >
                                      {eq.status}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    {(eq.tipo === 'Mobshop' || eq.tipo === 'Mobpin') ? (
                                      <span>
                                        {eq.qtd_funcionando} OK / {eq.qtd_defeito} Defeito{' '}
                                        {eq.tem_reserva ? '(c/ reserva)' : '(s/ reserva)'}
                                      </span>
                                    ) : (
                                      '-'
                                    )}
                                  </td>
                                  <td className="p-3">
                                    {eq.foto_url ? (
                                      <button
                                        onClick={() => setFotoModal(eq.foto_url)}
                                        className="text-brand font-semibold hover:underline bg-brand/10 px-2 py-1 rounded"
                                      >
                                        📷 Ver Foto
                                      </button>
                                    ) : (
                                      <span className="text-txt-muted">Sem foto</span>
                                    )}
                                  </td>
                                  <td className="p-3 max-w-xs truncate text-txt-muted">{eq.observacoes || '-'}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* MODAL PARA SOLICITAR AJUSTE */}
      {ajusteModal && (
        <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-bg-card text-txt-primary rounded-xl p-4 max-w-lg w-full space-y-3 border border-border-main shadow-xl">
            <div className="flex justify-between items-center border-b border-border-main pb-2">
              <h3 className="font-bold text-sm">Solicitar Ajuste</h3>
              <button
                onClick={() => setAjusteModal(null)}
                className="text-txt-muted hover:text-txt-primary font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-txt-muted">
              Descreva o que precisa ser corrigido. O auditor verá esse parecer em "Minhas Auditorias".
            </p>
            <textarea
              rows={4}
              autoFocus
              placeholder="Ex: Falta foto do equipamento com defeito na aba Mobshop..."
              value={ajusteModal.texto}
              onChange={(e) => setAjusteModal({ ...ajusteModal, texto: e.target.value })}
              className="w-full p-2.5 border border-border-main rounded-md bg-bg-input text-txt-primary text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setAjusteModal(null)}
                className="flex-1 py-2 border border-border-main text-txt-secondary hover:bg-bg-primary rounded text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarAjuste}
                disabled={salvandoValidacao === ajusteModal.id}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {salvandoValidacao === ajusteModal.id ? 'Enviando...' : 'Enviar Parecer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA VER A FOTO DO EQUIPAMENTO */}
      {fotoModal && (
        <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-bg-card text-txt-primary rounded-xl p-4 max-w-lg w-full space-y-3 border border-border-main shadow-xl">
            <div className="flex justify-between items-center border-b border-border-main pb-2">
              <h3 className="font-bold text-sm">Foto Anexada</h3>
              <button
                onClick={() => setFotoModal(null)}
                className="text-txt-muted hover:text-txt-primary font-bold"
              >
                ✕
              </button>
            </div>
            <img src={fotoModal} alt="Foto do Equipamento" className="w-full max-h-[70vh] object-contain rounded bg-bg-primary" />
            <button
              onClick={() => setFotoModal(null)}
              className="w-full py-2 bg-brand text-white hover:bg-brand-dark rounded text-xs font-semibold transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </main>
  )
}