# EVZA Gallery v2

Galeria fotográfica estática para a Escola Primária e Secundária Vale do Zambeze, em Tete, Moçambique. O site usa HTML, CSS e JavaScript vanilla, Supabase para dados/autenticação/storage, Google Drive como fallback de media e GitHub Pages para publicação gratuita.

## 1. Criar Supabase

1. Aceda a [supabase.com](https://supabase.com) e crie uma conta.
2. Crie um projecto novo.
3. Guarde a palavra-passe da base de dados num local seguro.
4. Aguarde até o projecto ficar activo.

## 2. Executar o schema

1. No Supabase, abra **SQL Editor**.
2. Crie uma nova query.
3. Cole o conteúdo de `schema.sql`.
4. Clique em **Run**.
5. Se as políticas do Storage falharem por já existirem, execute novamente; o ficheiro remove e recria as políticas esperadas.

## 3. Storage

O schema cria o bucket público `evza-media`. Confirme em **Storage** que o bucket existe e está marcado como público. As políticas permitem leitura pública e upload/alteração/eliminação apenas para utilizadores autenticados.

## 4. Criar administrador

1. Abra **Authentication → Users**.
2. Clique em **Add user**.
3. Escreva o email e a palavra-passe do administrador.
4. Confirme o utilizador se o Supabase pedir.

## 5. Configurar credenciais

1. Abra **Settings → API** no Supabase.
2. Copie **Project URL**.
3. Copie a chave **anon public**.
4. Edite `config.js`:

```javascript
supabaseUrl: 'https://o-seu-projecto.supabase.co',
supabaseAnonKey: 'a-sua-chave-anon-public',
```

## 6. Publicar no GitHub Pages

1. Crie uma conta GitHub, se ainda não tiver.
2. Crie um repositório chamado `evza-gallery`.
3. Envie todos os ficheiros desta pasta para o repositório.
4. Abra **Settings → Pages**.
5. Em **Build and deployment**, escolha a branch principal e a pasta raiz.
6. Guarde. O site ficará em `https://SEU_USUARIO.github.io/evza-gallery/`.
7. Actualize `siteUrl` em `config.js` com esse endereço para partilhas correctas.

## 7. Usar o painel

1. Aceda a `admin.html`.
2. Entre com o email e a palavra-passe criados no Supabase.
3. Crie o primeiro catálogo.
4. Adicione fotos ou vídeos por upload directo, ou cole links antigos do Google Drive.
5. Aprove ou rejeite comentários na área **Comentários**.

## 8. Partilha

Cada catálogo usa `catalog.html?id=UUID`. Cada foto usa `photo.html?id=UUID`. Estes links podem ser enviados por WhatsApp, Facebook ou outras redes. Em telemóveis, o botão **Partilhar** usa a folha nativa do sistema; em computadores, copia o link.

## 9. FAQ

**Como evitar pausa do Supabase gratuito?**  
Entre no painel Supabase periodicamente. Projectos sem uso podem ser pausados no plano gratuito.

**Como adicionar mais administradores?**  
Crie novos utilizadores em **Authentication → Users**. Qualquer utilizador autenticado tem permissões de administração definidas pelas políticas RLS.

**Como mudar a senha?**  
No Supabase, abra o utilizador em **Authentication → Users** e defina uma nova palavra-passe.

**Posso continuar a usar Google Drive?**  
Sim. Ao adicionar media no painel, use o separador **Google Drive**. O site extrai o ID do ficheiro e gera uma URL directa.

## 10. Limites do plano gratuito

| Recurso | Limite aproximado |
| --- | --- |
| Base de dados | Suficiente para milhares de registos escolares |
| Storage | Limitado pelo plano gratuito activo do Supabase |
| Autenticação | Adequada para poucos administradores |
| GitHub Pages | Gratuito para sites estáticos |
| Google Drive | Depende da conta usada para ficheiros antigos |

## 11. Ficheiros principais

- `schema.sql`: tabelas, índices, políticas e funções.
- `config.js`: dados do projecto e comportamento do site.
- `supabase.js`: cliente Supabase e resolução de URLs.
- `auth.js`: login, logout e sessão.
- `app.js`: galeria, lightbox, pesquisa, admin, likes, comentários e realtime.
- `style.css`: identidade visual completa, responsivo e dark mode.
- `sw.js`: PWA e cache offline.

Depois do primeiro carregamento, o service worker guarda a aplicação para funcionamento offline básico. Dados novos do Supabase exigem internet.
