/* Patch v2 — evita sobreposição/overlap do login com carrinho */

/* Garanta que o container do topo seja flex e tenha espaço */
.topbar,
.header,
.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/* Se seu nav tiver outra classe, este seletor ainda ajuda sem quebrar */
nav {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap; /* evita empilhar/encobrir botões em telas menores */
}

/* Botões sempre acima e clicáveis */
.nav-btn {
  position: relative;
  z-index: 1;
}

/* Userbox NÃO fica absoluto: não encobre botões */
.userbox {
  position: relative !important;
  right: auto !important;
  top: auto !important;
  z-index: 2;
  margin-left: 10px;
}

/* Quando escondido inline no HTML (style="display:none"), sem clique */
.userbox[style*="display:none"] {
  pointer-events: none;
}

/* Opcional: mantém o botão Login sempre do mesmo tamanho visual */
#btnLogin {
  white-space: nowrap;
}
