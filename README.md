# Precar

O preço antes do carro. Digite um valor e compare os modelos que cabem na faixa de ±15%.

## Local

```powershell
cd $env:USERPROFILE\Documents\precar
python -m http.server 8877 --directory .
```

Ou dê dois cliques em `abrir.bat` e abra [http://localhost:8877](http://localhost:8877).

## Produção

Site estático na Vercel, ligado a este repositório. Cada push em `main` publica.

## Admin

Painel em `/admin`.

1. Rode `supabase/schema.sql` no SQL Editor do projeto.
2. Em Authentication → Users, crie seu usuário (e-mail + senha).
3. Em Settings → API, copie a chave `anon` `public`.
4. Abra `/admin` e cole a chave na primeira tela (fica só neste navegador) ou coloque em `js/supabase-config.js`.
5. Entre e use **Trazer catálogo atual** para importar o protótipo.

## Recorte

Catálogo editorial de modelos (0km + seminovos populares), não classificados. Preços de referência. Ofertas saem para Webmotors e Mercado Livre.
