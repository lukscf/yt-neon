<p align="center"><img src="icons/icon128.png" width="96" alt="Ícone do YT Neon"></p>

# YT Neon para YouTube

**YT Neon** é uma extensão gratuita para Chrome e Edge que deixa o YouTube neon e turbina o player. Ela traz:
- player flutuante sempre por cima das outras janelas;
- velocidade de 0,25x a 4x, com memória por canal;
- volume até 400%;
- loop A-B e captura de frame;
- modo foco;
- opções para esconder Shorts, comentários e recomendações.

A extensão não tem servidor nem analytics e não faz nenhuma conexão de rede. Anúncios não são escondidos nem alterados, e enquanto um anúncio está na tela os recursos do player (velocidade, saltos, loops) ficam parados. Também não baixa vídeos.

> Projeto independente, sem relação com o Google. "YouTube" é marca do Google LLC.

## Player flutuante, sempre por cima

**Como abrir:**
- pelo botão **Flutuar** no canto do vídeo, que aparece ao passar o mouse;
- pelo botão na barra do player;
- pelo atalho **Alt+Shift+Y**, que funciona em qualquer lugar do navegador;
- pelo **Alt+P** dentro da página;
- pelo popup.

**Modos:**

| Modo | Como fica |
|---|---|
| **Completo** (padrão) | Controles neon: play/pausa, tempo, volume, **esticar/normal** e voltar para a página. O navegador sempre mostra uma barra fina com o endereço do site no topo; é uma regra de segurança dele, e extensões não podem tirá-la. |
| **Mínimo** | Só o vídeo, **sem barra nenhuma**, com os controles do navegador ao passar o mouse. Não estica. |

**Ao fechar:** o vídeo volta ao player da página no mesmo ponto e sem recarregar.

## Player

- **Velocidade de 0,25x a 4x.** O passo é de 0,05, 0,10 ou 0,25. Há uma velocidade padrão e, se quiser, a última velocidade de cada canal fica lembrada.
- **Volume extra até 400%**, usando Web Audio. A **normalização** opcional iguala partes altas e baixas.
- **Roda do mouse sobre o player** muda o volume. Passando de 100%, ela entra no volume extra.
- **Repetir o vídeo** (loop) e **loop A-B** de um trecho, com marca na barra de progresso.
- **Captura do frame** atual em PNG, na resolução do vídeo.
- **Qualidade padrão:** de 240p a 4K, ou a do YouTube. Se o vídeo não tiver a escolhida, usa a melhor abaixo dela.
- **Retomar de onde parou:** volta ao ponto em que você estava, com um botão "Do início". As posições ficam só neste navegador.

## Interface

Cada item liga e desliga no popup:
- **Esconder:** Shorts (prateleiras, itens e menu), comentários, recomendações da lateral, cards e telas finais.
- **Grade da página inicial:** de 1 a 8 colunas, ou automática.
- **Modo foco:** na página do vídeo, só o player na tela, com um botão discreto para sair.
- **Tema neon:**
  - 6 cores;
  - fundos animados atrás do conteúdo (o padrão é o Bullet: balas e moedas cripto);
  - hover 3D que segue o mouse;
  - 4 fontes;
  - ícone na cor do tema.

## Atalhos (editáveis em Opções)

| Ação | Padrão |
|---|---|
| Acelerar / desacelerar / 1x | `]` / `[` / `\` |
| Mais / menos volume extra | `Alt+↑` / `Alt+↓` |
| Loop do vídeo | `Shift+R` |
| Loop A-B (A, B, desliga) | `Shift+A` |
| Capturar frame | `Shift+S` |
| Modo foco | `Shift+C` |
| Player flutuante (na página) | `Alt+P` |
| Player flutuante (global) | `Alt+Shift+Y` (em `chrome://extensions/shortcuts`) |

Na janela flutuante:
- **Espaço ou K:** pausa e reproduz.
- **← e →:** voltam ou avançam 5 s.
- **J e L:** voltam ou avançam 10 s.
- **M:** liga e desliga o som.
- **E:** estica.
- **Esc:** fecha.

## Configurações

- **Sincronização:** as configurações ficam em `chrome.storage.sync` e acompanham a conta do navegador quando a sincronização está ligada.
- **Backup:** em **Opções** dá para **exportar e importar** um `.json`, restaurar o padrão e apagar as posições salvas.

## Instalar (modo desenvolvedor)

1. Baixe e descompacte `yt-neon-1.0.0.zip`.
2. Abra `chrome://extensions` e ligue o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e escolha a pasta.
4. Recarregue o YouTube.

## Permissões

| Permissão | Para quê |
|---|---|
| `storage` | Guardar as preferências (sync) e as posições dos vídeos e velocidades por canal (local) |
| `scripting` | Abrir o player flutuante pelo atalho global e pelo popup, chamando o código que a extensão já tem na página |
| `https://www.youtube.com/*` | Rodar só no YouTube |

Detalhes em [PRIVACY.md](PRIVACY.md).
