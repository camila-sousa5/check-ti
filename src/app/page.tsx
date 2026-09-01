'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { ThemeToggle } from './components/ThemeToggle'

// Tipos de Equipamento e suas respectivas marcas
const TIPOS_EQUIPAMENTO = [
  {
    id: 'Celular',
    nome: 'Celular da loja',
    marcas: ['Samsung', 'Apple', 'Outro / Não listado'],
  },
  {
    id: 'Mobshop',
    nome: 'Mobshop',
    marcas: ['Samsung', 'Outro / Não listado'],
  },
  {
    id: 'Mobpin',
    nome: 'Mobpin',
    marcas: ['Mooz', 'Outro / Não listado'],
  },
  {
    id: 'ImpressoraPreco',
    nome: 'Impressora de Preço',
    marcas: ['Zebra ZD220', 'Outro / Não listado'],
  },
  {
    id: 'ImpressoraCupom',
    nome: 'Impressora de Cupom',
    marcas: ['MP4200', 'Outro / Não listado'],
  },
  {
    id: 'Nobreak',
    nome: 'Nobreak',
    marcas: ['APC', 'SMS', 'Outro / Não listado'],
  },
  {
    id: 'Tablet',
    nome: 'Tablet',
    marcas: ['Samsung', 'Lenovo', 'Outro / Não listado'],
  },
]

// Lista consolidada de todas as abas
const ABAS = [
  { id: 'geral', nome: 'Geral' },
  ...TIPOS_EQUIPAMENTO.map((t) => ({ id: t.id, nome: t.nome })),
]

interface Loja {
  id: string
  nome: string
  codigo_loja?: string
}

