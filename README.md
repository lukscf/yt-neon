<p align="center"><img src="icons/icon128.png" width="96" alt="Ícone do YT Neon"></p>

# YT Neon para YouTube

**YT Neon** é uma extensão gratuita para Chrome e Edge. Ela deixa o YouTube com um tema escuro neon, com fundos animados e efeitos 3D que seguem o mouse. Também traz um **player de vídeo flutuante, sempre por cima das outras janelas**.

É só aparência e conveniência. A extensão não lê seu histórico nem suas inscrições, não tem servidor e não coleta dados. Anúncios não são escondidos nem alterados.

> Projeto independente, sem relação com o Google. "YouTube" é marca do Google LLC.

Irmãos: [GM Neon para Gmail](https://github.com/lukscf/gmail-neon), [WP Neon para WhatsApp Web](https://github.com/lukscf/whatsapp-neon-transcriber) e [SL Neon para Slack](https://github.com/lukscf/slack-neon).

## O que faz

**Tema neon.** Aplica o tema no início, na página do vídeo, na busca, no menu lateral, nos menus e nas caixas de diálogo. Chips, botões, barra de progresso e foco ficam na cor escolhida.

**Cores.** Roxo, azul, rosa, ciano, verde e Bullet. O ícone na barra do navegador acompanha a cor.

**Fundos animados.** Ficam atrás do conteúdo, nunca por cima dos vídeos:
- Bullet (balas e moedas cripto), que é o padrão;
- aurora, estrelas, Matrix, synthwave, bolhas, hiperespaço, chuva neon, vaga-lumes e órbitas;
- ou nenhum.

**Hover 3D.** Cartões de vídeo, itens do menu lateral, chips e botões inclinam e brilham seguindo o mouse. Isso não vale para anúncios.

**Fonte.** A do YouTube, Roboto Mono, Open Sans ou Arial.

## Player flutuante

O player abre de três jeitos:
- pelo botão neon na barra do player;
- pelo atalho **Alt+Shift+Y**, que pode ser trocado em `chrome://extensions/shortcuts`;
- pelo botão no popup.

**Como funciona.** O vídeo vai para uma janela sempre por cima das outras, usando a API Document Picture-in-Picture (Chrome/Edge 116+). É o mesmo vídeo da página, então não recarrega e não perde a posição.

**Controles neon.** A janela tem:
- reproduzir/pausar;
- barra de tempo;
- som e volume;
- esticar ou voltar ao normal;
- voltar para a página.

**Esticar.** O vídeo preenche a janela inteira, sem faixas pretas, em vez de manter a proporção. Clique de novo, ou tecle E, para voltar ao normal. A escolha fica salva.

**Teclado na janela.** Espaço ou K pausa e reproduz. ← e → voltam ou avançam 5 s. J e L voltam ou avançam 10 s. M liga e desliga o som, E estica, e Esc fecha.

**Ao fechar.** O vídeo volta ao player da página no mesmo ponto.

**Navegador sem Document PiP.** A extensão usa o Picture-in-Picture padrão do navegador.

## Instalar (modo desenvolvedor)

1. Baixe e descompacte `yt-neon-1.0.0.zip`.
2. Abra `chrome://extensions` e ligue o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e escolha a pasta.
4. Recarregue o YouTube.

## Permissões

| Permissão | Para quê |
|---|---|
| `storage` | Guardar as preferências (cor, fundo, fonte, efeitos, esticar) neste navegador |
| `scripting` | Abrir o player flutuante pelo atalho e pelo popup, chamando o código que a extensão já tem na página |
| `https://www.youtube.com/*` | Aplicar o tema e o player só no YouTube |

Detalhes em [PRIVACY.md](PRIVACY.md).
