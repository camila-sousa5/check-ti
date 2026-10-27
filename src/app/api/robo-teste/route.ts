import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const DIAS_RETENCAO = 7
const OBS_TESTE = '[TESTE] Registro automático do robô'

const TIPOS_LOJA = [
  'Celular', 'Mobshop', 'Mobpin', 'ImpressoraPreco', 'ImpressoraCupom',
  'NobreakRack', 'NobreakPDV', 'Tablet', 'TotemCarregamento', 'SomLoja', 'VelocidadeWifi',
]

const TIPOS_ER = [
  'Celular', 'CelularVDI', 'ImpressoraPreco', 'ImpressoraCupom',
  'NobreakRack', 'NobreakPDV', 'Tablet', 'TotemCarregamento', 'SomLoja', 'VelocidadeWifi',
]

const TIPOS_CONTAGEM = ['Mobshop', 'Mobpin', 'CelularVDI']

function montarEquipamento(tipo: string, base: Record<string, any>) {
  const payload: Record<string, any> = {
    ...base,
    tipo,
    marca: null,
    marca_custom: null,
    modelo: null,
    patrimonio: null,
    status: 'ok',
    observacoes: OBS_TESTE,
    foto_url: null,
  }

  if (TIPOS_CONTAGEM.includes(tipo)) {
    payload.qtd_funcionando = 3
    payload.qtd_defeito = 0
    payload.tem_reserva = false
    payload.qtd_reserva = 0
  } else if (tipo === 'VelocidadeWifi') {
    payload.observacoes = `PDV: 50 Mbps | Loja: 100 Mbps. - Obs: ${OBS_TESTE}`
  } else if (tipo !== 'TotemCarregamento' && tipo !== 'SomLoja') {
    payload.modelo = 'Modelo Teste'
    payload.patrimonio = `TESTE-${tipo}`
  }

  return payload
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ status: 'não autorizado' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const roboUserId = process.env.ROBO_TESTE_USER_ID
  const roboEmail = process.env.ROBO_TESTE_EMAIL

  if (!url || !serviceKey || !roboUserId || !roboEmail) {
    return NextResponse.json(
      { status: 'erro', mensagem: 'Variáveis de ambiente do robô não configuradas' },
      { status: 500 }
    )
  }

  // service_role ignora RLS: este client só pode existir no servidor
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  let auditoriaId: string | null = null

  try {
    // Alterna entre loja (execução da manhã) e ER (execução da noite)
    const tipoUnidade: 'loja' | 'er' = new Date().getUTCHours() < 12 ? 'loja' : 'er'
    const tabelaUnidade = tipoUnidade === 'loja' ? 'lojas' : 'er'

    const { data: unidade, error: erroUnidade } = await admin
      .from(tabelaUnidade)
      .select('id, nome')
      .order('nome')
      .limit(1)
      .maybeSingle()

    if (erroUnidade) throw erroUnidade
    if (!unidade) throw new Error(`Nenhuma unidade encontrada em "${tabelaUnidade}"`)

    const agora = new Date().toISOString()

    const { data: auditoria, error: erroAuditoria } = await admin
      .from('auditorias')
      .insert({
        is_teste: true,
        tipo_unidade: tipoUnidade,
        loja_id: tipoUnidade === 'loja' ? unidade.id : null,
        er_id: tipoUnidade === 'er' ? unidade.id : null,
        user_id: roboUserId,
        auditor_email: roboEmail,
        status: 'concluida',
        problema_internet_sistema: false,
        detalhe_internet_sistema: null,
        problema_PDV_equipamento: false,
        detalhe_PDV_equipamento: null,
        problema_fisico: false,
        detalhe_problema_fisico: null,
        concluded_at: agora,
      })
      .select('id')
      .single()

    if (erroAuditoria) throw erroAuditoria
    auditoriaId = auditoria.id

    const base = {
      auditoria_id: auditoria.id,
      tipo_unidade: tipoUnidade,
      loja_id: tipoUnidade === 'loja' ? unidade.id : null,
      er_id: tipoUnidade === 'er' ? unidade.id : null,
      is_teste: true,
    }

    const tipos = tipoUnidade === 'loja' ? TIPOS_LOJA : TIPOS_ER
    const equipamentos = tipos.map((tipo) => montarEquipamento(tipo, base))

    const { error: erroEquipamentos } = await admin.from('equipamentos').insert(equipamentos)
    if (erroEquipamentos) throw erroEquipamentos

    // Limpeza: remove auditorias de teste mais antigas que DIAS_RETENCAO
    const limite = new Date(Date.now() - DIAS_RETENCAO * 24 * 60 * 60 * 1000).toISOString()

    const { data: antigas, error: erroAntigas } = await admin
      .from('auditorias')
      .select('id')
      .eq('is_teste', true)
      .lt('concluded_at', limite)

    if (erroAntigas) throw erroAntigas

    const idsAntigos = (antigas ?? []).map((a) => a.id)
    if (idsAntigos.length > 0) {
      const { error: erroDelEq } = await admin
        .from('equipamentos')
        .delete()
        .in('auditoria_id', idsAntigos)
      if (erroDelEq) throw erroDelEq

      const { error: erroDelAud } = await admin
        .from('auditorias')
        .delete()
        .in('id', idsAntigos)
      if (erroDelAud) throw erroDelAud
    }

    console.log(`[robo-teste] auditoria ${auditoria.id} criada (${tipoUnidade}: ${unidade.nome}); ${idsAntigos.length} antigas removidas`)

    return NextResponse.json({
      status: 'ok',
      auditoriaId: auditoria.id,
      tipoUnidade,
      unidade: unidade.nome,
      removidas: idsAntigos.length,
    })
  } catch (error: any) {
    console.error('[robo-teste] falha:', error)

    // Desfaz a auditoria parcial, se ela chegou a ser criada
    if (auditoriaId) {
      await admin.from('equipamentos').delete().eq('auditoria_id', auditoriaId)
      await admin.from('auditorias').delete().eq('id', auditoriaId)
    }

    return NextResponse.json({ status: 'erro', mensagem: error.message }, { status: 500 })
  }
}