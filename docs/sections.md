# Custom sections

Eén entry per custom sectie: doel, bestanden, instellingen en eventuele Shrine-
integratiepunten. Integratiepunten opnieuw testen na elke Shrine-update.

---

## Black Cherry waitlist — `custom-bc-*` (landingspagina)

**Datum:** 2026-08-02
**Ontwerp:** Claude Design, project "Daily Matters PDP opbouw",
bestand `Black Cherry Waitlist.dc.html`, plus het Daily Matters design system
(`_ds/daily-matters-design-system-c1c17a91-…`).

Stand-alone advertentie-landingspagina voor de wachtlijst van Energy Foundation
Black Cherry. Dertien inhoudelijke secties plus header, footer en sticky CTA,
elk als een eigen sectiebestand zodat ze los te herschikken, uit te zetten of te
hergebruiken zijn.

### Eigen layout in plaats van Shrine's chrome

`templates/page.waitinglist.json` zet `"layout": "custom-landing"` en
`"wrapper": "div.bc-page"`. JSON-templates ondersteunen een `layout`-property, dus
`layout/custom-landing.liquid` (een **nieuw** bestand, geen wijziging aan
Shrine's `theme.liquid`) rendert de pagina zonder de `header-group` en
`footer-group` sectiegroepen. Geen winkelnavigatie die betaald verkeer weglekt,
en de pagina blijft volledig bewerkbaar in de theme editor.

Gevolg om te onthouden: deze layout laadt **Shrine's `base.css` niet**. Drie
dingen die daar uit volgen:

1. De typografieclasses `hxl`/`h0`–`h3` en `page-width` bestaan hier niet. Alle
   groottes komen uit `clamp()`-waarden in `assets/custom-bc.css`, per sectie
   instelbaar via een minimum- en maximum-range.
2. De globale `box-sizing: border-box` is weg. De layout zet die zelf terug in
   zijn `{% style %}`-blok. Zonder die regel wordt elke `width: 100%` mét padding
   te breed en scrollt de pagina zijwaarts — precies wat er tijdens de bouw
   gebeurde met de hero-knop (528px in een kolom van 468px).
3. De skip-link heeft zijn eigen `.bc-skip`-stijl in de layout, want
   `.visually-hidden` bestaat hier niet.

### Bestanden

| Bestand | Rol |
|---|---|
| `layout/custom-landing.liquid` | Kale layout, laadt de CSS en rendert `custom-bc-page-style` statisch |
| `assets/custom-bc.css` | Tokens + alle componentstijlen, één cachebaar bestand |
| `assets/custom-bc-signup.js` | `<bc-signup-form>`: Klaviyo-aanmelding + enquête |
| `assets/custom-bc-sticky.js` | `<bc-sticky-cta>`: twee IntersectionObservers |
| `snippets/custom-bc-icon.liquid` | Inline SVG-iconenset |
| `templates/page.waitinglist.json` | Template met alle zeventien secties |

### Secties (volgorde in het template)

| Sectie | Ontwerp | Kern |
|---|---|---|
| `custom-bc-announcement` | Announcement bar | Link naar `#bc-signup` |
| `custom-bc-header` | Header | Sticky, woordmerk of logo + één CTA |
| `custom-bc-hero` | 1 · Hero | h1, CTA, chips (blok), hero-afbeelding |
| `custom-bc-ticker` | 2 · Ticker | CSS-marquee, items als blokken |
| `custom-bc-recognition` | 3 · Herkenning | Twee alinea's + collage van drie |
| `custom-bc-solution` | 4 · Oplossing | Drie genummerde stapkaarten |
| `custom-bc-pillars` | 5 · Drie pijlers | Drie kaarten met claimtekst |
| `custom-bc-ingredients` | 6 · Ingrediënten | `<details>`-accordeon + claimsblok |
| `custom-bc-flavour` | 7 · Black Cherry | Donker paneel + smaakprofiel |
| `custom-bc-daily` | 8 · Waarom dagelijks | Weekstrip uit één tekstinstelling |
| `custom-bc-story` | 9 · Merkverhaal | Twee alinea's + twee portretten |
| `custom-bc-signup` | 10 · First drop signup | Klaviyo-formulier + enquête |
| `custom-bc-package` | 11 · What you'll get | Productkaart + prijs/levering |
| `custom-bc-faq` | 12 · FAQ | `<details>`-accordeon |
| `custom-bc-final-cta` | 13 · Eind-CTA | Beeld + afsluitende CTA |
| `custom-bc-footer` | Footer | Woordmerk, links, juridische tekst |
| `custom-bc-sticky-cta` | Sticky CTA | Verschijnt na de hero, verbergt bij het formulier |

`custom-bc-page-style` staat bewust niet in het template: die wordt statisch uit
de layout gerenderd en heeft daarom géén preset — een tweede exemplaar zou met
het eerste vechten om dezelfde fonttokens.

### Klaviyo-integratie (`custom-bc-signup`)

Twee client-side endpoints, allebei met alleen de **public** API key (site ID).
Een private key mag hier nooit in.

1. Aanmelding — `POST https://a.klaviyo.com/client/subscriptions/?company_id=…`
   Header `revision: 2026-07-15`, content-type `application/vnd.api+json`.
   Payload `data.type = "subscription"` met `attributes.profile.data` (e-mail +
   `$first_name`), `attributes.custom_source` en `relationships.list.data.id`.
   Ref: <https://developers.klaviyo.com/en/reference/create_client_subscription>
2. Enquête-antwoorden — `POST https://a.klaviyo.com/client/profiles/?company_id=…`
   Payload `data.type = "profile"` met `attributes.email` en
   `attributes.properties.<veldnaam>`. Veldnamen zijn instelbaar; standaard
   `waitlist_intent` en `waitlist_price_expectation`.
   Ref: <https://developers.klaviyo.com/en/reference/create_client_profile>

Beide geven HTTP 202 bij succes. De tweede call is best effort: de aanmelding is
dan al gelukt, dus een mislukte property-write onderbreekt de bezoeker niet.

**Double opt-in maakt de aanmelding onzichtbaar tot bevestiging.** Stond de lijst
op `double_opt_in`, dan gaf `/client/subscriptions` netjes 202 maar gebeurde er
verder niets waarneembaars: geen profiel, geen consent-record, geen event — en de
bevestigingsmail kwam niet aan. Met `single_opt_in` op dezelfde lijst, dezelfde
key en dezelfde payload landde alles binnen vijf seconden (geverifieerd
2026-08-02: profiel met `first_name`, `$source`, `$consent`, `consent: SUBSCRIBED`,
`method: API`, `custom_method_detail`, plus beide enquête-velden).

Wil je alsnog double opt-in — verdedigbaar, want het formulier heeft geen
toestemmings-vinkje — controleer dan éérst of de opt-in bevestigingsmail
daadwerkelijk verstuurd wordt. Ten tijde van de test stond de accountbranding nog
op een ander merk met een afwijkend afzenderadres; dat is een plausibele reden dat
die mail nooit aankwam. Let ook op: de opt-in-instelling zit **per lijst** (List →
Settings → Opt-in process). Het account-brede vinkje verandert bestaande lijsten
niet, en de API blijft dan gewoon `double_opt_in` melden.

**Belangrijk: 202 is géén bewijs dat het profiel bestaat.** Klaviyo accepteert het
verzoek en verwerkt het daarna asynchroon; ongeldige of onbezorgbare adressen
worden in die tweede stap stil weggegooid, zonder foutmelding richting de client.
Vastgesteld op 2026-08-02: een aanmelding met `…@example.com` gaf keurig 202 op
zowel `/client/subscriptions` als `/client/profiles`, maar er verscheen geen
profiel in het account. De sectie kan dat niet detecteren — 202 is alles wat de
browser krijgt — dus controleer bij het opleveren altijd in Klaviyo zelf of het
testprofiel er werkelijk staat, met een echt bezorgbaar adres.

Er wordt géén Klaviyo onsite-script geladen; de fetch gaat rechtstreeks naar het
endpoint. Dat scheelt een third-party script op precies de pagina waar het
advertentiebudget landt. Keerzijde: het formulier heeft JavaScript nodig.

### Afwijkingen van het ontwerp (bewust)

- **Iconen.** Het ontwerp gebruikt de Material Symbols Rounded webfont van
  Google. Vervangen door inline SVG in `snippets/custom-bc-icon.liquid`: geen
  extra request, geen FOUT, en de iconen erven `currentColor`. Het zijn
  benaderingen van de Material-vormen, geen originelen.
- **Fonts.** Het ontwerp laadt Hanken Grotesk via Google Fonts. Shopify's
  fontbibliotheek voert die familie **niet**, en dit theme serveert alleen
  Shopify-hosted fonts. Default is daarom **Figtree** (`figtree_n9` display,
  `figtree_n4` body) vanaf `fonts.shopifycdn.com`: dezelfde vriendelijke
  geometrische grotesque met het volledige bereik 400–900 dat het ontwerp
  gebruikt. Alle zes gewichten samen zijn ~72 KB (latin subset).

  **Valkuil:** `shopify theme check` valideert font-handles niet — het waarschuwt
  alleen bij handles die het kent als deprecated. Een niet-bestaande handle komt
  schoon door de lint en wordt pas bij het uploaden geweigerd met
  `Invalid schema: setting with id="…" default is invalid`. Test wijzigingen aan
  een `font_picker`-default dus altijd tegen een draaiende `shopify theme dev`.
- **`color-mix(in oklab, …)`** uit het ontwerp is doorgerekend naar hex, zodat de
  waarden werken als kleurinstelling in de editor: deep cherry `#511a39`,
  cherry tint `#fee7e7`, cherry-tekst `#882e49`.
- **Claims-tekst** staat in het ontwerp op `ink-55`, wat op wit 4,41:1 geeft —
  net onder de 4,5:1 die WCAG voor lopende tekst vraagt. Verhoogd naar `ink-75`
  (9,28:1). De rest van het palet is doorgerekend en haalt AA ruim.
- **Announcement bar** was een `div` met `role="button"`; nu een echte `<a>`.
  Werkt met toetsenbord, middelklik en zonder JS.
- **Scrollen naar het formulier** gebeurt via ankerlinks plus
  `scroll-behavior: smooth`, niet via JS-scrollhandlers.
- **Sticky CTA** gebruikt twee IntersectionObservers in plaats van de
  scroll-listener uit het ontwerp.
- **Enquête** schreef in het ontwerp naar `localStorage` (prototype); gaat nu
  naar Klaviyo.
- **Smaakprofiel** kreeg per regel een verborgen "4 van 5"-tekst: een rij
  gekleurde bolletjes zegt niets tegen een schermlezer.
- **Touch targets** zijn opgehoogd naar 44 px waar het ontwerp lager uitkwam:
  de header-CTA (was 40), de "Discover what's inside"-link (41) en de
  footerlinks (38). Opgelost met padding en een negatieve marge, dus het beeld
  verandert niet.

### Geverifieerd op 2026-08-02

Gerenderd via `shopify theme dev` op `/pages/faq?view=waitinglist` (het template
forceren op een bestaande pagina), in Chrome op 390×844 met device-emulatie:

- HTML 113 KB ongecomprimeerd (drempel 500 KB), CSS 28 KB, JS 9,8 KB,
  fonts 72 KB over zes gewichten.
- Eén `h1`, geen overgeslagen koppenniveaus, alle inputs aan een `<label>`
  gekoppeld, geen `<img>` zonder `alt` of afmetingen.
- Geen horizontale scroll; alle 38 interactieve elementen ≥ 44 px hoog.
- Geen console-fouten. Geen enkele request naar een niet-Shopify host.
- Formulierflow end-to-end getest via het honeypot-pad (verstuurt niets):
  aanmelden → bedanktpaneel → vraag 1 → vraag 2 → afsluittekst, met de focus die
  bij elke stap meeverhuist. Foutpad zet `aria-invalid` en meldt in de live region.
- Klaviyo-koppeling écht getest tegen lijst `RXr2FJ` met public key `V7Badc`:
  profiel aangemaakt met voornaam, `$source`, consent-record (`SUBSCRIBED`,
  `method: API`) en beide enquête-velden. Zie de opt-in-waarschuwing hierboven.

### Let op

- `p:empty { display: none }` uit Shrine's `base.css` is hier niet actief (die
  CSS wordt niet geladen), maar `.bc-signup__error:empty` houdt de live region
  toch expliciet in de accessibility tree — anders wordt de eerste foutmelding
  niet voorgelezen als de layout ooit wél `base.css` gaat laden.
