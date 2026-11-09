# Política de privacidade do YT Neon para YouTube

**Resumo: a extensão não coleta, não guarda e não envia nenhum dado seu.**

## O que a extensão faz
O YT Neon muda a aparência do YouTube (`www.youtube.com`) e oferece um player de vídeo flutuante.

## O que ela lê
- **Estrutura da página.** Lê nomes de elementos e classes do YouTube, para aplicar o tema e pôr o botão do player flutuante.
- **Elemento de vídeo da página.** Usa o vídeo para levá-lo à janela flutuante e trazê-lo de volta.
- **O que ela não lê.** Seu histórico, suas inscrições, comentários, dados da conta e o que você assiste: nada disso é lido, copiado nem guardado.

## O que fica guardado
| O quê | Onde | Por quanto tempo |
|---|---|---|
| Preferências (cor, fundo, fonte, efeitos ligados, esticar o vídeo) | `chrome.storage.local`, só neste navegador | até você remover a extensão |

## Para onde vai
Para lugar nenhum. A extensão não tem servidor, conta, analytics nem telemetria, e não faz conexão de rede.

## Anúncios
A extensão não esconde, bloqueia nem altera anúncios.

## Permissões
- **`storage`:** guarda as preferências acima.
- **`scripting`:** o atalho de teclado e o botão do popup acionam o player flutuante na aba do YouTube.
- **Acesso a `https://www.youtube.com/*`:** aplica o tema e o player só no YouTube.

Projeto independente, sem relação com o Google. YouTube é marca do Google LLC.
