# Bookern

Bookern er en SaaS for små bedrifter som vil ha booking direkte på sin egen nettside.

Kunden blir værende på bedriftens nettside, mens Bookern leverer booking-widget, kalenderlogikk, lagring og oversikt i bakgrunnen.

Klar for deploy på Vercel som en statisk nettside.

## Produktretning

- Bookern er kontrollpanelet for bedriften.
- `embed.js` er booking-widgeten bedriften legger inn på egen nettside.
- Supabase lagrer bedrifter, tjenester og bookinger.
- Supabase Auth gir bedriften en privat konto og et eget dashboard.

Bedrifter kan legge inn en enkel bookingprofil direkte fra dashboardet. Profilen publiseres i Supabase og får en embed-kode som kan limes inn på bedriftens egen nettside.

## Supabase

Kjør SQL-en i `supabase/schema.sql` i Supabase SQL Editor. Kjør den på nytt etter oppdateringer, slik at nye policies og funksjoner blir lagt inn.

Slå på Email Auth i Supabase Authentication. Bedrifter kan da opprette konto, logge inn og lage sin egen bookingprofil. Dashboardet viser bare bedrifter og bookinger som tilhører innlogget eier, mens kunder fortsatt kan booke gjennom widgeten uten konto.

Legg disse miljøvariablene inn i Vercel:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Bedrifter kan bygge inn Bookern på egen nettside med:

```html
<script src="https://din-vercel-url.vercel.app/embed.js" data-bookern-business="nord-frisor" data-bookern-height="820"></script>
```

Du kan styre høyden på widgeten slik:

```html
<script
  src="https://din-vercel-url.vercel.app/embed.js"
  data-bookern-business="nord-frisor"
  data-bookern-height="820"
></script>
```
