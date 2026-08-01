# Custom sections

Eén entry per custom sectie: doel, bestanden, instellingen en eventuele Shrine-
integratiepunten. Integratiepunten opnieuw testen na elke Shrine-update.

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
