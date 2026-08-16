/* Clarity measurement layer for the waitlist funnel — layout/custom-landing.liquid.

   Every Clarity call for this page lives here and nowhere else, so the whole
   measurement layer disappears by deleting this file plus one line in the layout.
   The sections stay portable: they dispatch plain DOM events, this file decides
   what those mean to a vendor.

   All listeners are delegated on `document`, so they survive the theme editor
   re-rendering a section and a reordered page needs no change here.

   PRIVACY, non-negotiable: `bc:subscribed` carries the visitor's email address in
   its detail. It is never read. No personal data goes into an event name or a tag
   value, and clarity("identify") is deliberately never called — see
   docs/sections.md#microsoft-clarity.

   Timing: snippets/custom-clarity.liquid defines window.clarity synchronously in
   <head> as a queue stub, so nothing here can run too early — calls made before
   clarity.ms finishes loading are queued and replayed. The guard in `send` covers
   the other cases: the snippet rendered without a project id, or a content blocker
   that stops the network request while leaving the stub in place. */

const CTA_SOURCES = [
  ['.bc-announce', 'announce'],
  ['.bc-header', 'header'],
  ['.bc-hero', 'hero'],
  ['.bc-final', 'final'],
  ['.bc-sticky', 'sticky'],
];

/* Both config and api failures are one event: from the outside they are the same
   thing — a signup that reached the network layer and was lost. The api_status tag
   is what separates "the merchant blanked a setting and every signup is being
   dropped" from "Klaviyo returned a 500". */
const ERROR_EVENTS = {
  email: 'signup_err_email',
  consent: 'signup_err_consent',
  flavour: 'signup_err_flavour',
  config: 'signup_err_api',
  api: 'signup_err_api',
};

const SIGNUP_ANCHOR = '#bc-signup';
const TAG_MAX_LENGTH = 255;
const SEEN_DWELL_MS = 1000;

const fired = new Set();

function send(...args) {
  if (typeof window.clarity !== 'function') return;

  try {
    window.clarity(...args);
  } catch (error) {
    // Measurement must never break the page that carries the conversion.
    console.error('[custom-bc-clarity]', error);
  }
}

const track = (name) => send('event', name);

const tag = (key, value) => {
  if (!value) return;
  send('set', key, String(value).slice(0, TAG_MAX_LENGTH));
};

/* Clarity samples recordings once a project gets busy. Failed signups are rare and
   are the only sessions whose playback is genuinely needed, so ask for them. */
const upgrade = (reason) => send('upgrade', reason);

/* For the events that describe a stage rather than an action: a visitor reaches the
   form once, however many times it scrolls back into view. */
const once = (name) => {
  if (fired.has(name)) return false;
  fired.add(name);
  return true;
};

/* ---- Reaching the form ------------------------------------------------- */

const form = document.querySelector('[data-bc-form]');

if (form) {
  /* Observe the form, not the #bc-signup section. On a 390px viewport that section
     is taller than the screen, so a 50% threshold could never be satisfied and the
     event would silently never fire — the mobile-first trap in this design. */
  let dwell = null;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          clearTimeout(dwell);
          continue;
        }

        // A scroll that flies straight past the form is not "seen".
        dwell = setTimeout(() => {
          if (once('signup_seen')) track('signup_seen');
          observer.disconnect();
        }, SEEN_DWELL_MS);
      }
    },
    { threshold: 0.25 }
  );

  observer.observe(form);
}

/* ---- Engaging with the form -------------------------------------------- */

document.addEventListener('focusin', (event) => {
  const field = event.target;
  if (!(field instanceof Element)) return;
  if (!field.matches('[data-bc-form] :is(input, select, textarea)')) return;
  // The honeypot sits off-screen; only a bot or an over-eager autofill reaches it.
  if (field.getAttribute('name') === 'company') return;

  if (once('signup_start')) track('signup_start');
});

/* Capture phase, so this runs before the section's own submit handler and the
   timeline reads submit -> outcome rather than the other way round.

   Counting here, ahead of that handler's honeypot branch, is deliberate:
   signup_submit minus (waitlist_signup + the three error events) is the number of
   submissions the honeypot swallowed. If browser autofill ever starts filling the
   "Bedrijf" field, real visitors get a fake success and are never subscribed, and
   that arithmetic is the only thing that would reveal it. */
document.addEventListener(
  'submit',
  (event) => {
    if (!(event.target instanceof Element) || !event.target.matches('[data-bc-form]')) return;
    track('signup_submit');
  },
  true
);

/* ---- Outcomes ----------------------------------------------------------- */

document.addEventListener('bc:subscribed', () => {
  // event.detail holds the email address. Not read — see the header comment.
  track('waitlist_signup');
});

document.addEventListener('bc:signup-error', (event) => {
  const { reason, status } = event.detail || {};
  const name = ERROR_EVENTS[reason];
  if (!name) return;

  track(name);

  if (reason === 'config' || reason === 'api') {
    // A null status means fetch itself threw: network, CORS or a blocker.
    tag('api_status', reason === 'config' ? 'config' : String(status || 'network'));
  }

  upgrade('signup_error');
});

/* De smaakkeuze in het formulier is een dimensie, geen actie: als tag filtert hij
   recordings ("wie Tropical Pineapple koos, haakte af bij …"), als event zou hij bij
   dit verkeer drie losse tellingen van niets opleveren. De echte inventarisatie
   staat in Klaviyo. Een smaaknaam is geen persoonsgegeven. */
document.addEventListener('change', (event) => {
  const input = event.target;
  if (!(input instanceof Element)) return;
  if (!input.matches('[data-bc-flavour] input[name="flavour"]')) return;

  tag('flavour', input.value);
});

/* ---- Interest signals --------------------------------------------------- */

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const option = target.closest('[data-bc-survey] [data-bc-option]');
  if (option) {
    track('survey_answer');
    // Staat de smaakvraag ná de aanmelding, dan komt de keuze hier binnen. Zelfde
    // tag als de variant in het formulier, zodat de plek de meting niet verandert.
    if (option.matches('.bc-survey__option--flavour')) tag('flavour', option.value);
    return;
  }

  // getAttribute, not .href: the property resolves to an absolute URL.
  const link = target.closest('a');
  if (!link || link.getAttribute('href') !== SIGNUP_ANCHOR) return;

  track('cta_click');

  /* One event plus a five-value tag, rather than five events. At this traffic five
     separate counts would each be two or three sessions and mean nothing, while the
     tag still filters recordings down to a single CTA. */
  for (const [selector, source] of CTA_SOURCES) {
    if (link.closest(selector)) {
      tag('cta_source', source);
      break;
    }
  }
});

/* `toggle` does not bubble, so a delegated listener has to run in the capture
   phase — capture propagates from window down to the target whether an event
   bubbles or not. One listener covers all fourteen accordions. */
document.addEventListener(
  'toggle',
  (event) => {
    const details = event.target;
    if (!(details instanceof Element) || !details.matches('details.bc-acc')) return;
    if (!details.open) return;

    if (details.matches('.bc-faq__item')) {
      track('faq_open');
      tag('faq_q', details.querySelector('.bc-faq__q')?.textContent.trim());
      return;
    }

    if (details.matches('.bc-ingredient')) {
      track('ingredient_open');
      tag('ingredient', details.querySelector('.bc-ingredient__name')?.textContent.trim());
    }
  },
  true
);
