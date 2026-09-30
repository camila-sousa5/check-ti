import { NextResponse } from 'next/server'
import { enviarChatPrivado } from '../../../lib/notificarChatPrivado'

export async function POST(req: Request) {
  try {
    const { emailDestinatario, unidade, auditor, tipoUnidade } = await req.json()

    await enviarChatPrivado({
      emailDestinatario,
      unidade,
      auditor,
      tipoUnidade,
    })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Erro na API de notificação:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}