# Clarity-analyse — waitlist-pagina

Vaste methode voor elke analyse-run. Hij staat vast zodat twee runs vergelijkbaar
zijn: dezelfde vragen, dezelfde volgorde, dezelfde drempels.

Project `y0trvvheh2` · pagina `/pages/waitinglist` · conversie = e-mailinschrijving
(`waitlist_signup`). Taxonomie: `docs/sections.md#clarity-meetlaag-waitlist-funnel`.

## Randvoorwaarden

- **10 API-requests per project per dag.** De run hieronder gebruikt er 8; 2 blijven
  over voor vervolgvragen.
- **De API reikt maximaal 1–3 dagen terug.** Alles daarbuiten is onherroepelijk weg.
  Daarom schrijft elke run een snapshot weg — zonder die bestanden bestaat er over
  twee weken geen trendlijn, alleen losse momentopnames.
- **Custom events zijn niet te tellen via de API.** De Data Export API heeft er geen
  dimensie voor. Aantallen komen met de hand uit de Clarity-UI. Recordings zijn wél
  op eventnaam te filteren via `smartEvents`, mits het event in Clarity als Smart
  Event geregistreerd is.
- **Heatmaps zitten niet in de API.** Die komen via de browser (zie onder).

## Verwachte eventvolgorde (regressietest)

Geverifieerd op 2026-08-12 tegen de dev-server op 390×844, met `window.clarity`
vervangen door een recorder zodat er niets vanaf localhost naar het echte project
ging. Loop dit na elke wijziging aan een `custom-bc-*` sectie opnieuw door.

| Handeling | Verwacht |
|---|---|
| klik op elk van de 5 CTA's | `cta_click` + `cta_source` = `announce` / `header` / `hero` / `final` / `sticky` |
| formulier in beeld, ≥1s | `signup_seen`, precies één keer — ook na weg- en terugscrollen |
| focus in het e-mailveld | `signup_start`, precies één keer |
| leeg verzenden | `signup_submit` → `signup_err_email` → `upgrade` |
| ongeldig e-mailadres | idem |
| zonder consent verzenden | `signup_submit` → `signup_err_consent` → `upgrade` |
| `data-list-id` leeggemaakt | `signup_submit` → `signup_err_api` → `api_status` = `config` |
| ongeldige `data-company-id` | `signup_submit` → `signup_err_api` → `api_status` = `403` |
| `bc:subscribed` | `waitlist_signup` |
| survey-antwoord | `survey_answer` |
| FAQ openen | `faq_open` + `faq_q` |
| ingrediënt openen | `ingredient_open` + `ingredient` |

**Val bij het testen:** in een tab op de achtergrond (`document.visibilityState`
= `hidden`) vuurt `focusin` niet bij programmatische focus, staat de
IntersectionObserver stil en scrollt een anchor-sprong niet. `signup_start` en
`signup_seen` lijken dan kapot terwijl ze het doen. Test die twee op een echt
zichtbare pagina.

## Vóór de eerste run

- [ ] Eigen IP blokkeren: Clarity → Settings → IP blocking. Anders zijn de eigen
      testsessies de dataset.
- [ ] Maskering controleren: Clarity → Settings → Masking staat op Balanced of Strict.
- [ ] `waitlist_signup` registreren als Smart Event (Settings → Smart events → custom
      event trigger), anders werkt filter 5 hieronder niet.
- [ ] Eén request besteden aan `list-session-recordings` met
      `{ smartEvents: ["waitlist_signup"] }` op een eigen testsessie, om te bewijzen
      dat de filter werkt. **Uitkomst hier vastleggen:** _nog niet getest_.
- [ ] Scrollpositie van `#bc-signup` op 390×844 meten en hier vastpinnen (gebruikt in
      filter 6): _nog niet gemeten, aanname 55%_.

## De vaste run — 8 requests

Datums in UTC ISO 8601 met milliseconden.