export default function AuditoriaForm() {
  const router = useRouter()
  const [podeVerRelatorio, setPodeVerRelatorio] = useState(false)
  const [usuario, setUsuario] = useState<any>(null)
  const [checandoAuth, setChecandoAuth] = useState(true)

  const [lojas, setLojas] = useState<Loja[]>([])
  const [erroLoja, setErroLoja] = useState<string | null>(null)
  const [lojaSelecionada, setLojaSelecionada] = useState('')
  const [abaAtual, setAbaAtual] = useState(0)
  const [carregando, setCarregando] = useState(false)

  // 1. Verificação Única de Autenticação e Permissões
  useEffect(() => {
    async function inicializarAuth() {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        console.log('Sem usuário autenticado. Redirecionando...')
        router.replace('/login')
        return
      }

      setUsuario(user)

      // 🔴 1. VERIFICAÇÃO VIA METADATA NATIVA DO SUPABASE (Opcional se você salvou a role ao criar o usuário)
      const roleUserMetadata = user.user_metadata?.role

      // 🔴 2. BUSCA DA ROLE NO BANCO DE DADOS
      // Verifique se a sua tabela chama 'users' ou 'profiles'
      const { data: perfil, error: perfilError } = await supabase
        .from('profiles') // ⚠️ Se sua tabela for 'profiles', mude para 'profiles'
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (perfilError) {
        console.error('Erro ao buscar perfil do usuário no Supabase:', perfilError.message)
      }

      console.log('Dados do usuário autenticado:', user)
      console.log('Perfil retornado da tabela:', perfil)

      // Pega a role vinda da tabela ou da metadata do auth
      const userRole = perfil?.role || roleUserMetadata

      console.log('Role identificada:', userRole)

      const perfisPermitidos = ['admin', 'gestor', 'auditor_chefe']

      // Compara ignorando diferenças de maiúsculas/minúsculas
      if (userRole && perfisPermitidos.includes(String(userRole).toLowerCase())) {
        console.log('✅ Permissão concedida! Exibindo botão de relatório.')
        setPodeVerRelatorio(true)
      } else {
        console.warn('❌ Permissão negada para o perfil:', userRole)
      }

      setChecandoAuth(false)
    }

    inicializarAuth()
  }, [router])

  // Estado das perguntas gerais da loja
  const [dadosGerais, setDadosGerais] = useState({
    problema_internet_sistema: false,
    detalhe_internet_sistema: '',
    problema_PDV_equipamento: false,
    detalhe_PDV_equipamento: '',
    problema_fisico: false,
    detalhe_problema_fisico: '',
  })

  // Estado dos equipamentos
  const [dadosFormulario, setDadosFormulario] = useState<Record<string, any>>({
    Celular: { marca: '', marca_custom: '', modelo: '', patrimonio: '', status: 'ok', observacoes: '', foto: null },
    Mobshop: { marca: '', marca_custom: '', modelo: '', patrimonio: '', status: 'ok', observacoes: '', foto: null, qtd_funcionando: 0, qtd_defeito: 0, tem_reserva: false },
    Mobpin: { marca: '', marca_custom: '', modelo: '', patrimonio: '', status: 'ok', observacoes: '', foto: null, qtd_funcionando: 0, qtd_defeito: 0, tem_reserva: false },
    ImpressoraPreco: { marca: '', marca_custom: '', modelo: '', patrimonio: '', status: 'ok', observacoes: '', foto: null },
    ImpressoraCupom: { marca: '', marca_custom: '', modelo: '', patrimonio: '', status: 'ok', observacoes: '', foto: null },
    Nobreak: { marca: '', marca_custom: '', modelo: '', patrimonio: '', status: 'ok', observacoes: '', foto: null },
    Tablet: { marca: '', marca_custom: '', modelo: '', patrimonio: '', status: 'ok', observacoes: '', foto: null },
  })

  // 2. Busca a lista de lojas no Supabase
  useEffect(() => {
    async function carregarLojas() {
      setErroLoja(null)

      const { data, error } = await supabase
        .from('lojas')
        .select('*')
        .order('nome')

      if (error) {
        console.error('Erro ao buscar lojas:', error)
        setErroLoja(error.message)
      } else if (data) {
        setLojas(data)
      }
    }

    if (usuario) {
      carregarLojas()
    }
  }, [usuario])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const handleChange = (tipo: string, campo: string, valor: any) => {
    setDadosFormulario((prev) => ({
      ...prev,
      [tipo]: {
        ...prev[tipo],
        [campo]: valor,
      },
    }))
  }

  // 3. Envio final da auditoria com validação reforçada
  const handleSubmit = async () => {
    if (!lojaSelecionada) {
      alert('Por favor, selecione uma loja.')
      setAbaAtual(0) // Redireciona para a aba Geral onde está a seleção da loja
      return
    }

    // Validação de fotos e marcas customizadas
    for (const tipoObj of TIPOS_EQUIPAMENTO) {
      const item = dadosFormulario[tipoObj.id]
      if (item.marca === 'Outro / Não listado') {
        if (!item.marca_custom?.trim()) {
          alert(`Por favor, especifique a marca/modelo para "${tipoObj.nome}".`)
          return
        }
        if (!item.foto) {
          alert(`Por favor, adicione uma foto para o equipamento "${tipoObj.nome}" ao selecionar "Outro / Não listado".`)
          return
        }
      }
    }

    setCarregando(true)
    let auditoriaIdCriada: string | null = null

    try {
      const { data: auditoria, error: errAuditoria } = await supabase
        .from('auditorias')
        .insert([
          {
            loja_id: lojaSelecionada,
            user_id: usuario?.id,
            auditor_email: usuario?.email,
            status: 'concluida',
            problema_internet_sistema: dadosGerais.problema_internet_sistema,
            detalhe_internet_sistema: dadosGerais.problema_internet_sistema ? dadosGerais.detalhe_internet_sistema : null,
            problema_PDV_equipamento: dadosGerais.problema_PDV_equipamento,
            detalhe_PDV_equipamento: dadosGerais.problema_PDV_equipamento ? dadosGerais.detalhe_PDV_equipamento : null,
            problema_fisico: dadosGerais.problema_fisico,
            detalhe_problema_fisico: dadosGerais.problema_fisico ? dadosGerais.detalhe_problema_fisico : null,
            concluded_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (errAuditoria) throw errAuditoria
      auditoriaIdCriada = auditoria.id

      for (const tipoObj of TIPOS_EQUIPAMENTO) {
        const item = dadosFormulario[tipoObj.id]
        let fotoUrl = null

        if (item.foto) {
          const fileExt = item.foto.name?.split('.').pop()?.toLowerCase() || 'jpg'
          const fileName = `${auditoria.id}_${tipoObj.id}_${Date.now()}.${fileExt}`

          const { error: errUpload } = await supabase.storage
            .from('fotos-equipamentos')
            .upload(fileName, item.foto, {
              cacheControl: '3600',
              upsert: true,
              contentType: item.foto.type || 'image/jpeg',
            })

          if (errUpload) {
            throw new Error(`Falha no upload da foto (${tipoObj.nome}): ${errUpload.message}`)
          }

          const { data: publicUrlData } = supabase.storage
            .from('fotos-equipamentos')
            .getPublicUrl(fileName)

          fotoUrl = publicUrlData.publicUrl
        }

        const marcaFinal =
          item.marca === 'Outro / Não listado' || item.marca === 'Sem Marca / Não informada' || !item.marca
            ? null
            : item.marca

        const payloadEquipamento: Record<string, any> = {
          auditoria_id: auditoria.id,
          loja_id: lojaSelecionada,
          tipo: tipoObj.id,
          marca: marcaFinal,
          marca_custom: item.marca === 'Outro / Não listado' ? item.marca_custom : null,
          modelo: item.modelo || null,
          patrimonio: item.patrimonio || null,
          status: item.status,
          observacoes: item.observacoes || null,
          foto_url: fotoUrl,
        }

        if (tipoObj.id === 'Mobshop' || tipoObj.id === 'Mobpin') {
          payloadEquipamento.qtd_funcionando = Number(item.qtd_funcionando) || 0
          payloadEquipamento.qtd_defeito = Number(item.qtd_defeito) || 0
          payloadEquipamento.tem_reserva = Boolean(item.tem_reserva)
        }

        const { error: errEquipamento } = await supabase
          .from('equipamentos')
          .insert([payloadEquipamento])

        if (errEquipamento) throw errEquipamento
      }

      alert('Auditoria salva com sucesso!')
      router.push('/sucesso')
    } catch (error: any) {
      if (auditoriaIdCriada) {
        // Rollback simples caso algo falhe no envio dos equipamentos
        await supabase.from('auditorias').delete().eq('id', auditoriaIdCriada)
      }
      alert('Erro ao salvar auditoria: ' + error.message)
    } finally {
      setCarregando(false)
    }
  }

  if (checandoAuth) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-500 font-medium">Carregando...</p>
      </div>
    )
  }

  const equipamentoAtual = abaAtual > 0 ? TIPOS_EQUIPAMENTO[abaAtual - 1] : null
  const dadosAtuais = equipamentoAtual ? dadosFormulario[equipamentoAtual.id] : null

  return (
    <main className="min-h-screen bg-bg-primary p-4 pb-12 text-txt-primary transition-colors duration-200">
      <div className="max-w-xl mx-auto bg-bg-card rounded-xl shadow-md p-6 border border-border-main">
        {/* CABEÇALHO */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 pb-4 border-b border-border-main">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-txt-primary">Auditoria de TI</h1>
              <p className="text-xs text-txt-muted">Sessão ativa</p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
            <ThemeToggle />
            <span className="text-xs font-semibold text-txt-secondary bg-bg-primary px-2.5 py-1 rounded-md border border-border-main truncate max-w-[160px] sm:max-w-none">
              {usuario?.email}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs font-medium text-red-500 hover:text-red-400 hover:underline shrink-0"
            >
              Sair
            </button>
          </div>
        </div>

        {podeVerRelatorio && (
          <div className="mb-6">
            <button
              type="button"
              onClick={() => router.push('/relatorio')}
              className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Ver Relatórios
            </button>
          </div>
        )}

        {/* 1. SELEÇÃO DA LOJA */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2 text-txt-primary">Loja *</label>
          <select
            value={lojaSelecionada}
            onChange={(e) => setLojaSelecionada(e.target.value)}
            className="w-full p-3 border border-border-main rounded-lg bg-bg-input text-txt-primary focus:ring-2 focus:ring-brand"
          >
            <option value="">-- Escolha a Loja --</option>
            {lojas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.codigo_loja ? `[${l.codigo_loja}] ` : ''}
                {l.nome}
              </option>
            ))}
          </select>

          {erroLoja && (
            <p className="text-xs text-red-500 mt-1 font-mono">
              Erro ao carregar lojas: {erroLoja}
            </p>
          )}
        </div>

        {/* 2. NAVEGAÇÃO DAS ABAS */}
        <div className="flex border-b border-border-main mb-6 overflow-x-auto">
          {ABAS.map((aba, idx) => (
            <button
              key={aba.id}
              type="button"
              onClick={() => setAbaAtual(idx)}
              className={`flex-1 py-3 px-3 text-xs font-semibold text-center border-b-2 whitespace-nowrap transition-colors ${abaAtual === idx
                ? 'border-brand text-brand font-bold'
                : 'border-transparent text-txt-muted hover:text-txt-secondary'
                }`}
            >
              {idx === 0 ? 'Geral' : aba.nome}
            </button>
          ))}
        </div>

        {/* 3. CONTEÚDO DA ABA ATIVA */}
        {abaAtual === 0 ? (
          /* ABA GERAL */
          <div className="space-y-4">
            <h2 className="text-base font-bold text-txt-primary border-b border-border-main pb-2">
              Perguntas Gerais da Unidade
            </h2>

            {/* Problema Internet */}
            <div className="p-4 bg-bg-primary border border-border-main rounded-lg space-y-3">
              <label className="block text-sm font-semibold text-txt-primary">
                Teve algum problema com a internet recentemente?
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer text-txt-secondary">
                  <input
                    type="radio"
                    name="internet"
                    checked={dadosGerais.problema_internet_sistema === true}
                    onChange={() => setDadosGerais({ ...dadosGerais, problema_internet_sistema: true })}
                    className="w-4 h-4 text-brand"
                  />
                  Sim (Houve Problema)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer text-txt-secondary">
                  <input
                    type="radio"
                    name="internet"
                    checked={dadosGerais.problema_internet_sistema === false}
                    onChange={() =>
                      setDadosGerais({ ...dadosGerais, problema_internet_sistema: false, detalhe_internet_sistema: '' })
                    }
                    className="w-4 h-4 text-brand"
                  />
                  Não / Estável
                </label>
              </div>

              {dadosGerais.problema_internet_sistema && (
                <textarea
                  rows={2}
                  placeholder="Descreva o problema (ex: Quedas constantes à tarde, lentidão...)"
                  value={dadosGerais.detalhe_internet_sistema}
                  onChange={(e) => setDadosGerais({ ...dadosGerais, detalhe_internet_sistema: e.target.value })}
                  className="w-full p-2.5 border border-border-main rounded-md bg-bg-input text-txt-primary text-sm mt-2"
                />
              )}
            </div>

            {/* Problema PDV */}
            <div className="p-4 bg-bg-primary border border-border-main rounded-lg space-y-3">
              <label className="block text-sm font-semibold text-txt-primary">
                O PDV ou a impressora apresentaram falhas recentemente?
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer text-txt-secondary">
                  <input
                    type="radio"
                    name="pdv"
                    checked={dadosGerais.problema_PDV_equipamento === true}
                    onChange={() => setDadosGerais({ ...dadosGerais, problema_PDV_equipamento: true })}
                    className="w-4 h-4 text-brand"
                  />
                  Sim (Apresentou Falha)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer text-txt-secondary">
                  <input
                    type="radio"
                    name="pdv"
                    checked={dadosGerais.problema_PDV_equipamento === false}
                    onChange={() =>
                      setDadosGerais({ ...dadosGerais, problema_PDV_equipamento: false, detalhe_PDV_equipamento: '' })
                    }
                    className="w-4 h-4 text-brand"
                  />
                  Não / Normal
                </label>
              </div>

              {dadosGerais.problema_PDV_equipamento && (
                <textarea
                  rows={2}
                  placeholder="Descreva o problema com o sistema ou PDV..."
                  value={dadosGerais.detalhe_PDV_equipamento}
                  onChange={(e) => setDadosGerais({ ...dadosGerais, detalhe_PDV_equipamento: e.target.value })}
                  className="w-full p-2.5 border border-border-main rounded-md bg-bg-input text-txt-primary text-sm mt-2"
                />
              )}
            </div>

            {/* Problema Físico */}
            <div className="p-4 bg-bg-primary border border-border-main rounded-lg space-y-3">
              <label className="block text-sm font-semibold text-txt-primary">
                Há algum problema físico (cabos, teclado, leitor de código de barras) a relatar?
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer text-txt-secondary">
                  <input
                    type="radio"
                    name="fisico"
                    checked={dadosGerais.problema_fisico === true}
                    onChange={() => setDadosGerais({ ...dadosGerais, problema_fisico: true })}
                    className="w-4 h-4 text-brand"
                  />
                  Sim
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer text-txt-secondary">
                  <input
                    type="radio"
                    name="fisico"
                    checked={dadosGerais.problema_fisico === false}
                    onChange={() =>
                      setDadosGerais({ ...dadosGerais, problema_fisico: false, detalhe_problema_fisico: '' })
                    }
                    className="w-4 h-4 text-brand"
                  />
                  Não / Sem Danos
                </label>
              </div>

              {dadosGerais.problema_fisico && (
                <textarea
                  rows={2}
                  placeholder="Descreva o problema físico..."
                  value={dadosGerais.detalhe_problema_fisico}
                  onChange={(e) => setDadosGerais({ ...dadosGerais, detalhe_problema_fisico: e.target.value })}
                  className="w-full p-2.5 border border-border-main rounded-md bg-bg-input text-txt-primary text-sm mt-2"
                />
              )}
            </div>
          </div>
        ) : (
          /* ABAS DOS EQUIPAMENTOS */
          equipamentoAtual && dadosAtuais && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-txt-primary border-b border-border-main pb-2">
                Detalhamento: {equipamentoAtual.nome}
              </h2>

              {/* SE FOR MOBSHOP OU MOBPIN */}
              {(equipamentoAtual.id === 'Mobshop' || equipamentoAtual.id === 'Mobpin') && (
                <div className="p-4 bg-brand-light border border-brand-accent rounded-lg space-y-4">
                  <h3 className="text-sm font-bold text-brand-dark border-b border-brand-accent pb-1">
                    Contagem de Unidades ({equipamentoAtual.nome})
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-txt-secondary">
                        Qtd. Funcionando
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={dadosAtuais.qtd_funcionando ?? 0}
                        onChange={(e) => {
                          const qtd = Number(e.target.value)
                          handleChange(equipamentoAtual.id, 'qtd_funcionando', qtd)
                          const defeitos = Number(dadosAtuais.qtd_defeito ?? 0)
                          const novoStatus = defeitos > 0 ? 'defeito' : 'ok'
                          handleChange(equipamentoAtual.id, 'status', novoStatus)
                        }}
                        className="w-full p-2.5 border border-border-main rounded-lg bg-bg-input text-txt-primary text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1 text-txt-secondary">
                        Qtd. com Defeito
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={dadosAtuais.qtd_defeito ?? 0}
                        onChange={(e) => {
                          const defeitos = Number(e.target.value)
                          handleChange(equipamentoAtual.id, 'qtd_defeito', defeitos)
                          const novoStatus = defeitos > 0 ? 'defeito' : 'ok'
                          handleChange(equipamentoAtual.id, 'status', novoStatus)
                        }}
                        className="w-full p-2.5 border border-border-main rounded-lg bg-bg-input text-txt-primary text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-txt-secondary">
                      Possui dispositivo reserva na loja?
                    </label>
                    <div className="flex gap-4 mt-1">
                      <label className="flex items-center gap-2 text-sm cursor-pointer text-txt-secondary">
                        <input
                          type="radio"
                          name={`reserva_${equipamentoAtual.id}`}
                          checked={dadosAtuais.tem_reserva === true}
                          onChange={() => handleChange(equipamentoAtual.id, 'tem_reserva', true)}
                          className="w-4 h-4 text-brand"
                        />
                        Sim
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer text-txt-secondary">
                        <input
                          type="radio"
                          name={`reserva_${equipamentoAtual.id}`}
                          checked={dadosAtuais.tem_reserva === false}
                          onChange={() => handleChange(equipamentoAtual.id, 'tem_reserva', false)}
                          className="w-4 h-4 text-brand"
                        />
                        Não
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Marca */}
              <div>
                <label className="block text-sm font-medium mb-1 text-txt-primary">
                  Marca <span className="text-xs text-txt-muted font-normal">(opcional)</span>
                </label>
                <select
                  value={dadosAtuais.marca}
                  onChange={(e) => handleChange(equipamentoAtual.id, 'marca', e.target.value)}
                  className="w-full p-3 border border-border-main rounded-lg bg-bg-input text-txt-primary text-sm"
                >
                  <option value="">Selecione ou deixe em branco...</option>
                  {equipamentoAtual.marcas.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Marca Customizada e Foto */}
              {dadosAtuais.marca === 'Outro / Não listado' && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-amber-600 dark:text-amber-400">
                      Descreva a Marca/Modelo *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Xiaomi, Asus, TP-Link..."
                      value={dadosAtuais.marca_custom}
                      onChange={(e) => handleChange(equipamentoAtual.id, 'marca_custom', e.target.value)}
                      className="w-full p-2.5 border border-border-main rounded-md bg-bg-input text-txt-primary text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-amber-600 dark:text-amber-400">
                      Foto do Equipamento *
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) =>
                        handleChange(equipamentoAtual.id, 'foto', e.target.files?.[0] || null)
                      }
                      className="w-full text-xs text-txt-muted file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-600 file:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Modelo */}
              <div>
                <label className="block text-sm font-medium mb-1 text-txt-primary">Modelo</label>
                <input
                  type="text"
                  placeholder="Ex: Galaxy A14 / Vostro 3400"
                  value={dadosAtuais.modelo}
                  onChange={(e) => handleChange(equipamentoAtual.id, 'modelo', e.target.value)}
                  className="w-full p-3 border border-border-main rounded-lg bg-bg-input text-txt-primary text-sm"
                />
              </div>

              {/* Patrimônio */}
              <div>
                <label className="block text-sm font-medium mb-1 text-txt-primary">Patrimônio</label>
                <input
                  type="text"
                  placeholder="Ex: PAT-00123"
                  value={dadosAtuais.patrimonio}
                  onChange={(e) => handleChange(equipamentoAtual.id, 'patrimonio', e.target.value)}
                  className="w-full p-3 border border-border-main rounded-lg bg-bg-input text-txt-primary text-sm"
                />
              </div>

              {/* STATUS GERAL - EXIBIDO APENAS SE NÃO FOR MOBSHOP NEM MOBPIN */}
              {equipamentoAtual.id !== 'Mobshop' && equipamentoAtual.id !== 'Mobpin' && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-txt-primary">
                    Status Geral do Equipamento *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'OK', val: 'ok' },
                      { label: 'Defeito', val: 'defeito' },
                      { label: 'Manutenção', val: 'manutencao' },
                    ].map((st) => (
                      <button
                        key={st.val}
                        type="button"
                        onClick={() => handleChange(equipamentoAtual.id, 'status', st.val)}
                        className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${dadosAtuais.status === st.val
                          ? 'bg-brand text-white border-brand'
                          : 'border-border-main text-txt-secondary hover:bg-bg-primary'
                          }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium mb-1 text-txt-primary">Observações</label>
                <textarea
                  rows={2}
                  placeholder="Algum detalhe adicional..."
                  value={dadosAtuais.observacoes}
                  onChange={(e) => handleChange(equipamentoAtual.id, 'observacoes', e.target.value)}
                  className="w-full p-3 border border-border-main rounded-lg bg-bg-input text-txt-primary text-sm"
                />
              </div>
            </div>
          )
        )}

        {/* 4. BOTÕES DE NAVEGAÇÃO */}
        <div className="flex justify-between items-center mt-8 pt-4 border-t border-border-main">
          <button
            type="button"
            disabled={abaAtual === 0}
            onClick={() => setAbaAtual((prev) => prev - 1)}
            className="px-4 py-2 border border-border-main rounded-lg text-sm text-txt-secondary disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed hover:bg-bg-primary"
          >
            Voltar
          </button>

          {abaAtual < ABAS.length - 1 ? (
            <button
              type="button"
              onClick={() => setAbaAtual((prev) => prev + 1)}
              className="px-5 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-dark cursor-pointer transition-colors"
            >
              Próxima Aba →
            </button>
          ) : (
            <button
              type="button"
              disabled={carregando}
              onClick={handleSubmit}
              className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer transition-colors"
            >
              {carregando ? 'Salvando...' : 'Finalizar Auditoria'}
            </button>
          )}
        </div>
      </div>
    </main>
  )
}