- Alle afbeeldingen zijn `image_picker`-instellingen met een placeholder-terugval.
  Het ontwerp had ze als lege slots met een briefingtekst; die briefing staat nu
  in het `info`-veld van de betreffende instelling.
- **Prijs in `custom-bc-package`** komt uit een `product`-instelling (nu gekoppeld
  aan `daily-elektrolyte`, Energy Foundation). De wachtlijstprijs wordt daaruit
  afgeleid met `discount_percent` (standaard 25) en beide bedragen staan naast
  elkaar, met doorhaling, kortingsbadge en bespaarbedrag. Bedragen zijn integer
  centen: delen door `100.0` forceert float-rekenen zodat 25% van € 47,00 op
  € 35,25 uitkomt in plaats van af te kappen. Kies je geen product, dan valt de
  sectie terug op de handmatige tekstprijs — nodig zolang een product nog niet
  bestaat. Levering blijft altijd tekst: "[najaar 2026]" is een schatting.
- **Valutanotatie.** De `moneyFormat` van deze winkel is
  `{{amount_with_comma_separator}}`, dus zónder symbool: `| money` levert een kaal
  "47,00". Twee kale getallen naast elkaar zijn op een advertentiepagina
  dubbelzinnig, daarom een `money_format`-select die kiest tussen `money` en
  `money_with_currency` (standaard met valuta: "47,00 EUR"). Beide takken blijven
  binnen Liquid's money-filters — nooit zelf een valutastring bouwen, dat breekt
  zodra er een tweede markt bijkomt. Voegt de winkel later een € aan het
  prijsformaat toe, zet de select dan op compact.
