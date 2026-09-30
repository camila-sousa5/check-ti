import { google } from 'googleapis'

export async function enviarChatPrivado(dados: {
  emailDestinatario: string
  unidade: string
  auditor: string
  tipoUnidade: string
}) {
  try {
    const privateKey = process.env.GOOGLE_PRIVATE_KEY
      ? process.env.GOOGLE_PRIVATE_KEY.replace(/^"(.*)"$/, '$1').replace(/\\n/g, '\n')
      : undefined

    const emailRemetente = process.env.CHAT_DWD_SUBJECT || 'integracao@gruponatureza.com'

    if (!privateKey || !process.env.GOOGLE_CLIENT_EMAIL) {
      throw new Error('Credenciais do Google Chat não configuradas no .env.local')
    }

    // 1. Autenticação com Domain-Wide Delegation (Personificação) igual ao Python
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: privateKey,
      subject: emailRemetente, // Personifica a conta integracao@gruponatureza.com
      scopes: [
        'https://www.googleapis.com/auth/chat.spaces',
        'https://www.googleapis.com/auth/chat.spaces.create',
        'https://www.googleapis.com/auth/chat.memberships',
        'https://www.googleapis.com/auth/chat.messages',
      ],
    })

    const chat = google.chat({ version: 'v1', auth })

    // 2. Cria ou localiza o espaço de DM com o usuário (Equivalente ao _obter_ou_criar_dm)
    const setupResponse = await chat.spaces.setup({
      requestBody: {
        space: {
          spaceType: 'DIRECT_MESSAGE',
        },
        memberships: [
          {
            member: {
              name: `users/${dados.emailDestinatario}`,
              type: 'HUMAN',
            },
          },
        ],
      },
    })

    const spaceName = setupResponse.data.name

    if (!spaceName) {
      throw new Error('Não foi possível obter ou criar o espaço de DM.')
    }

    // 3. Envia a mensagem no espaço retornado
    await chat.spaces.messages.create({
      parent: spaceName,
      requestBody: {
        text: `📋 *Nova Auditoria Concluída!*\n\n• *Unidade:* ${dados.unidade} (${dados.tipoUnidade.toUpperCase()})\n• *Auditor:* ${dados.auditor}\n• *Data/Hora:* ${new Date().toLocaleString('pt-BR')}\n\nAcesse o painel para verificar os detalhes.`,
      },
    })

    console.log(`Notificação enviada com sucesso para ${dados.emailDestinatario} via DWD (${emailRemetente})`)
  } catch (error: any) {
    console.error('Erro ao enviar mensagem privada via Google Chat:', error)
    throw error
  }
}