| # | Tool | Query / filter | Waarvoor |
|---|---|---|---|
| 1 | dashboard | "Total sessions, unique users and average scroll depth for the last 3 days" | De noemer. Alles hieronder is een verhouding hiertegen. |
| 2 | dashboard | "Sessions by device type for the last 3 days" | Mobiel-aandeel; bepaalt hoe de rest gewogen wordt. |
| 3 | dashboard | "Dead click, rage click and quick back counts for the last 3 days" | De drie wrijvingstotalen. |
| 4 | dashboard | "Sessions by channel and source for the last 3 days" | Verkeer-publiek-fit. Een mismatch hier verklaart "niemand schrijft zich in" beter dan welke UI-fix ook, en wordt dus vóór de pagina gecontroleerd. |
| 5 | recordings | `{ smartEvents: ["waitlist_signup"], count: 10 }` | De converteerders. Kijk er 2–3 helemaal terug: wat deden zij anders. |
| 6 | recordings | `{ scrollDepth: { min: 55, max: null }, deadClickPresent: true, sortBy: "SessionDuration_DESC", count: 15 }` | Kwamen bij het formulier en klikten op iets doods. |
| 7 | recordings | `{ rageClickPresent: true, sortBy: "SessionClickCount_DESC", count: 10 }` | Frustratie. Booleans in één filterobject worden ge-AND, dus wissel per run af met `quickbackClickPresent`. |
| 8 | recordings | `{ sessionIntent: "High Intention", scrollDepth: { min: 55, max: null }, count: 10 }` | Het meest leerzame segment: ze wilden het, ze zagen het formulier, ze gingen tóch weg. |

Bewust niet in de vaste run: browser- en OS-verdeling (verandert geen beslissing bij
dit volume), land (één markt), een staande JS-error-query (alleen ophalen als een run
er aanleiding toe geeft).

Handmatig uit de UI overnemen: de tellingen van `cta_click`, `signup_seen`,
`signup_start`, `signup_submit`, `waitlist_signup` en de drie error-events.

## Heatmaps — 0 requests

Via de browser op de ingelogde Clarity-sessie:
`https://clarity.microsoft.com/projects/view/y0trvvheh2/heatmaps`, filteren op de
waitlist-URL, **mobiel eerst**, dan desktop. Drie schermafbeeldingen: click map,
scroll map, area map. Twee vragen: waar zitten de dead-click-clusters, en valt de
50%-bereiklijn boven of onder `#bc-signup`.

## Wanneer een signaal telt

Handelen bij **één** van beide:

- het signaal komt in ≥5 aparte sessies voor **én** in ≥20% van de sessies die het
  element bereikten, of
- er zijn **3 opnames** persoonlijk bekeken die hetzelfde gedrag laten zien.

Bij ~50 sessies per dag is een patroon van 3 sessies een muntworp, maar drie opnames
van dezelfde verwarring zijn bewijs ongeacht n — dan wordt intentie waargenomen, geen
verdeling bemonsterd.

**Uitzondering, de kostendrempel:** alles wat binnen een kwartier te fixen is zonder
ontwerprisico wordt meteen gefixt, zonder op een drempel te wachten. Meten is voor
dure beslissingen.

**Uitzondering, alarm:** `api_status: config` betekent dat iedere inschrijving wordt
weggegooid. Eén voorkomen is genoeg om direct in te grijpen.

Preview- en eigen sessies (`?oseid=` in de URL) horen niet in de analyse.

## Snapshots

```
docs/clarity/log.md          de trendtabel — het enige bestand dat je leest voor een verloop
docs/clarity/YYYY-MM-DD.md   één onveranderlijk bestand per run
docs/clarity/screens/        heatmap-schermafbeeldingen, YYYY-MM-DD-<map>-<device>.png
```

Een snapshot wordt na afloop nooit meer bijgewerkt. Een snapshot die je kunt
herschrijven is geen snapshot.

`docs/` is geen theme-map, dus de Shopify CLI uploadt hier niets van.