- Schema-labels staan hardcoded in het Nederlands, net als in de overige
  `custom-*` secties. Klantgerichte tekst komt volledig uit settings, dus geen
  nieuwe `t:`-keys nodig.

---

## Zo werkt het (tijdlijn) — `custom-how-it-works`

**Datum:** 2026-08-01
**Bestanden:**
- `sections/custom-how-it-works.liquid`
- `assets/custom-how-it-works.css` (statische component-CSS)
- `snippets/custom-hiw-icon.liquid` (placeholder-iconen)

**Doel:** verticale tijdlijn die uitlegt hoe een product in lagen werkt (naar
ontwerp: "Aanvullen, niet oppeppen." — vier lagen met eigen tempo). Eyebrow,
heading, intro, een genummerde reeks stappen met icooncirkel + gestreepte
verbindingslijn, en een voetnoot voor claim-disclaimers.

**Markup:** `<ol role="list">` met per stap een `<span>` marker (`aria-hidden`,
puur decoratief), een `<p>` label, een `<h3>` titel en richtext. De
verbindingslijn is een `::before` op het item — geen lege elementen, dus geen
last van Shrine's `div:empty { display: none }` in `base.css`.

**Instellingen (sectie):** eyebrow (+grootte), heading (+`hxl`–`h3` of aangepast
px voor mobiel/desktop), intro, uitlijning header, max. breedte content, grootte
icooncirkel, ruimte tussen stappen, stijl/dikte verbindingslijn, groottes voor
label/stap-titel/lopende tekst/voetnoot, zes kleuren, padding boven/onder.

