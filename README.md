# Conexões em Pesquisa

Protótipo de plataforma para projeto de pesquisa, pronto para publicação estática no GitHub Pages.

## O que já está incluído

- Página institucional responsiva e áreas preparadas para quatro módulos: Territórios, Acervo, Participação e Resultados.
- Cadastro e login reais com Supabase Auth, com perfis de participante e administração.
- Painel restrito com itens próprios de gestão para administradores.
- Sem dependências, build ou servidor: basta publicar estes arquivos.

## Publicação no GitHub Pages

1. Crie um repositório no GitHub e envie os arquivos desta pasta para a raiz.
2. Em **Settings > Pages**, selecione a branch `main` e a pasta `/ (root)`.
3. Salve: o GitHub fornecerá o endereço público em poucos minutos.

## Configuração do Supabase (necessária uma única vez)

1. No Supabase, abra **SQL Editor > New query**.
2. Copie e execute todo o conteúdo de `supabase-setup.sql`.
3. Publique o site e crie sua própria conta pela tela **Criar conta**.
4. No fim de `supabase-setup.sql`, substitua o e-mail de exemplo pelo seu e execute a linha `update`. Sua conta passa a ter o papel de administrador.

As credenciais públicas do projeto já estão em `config.js`. A senha do banco, `service_role key` e outros segredos nunca devem ser enviados ao GitHub.

## Publicação no GitHub Pages

Depois de publicar, no Supabase abra **Authentication > URL Configuration** e inclua o endereço público do GitHub Pages em **Site URL** e em **Redirect URLs**. Isso garante que os links de confirmação de e-mail retornem ao site correto.
