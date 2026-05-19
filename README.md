# Bookern

En enkel booking-prototype for små bedrifter.

Kunder kan bla i kalenderen, velge en ledig time og booke. Bedriften får en ryddig oversikt over dagens og ukens bookinger.

Klar for deploy på Vercel som en statisk nettside.

## Supabase

Kjør SQL-en i `supabase/schema.sql` i Supabase SQL Editor.

Legg disse miljøvariablene inn i Vercel:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Bedrifter kan bygge inn Bookern på egen nettside med:

```html
<script src="https://din-vercel-url.vercel.app/embed.js" data-bookern-business="nord-frisor"></script>
```