**Instellingen (blok `layer`, max. 8):** label, titel, tekst, eigen icoon
(`image_picker`, ~48×48 SVG/PNG) met daaronder een placeholder-icoon uit een
select (druppel, zouten, bliksem, capsule, vinkje, blad, klok, sprankel, hart,
maan, geen). Een geüpload icoon overschrijft de placeholder. Plus achtergrond- en
icoonkleur per stap.

**Shrine-integratie:** geen. Geen JS, geen commerce-logica, geen events — alleen
`page-width` en de heading-classes (`hxl`/`h0`–`h3`) uit Shrine's `base.css`.
Wijzigen die classnames in een update, dan valt alleen de typografie terug op de
component-defaults; de sectie blijft werken.

**Presets:** één preset met de vier lagen uit het ontwerp (water, zouten,
vitamines, creatine) inclusief kleuren.

**Let op:** schema-labels staan hier hardcoded in het Nederlands, net als in de
overige `custom-*` secties in deze theme. Klantgerichte tekst komt volledig uit
settings, dus er zijn geen nieuwe `t:`-keys nodig.

---

## Stappen (kaarten) — `custom-daily-steps`

**Datum:** 2026-08-01
**Bestanden:**
- `sections/custom-daily-steps.liquid`
- `assets/custom-daily-steps.css` (statische component-CSS)

