# Política de privacidade do YT Neon para YouTube

**Resumo: a extensão não coleta nem envia nenhum dado seu e não faz nenhuma conexão de rede.**

## O que a extensão faz
O YT Neon muda a aparência do YouTube (`www.youtube.com`) e acrescenta recursos ao player:
- player flutuante;
- velocidade, volume extra, loops e captura de frame;
- qualidade padrão e retomar de onde parou;
- opções para esconder partes da página.

## O que ela lê
- **Estrutura da página.** Lê nomes de elementos e classes, para aplicar o tema, esconder as partes escolhidas e pôr os botões.
- **Elemento de vídeo da página.** Usa o vídeo para velocidade, volume, loops, captura de frame e janela flutuante.
- **Código do vídeo aberto** (o `v=` do endereço). Usado só para lembrar o ponto em que você parou.
- **Endereço do canal do vídeo aberto.** Usado só se você ligar "lembrar a velocidade de cada canal".
- **O que ela não lê.** Seu histórico, suas inscrições, comentários e dados da conta: nada disso é lido nem copiado.

## O que fica guardado
| O quê | Onde | Por quanto tempo |
|---|---|---|
| Preferências e atalhos | `chrome.storage.sync`: acompanha a conta do navegador se a sincronização estiver ligada; senão, fica só neste navegador | até você remover a extensão ou restaurar o padrão |
| Ponto em que parou (código do vídeo + segundos), até 400 vídeos | `chrome.storage.local`, só neste navegador | até ser apagado em Opções ou a extensão ser removida |
| Velocidade por canal (endereço do canal + velocidade) | `chrome.storage.local`, só neste navegador | até ser apagada em Opções ou a extensão ser removida |
| Frames capturados | um arquivo PNG baixado por você | sob seu controle |

## Para onde vai
Para lugar nenhum. A extensão não tem servidor, conta, analytics nem telemetria, e não faz nenhuma conexão de rede. O backup de configurações é um arquivo salvo por você.

## Anúncios e downloads
- **Anúncios:** a extensão não esconde, bloqueia, acelera nem pula anúncios.
- **Downloads:** ela não baixa vídeos nem áudios.

## Permissões
- **`storage`:** guarda as informações acima.
- **`scripting`:** o atalho global e o botão do popup acionam o player flutuante na aba do YouTube.
- **Acesso a `https://www.youtube.com/*`:** a extensão roda só no YouTube.

Projeto independente, sem relação com o Google. YouTube é marca do Google LLC.
