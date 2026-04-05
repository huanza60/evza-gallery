# EVZA Gallery

**Escola Primária e Secundária Vale do Zambeze** — Galeria de Fotos e Vídeos

> 📍 Tete — Moçambique

Uma galeria de fotografias moderna, responsiva e gratuita, alojada no GitHub Pages. Todas as imagens e vídeos são armazenados gratuitamente no Google Drive.

---

## Funcionalidades

- 🖼️ **Grid de catálogos** com capa fotográfica, título e contagem de ficheiros
- 📸 **Galeria masonry** com animações suaves ao scroll
- 🔍 **Lightbox** com navegação por setas e suporte a legendas
- 📱 **Design responsivo** — funciona em telemóvel, tablet e computador
- 🎨 **Estilo editorial** com tons terrosos africanos
- 🔒 **Painel de administração** protegido por palavra-passe
- 💾 **PWA ready** — funciona offline após primeiro carregamento
- 🚀 **100% gratuito** — sem custos de alojamento

---

## Guia de Implementação (Português)

### Passo 1 — Criar uma conta no GitHub

1. Acesse a [página de registro do GitHub](https://github.com/signup)
2. Preencha com o seu nome, e-mail e escolha uma palavra-passe
3. Verifique o seu e-mail através do link enviado pelo GitHub

### Passo 2 — Criar um novo repositório

1. Faça login no GitHub: [github.com](https://github.com)
2. Clique no botão **New** (ou **Novo repositório**) no canto superior direito
3. Preencha:
   - **Repository name:** `evza-gallery`
   - **Visibility:** marque **Public**
   - **Initialize this repository with a README:** (deixe desmarcado)
4. Clique em **Create repository**

### Passo 3 — Enviar os ficheiros

#### Opção A — Via interface web (mais fácil)

1. Na página do seu repositório, clique em **Uploading an existing file**
2. Arraste todos os ficheiros do projeto para a área de upload:
   ```
   index.html
   catalog.html
   admin.html
   data.js
   app.js
   style.css
   manifest.json
   sw.js
   README.md
   assets/logo-placeholder.svg
   ```
3. Clique em **Commit changes** — aguarde o upload

#### Opção B — Via linha de comando

```bash
cd pasta-do-projeto
git init
git add .
git commit -m "EVZA Gallery — primeira versão"
git branch -M main
git remote add origin https://github.com/SEU_USERNAME/evza-gallery.git
git push -u origin main
```

### Passo 4 — Ativar o GitHub Pages

1. No repositório, vá a **Settings** (Definições)
2. No menu lateral esquerdo, clique em **Pages**
3. Em **Source**, selecione **Deploy from a branch**
4. Em **Branch**, selecione:
   - Branch: **main**
   - Folder: **/(root)**
5. Clique em **Save**

### Passo 5 — O site está online! 🎉

O site ficará disponível em:

```
https://SEU_USERNAME.github.io/evza-gallery
```

> ⚠️ A propagação pode demorar alguns minutos (5–10 min).

---

## Como adicionar fotos e vídeos

### Via Painel de Administração

1. Acesse: `https://SEU_USERNAME.github.io/evza-gallery/admin.html`
2. A palavra-passe padrão é: `evza2025`
3. Use o painel para adicionar catálogos e mídias
4. Quando quiser tornar os dados permanentes, clique em **Exportar Dados**
5. Substitua o ficheiro `data.js` no repositório pelo ficheiro exportado

### Passo a passo para fotos no Google Drive

1. Faça upload das fotos para uma pasta no Google Drive
2. Para cada foto, clique com o botão direito → **Partilhar** → **Alterar para "Qualquer pessoa com o link"**
3. Clique em **Copiar link**
4. O link terá este formato:
   ```
   https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view?usp=sharing
   ```
5. O sistema extrai automaticamente o ID do ficheiro (`1AbCdEfGhIjKlMnOpQrStUvWxYz`)

### Editar o ficheiro `data.js` manualmente

Também pode editar diretamente o ficheiro `data.js` no repositório do GitHub:

```javascript
const GALLERY_DATA = [
  {
    id: "meu-catálogo",
    name: "Nome do Catálogo",
    cover: "FILE_ID_DA_CAPA",
    description: "Descrição do catálogo",
    items: [
      { type: "photo", src: "FILE_ID_DA_FOTO", caption: "Legenda" },
      { type: "video", src: "FILE_ID_DO_VIDEO", poster: "FILE_ID_DO_POSTER", caption: "Legenda" }
    ]
  }
];
```

> 💡 **Dica:** Para obter o FILE_ID, basta copiar a parte entre `/d/` e `/view` no link do Google Drive.

---

## Alterar a palavra-passe do administrador

1. Abra o ficheiro `app.js`
2. Procure pela linha: `var ADMIN_PASSWORD = "evza2025";`
3. Altere `"evza2025"` para a palavra-passe desejada
4. Faça o commit e push para o repositório

---

## Estrutura de Ficheiros

```
evza-gallery/
├── index.html          ← Página principal com grid de catálogos
├── catalog.html        ← Página individual do catálogo com galeria
├── admin.html          ← Painel de administração
├── data.js             ← Dados da galeria (editável)
├── app.js              ← JavaScript principal
├── style.css           ← Folhas de estilo
├── manifest.json       ← PWA — configurações da app
├── sw.js               ← Service Worker (cache offline)
├── README.md           ← Este ficheiro
└── assets/
    └── logo-placeholder.svg  ← Logo da escola
```

---

## Tecnologias

- HTML5, CSS3, JavaScript (vanilla)
- Google Fonts (Playfair Display + Lato)
- GitHub Pages (alojamento gratuito)
- Google Drive (armazenamento de fotos/vídeos)
- Service Worker (PWA)

---

**Escola Primária e Secundária Vale do Zambeze**
Tete — Moçambique