**Doel:** "Three simple steps / Made to do daily." — eyebrow + grote heading,
daaronder witte kaarten met bovenin een afbeelding en onderin een genummerd
badge, titel en korte tekst. Mobiel één kolom, desktop standaard drie.

**Markup:** `<ol role="list">` met per stap een `<li>` kaart: media-div met
vaste `aspect-ratio` (geen CLS) en een body met badge + `<h3>` + richtext. Het
nummer staat op `aria-hidden` — de volgorde komt al uit de `<ol>`. Zonder
afbeelding valt de media terug op `placeholder_svg_tag`, dus nooit een leeg
element (Shrine's `div:empty { display: none }` in `base.css`).

**Instellingen (sectie):** eyebrow (+grootte), heading (+`hxl`–`h3` of aangepast
px voor mobiel/desktop), uitlijning header, stapnummers aan/uit, beeldverhouding
(16:9–4:5), kolommen desktop (1–4, wordt begrensd door het aantal stappen),
ruimte tussen kaarten, ronding kaart/afbeelding, padding kaart, extra
inspringing tekst, grootte badge/titel/tekst, acht kleuren, padding boven/onder.

**Instellingen (blok `step`, max. 6):** afbeelding, titel, tekst.

**Shrine-integratie:** geen. Geen JS, geen commerce-logica — alleen `page-width`
en de heading-classes (`hxl`/`h0`–`h3`) uit Shrine's `base.css`. Vervallen die
classes in een update, dan valt alleen de typografie terug op de
component-defaults; de sectie blijft werken.

**Presets:** één preset met de drie stappen uit het ontwerp (Prepare, Mix, Go).

**Let op:** schema-labels hardcoded in het Nederlands, conform de rest van de
`custom-*` secties; klantgerichte tekst komt uit settings, dus geen nieuwe
`t:`-keys.

---

## Microsoft Clarity

**Bestanden:** `snippets/custom-clarity.liquid`, gerenderd vanuit
`layout/custom-landing.liquid` (direct na `{{ content_for_header }}`).

**Waarom hardcoded:** `CLAUDE.md` schrijft voor dat third-party scripts via een
app embed lopen. Dat is hier geprobeerd en werkt niet: het blok
`shopify://apps/microsoft-clarity/blocks/clarity_js/31c3d126-…` staat in
`settings_data.json` met `"disabled": false` en `"settings": {}`, maar rendert
leeg in de HTML — de Shopify-app is niet aan een Clarity-project gekoppeld, dus
er komt geen tag op de pagina. De Data Export API gaf navenant lege metrics
terug. Dit is een bewuste, gedocumenteerde uitzondering op de regel.

**Scope:** alleen de waitlist-pagina. `custom-landing` is de layout van
uitsluitend `templates/page.waitinglist.json`; de rest van de winkel draait op
`layout/theme.liquid` en heeft dus géén Clarity. Wil je winkelbreed meten, dan
moet dat via de app embed of via een `CUSTOM-START/END` hook in `theme.liquid`
mét een entry in `docs/changes.md`.

**Project-ID:** `y0trvvheh2`, meegegeven als `project_id`-parameter aan het
snippet (niet in het snippet zelf hardcoded, zodat het herbruikbaar blijft).
Uitvoer gaat door `| json`, dus de waarde kan het script niet breken.

**Terugdraaien — belangrijk:** zodra de app embed wél een tag uitzendt, moet de
`{% render 'custom-clarity' %}` uit `custom-landing.liquid` en moet het snippet
weg. De embed injecteert via `{{ content_for_header }}`, dat deze layout óók
rendert, dus anders laadt Clarity twee keer en telt elke sessie dubbel.

**Consent:** het script vuurt nu onvoorwaardelijk, net zoals de app embed zou
doen. Clarity neemt sessies op; voor EU-verkeer hoort dat achter
analytics-toestemming (Shopify Customer Privacy API).

**Gecorrigeerd 2026-08-12 — de banner bestaat wél.** In de browser gemeten op de
dev-server: Shopify's eigen privacybanner (`#shopify-pc__banner`, "Cookietoestemming")
rendert op deze pagina via `{{ content_for_header }}`, `window.Shopify.customerPrivacy`
is beschikbaar, en `analyticsProcessingAllowed()` gaf **`false`** terug terwijl de
Clarity-tag gewoon draaide en opnam. De eerdere redenering — "een gate zou alle data
blokkeren want er is geen banner" — klopt dus niet: de toestemming wórdt opgehaald,
Clarity negeert alleen de uitkomst. Een gate is daarmee een reële optie geworden in
plaats van een doodlopende weg. Nog steeds een bewuste keuze om te maken, geen
stilzwijgende inbouw: gaten dicht je pas nadat je weet hoeveel verkeer je erdoor
verliest.

**Data ophalen:** MCP-server `@microsoft/clarity-mcp-server`, geconfigureerd in
`~/.claude.json` (project-scope) zodat het API-token niet in de repo staat.
Limiet: 10 requests per project per dag, alleen de laatste 1–3 dagen, max. 3
dimensies en 1.000 rijen per request.

---

## Clarity-meetlaag (waitlist-funnel)

**Bestanden:** `assets/custom-bc-clarity.js`, geladen vanuit
`layout/custom-landing.liquid` direct onder de tag-render. Dit is de tweede helft
van dezelfde gedocumenteerde uitzondering hierboven: geen vendor-script in Liquid,
maar eigen code die een global aanroept die al bestaat. Verwijderen = dit bestand
weg plus die ene scripttag.

**Waarom één bestand:** de secties blijven zo herbruikbaar op een andere pagina
zonder Clarity-afhankelijkheid, alle listeners zijn gedelegeerd op `document` en
overleven dus het opnieuw renderen van een sectie in de theme-editor, en de hele
meetlaag is op één plek te auditen.

### Events — `clarity("event", …)`

| Event | Vuurt bij | Vraag |
|---|---|---|
| `cta_click` | klik op een `a[href="#bc-signup"]` | werkt de overtuiging |
| `signup_seen` | `[data-bc-form]` ≥25% zichtbaar, ≥1s | bereikt men het formulier |
| `signup_start` | eerste focus in een echt veld | wordt het formulier aangeraakt |
| `signup_submit` | `submit`, capture-fase | hoeveel pogingen |
| `waitlist_signup` | `bc:subscribed` (Klaviyo 2xx) | **de conversie** |
| `signup_err_email` | ongeldig/leeg e-mailadres | is het e-mailveld de drempel |
| `signup_err_consent` | verplichte consent niet aangevinkt | is de checkbox de drempel |
| `signup_err_api` | Klaviyo-fout of ontbrekende config | worden inschrijvingen verloren |
| `survey_answer` | klik op `[data-bc-option]` | wordt de survey ingevuld |
| `faq_open` / `ingredient_open` | eerste `toggle` op een `details.bc-acc` | welke twijfel zoekt men op |

### Tags — `clarity("set", …)`

| Key | Waarden |
|---|---|
| `cta_source` | `announce` \| `header` \| `hero` \| `final` \| `sticky` |
| `faq_q` | vraagtekst, max 255 tekens |
| `ingredient` | ingrediëntnaam, max 255 tekens |
| `api_status` | HTTP-status, `network`, of `config` |

Eén `cta_click`-event plus een tag met vijf waarden, in plaats van vijf events:
bij dit verkeersvolume zouden vijf losse tellingen elk twee sessies groot zijn.

`clarity("upgrade", "signup_error")` bij elke mislukte inschrijving, zodat Clarity
juist díe opnames bewaart zodra het gaat samplen. `clarity("identify")` wordt
bewust nooit aangeroepen.

### Integratiepunten (DOM-events, hertesten na elke wijziging)

| Event | Bron | Payload |
|---|---|---|
| `bc:subscribed` | `assets/custom-bc-signup.js`, bij Klaviyo 2xx | `{ email, listId }` — **de meetlaag leest `detail` niet** |
| `bc:signup-error` | idem, vier faalpaden | `{ reason: 'email' \| 'consent' \| 'config' \| 'api', status }` — `status` is de HTTP-status, of `null` als de fetch nooit een response kreeg |

`custom-bc-signup.js` roept `preventDefault()` aan maar nooit `stopPropagation()`,
dus het `submit`-event bereikt `document`. `signup_submit` telt in de capture-fase,
vóór de honeypot-tak: `signup_submit` min (`waitlist_signup` + de drie
error-events) ís het aantal inzendingen dat de honeypot heeft opgeslokt. Gaat
browser-autofill ooit het veld "Bedrijf" invullen, dan krijgen echte bezoekers een
nep-succes zonder ingeschreven te worden — en die som is het enige dat dat zichtbaar
maakt.

`toggle` bubbelt niet; de accordeon-listener draait daarom in de capture-fase.

### Maskering

- Naam- en e-mailvelden vallen onder Clarity's standaardmaskering. Niets in
  `[data-bc-form]` unmasken.
- `[data-bc-thanks-title]` heeft `data-clarity-mask="true"` nodig en heeft die:
  `custom-bc-signup.js` schrijft de voornaam van de bezoeker als paginatekst in die
  titel, en de standaardmaskering dekt alleen velden, getallen en e-mailadressen.
- Controleer in Clarity → Settings → Masking dat het project op Balanced of Strict
  staat; op Relaxed klopt het bovenstaande niet meer.

### Wat de API wél en niet kan

De Data Export API kent geen dimensie voor custom events: **aantallen per event
lees je in de Clarity-UI**, niet via MCP. Recordings zijn wél op eventnaam te
filteren via `smartEvents`, mits het event in Clarity als Smart Event is
geregistreerd. Custom tags zijn UI-only. Heatmaps zitten helemaal niet in de API.

Meetmethode, vaste queryset en de snapshots: `docs/clarity/README.md`.

**Geen `t:`-keys:** event- en tagnamen zijn interne identifiers, geen
klantgerichte tekst, en blijven daarom Engels en hardcoded.
