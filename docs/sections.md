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
- Prijs en levering zijn tekstinstellingen (`[€ 49]`, `[najaar 2026]`), geen
  `money`-filter: er is nog geen product. Vervang ze zodra dat er is.
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
