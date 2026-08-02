/* Sticky CTA bar — sections/custom-bc-sticky-cta.liquid.

   Two IntersectionObservers, no scroll handler:
   - "after" element (the hero by default): while it is on screen we are still at
     the top of the page and the bar stays down.
   - the CTA's own target (the signup form): while that is on screen the bar hides,
     so it never covers the form it points at.

   Both default to the permissive state when the element is missing, so removing
   the hero or renaming the form anchor degrades to "always visible" rather than
   "never visible". */

class BcStickyCta extends HTMLElement {
  #pastIntro = false;
  #targetVisible = false;
  #observers = [];

  connectedCallback() {
    const intro = this.dataset.after ? document.querySelector(this.dataset.after) : null;
    const target = this.dataset.target?.startsWith('#')
      ? document.querySelector(this.dataset.target)
      : null;

    if (!intro) this.#pastIntro = true;

    if (intro) {
      this.#observe(intro, (entry) => {
        this.#pastIntro = !entry.isIntersecting;
      });
    }

    if (target) {
      this.#observe(
        target,
        (entry) => {
          this.#targetVisible = entry.isIntersecting;
        },
        // Treat "nearly on screen" as visible: the bar should already be gone by
        // the time the form reaches the fold.
        { rootMargin: '-15% 0px -20% 0px' }
      );
    }

    this.#render();
  }

  disconnectedCallback() {
    for (const observer of this.#observers) observer.disconnect();
    this.#observers = [];
  }

  #observe(element, onEntry, options) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) onEntry(entry);
      this.#render();
    }, options);

    observer.observe(element);
    this.#observers.push(observer);
  }

  #render() {
    const visible = this.#pastIntro && !this.#targetVisible;
    this.dataset.visible = String(visible);
    // Keep the button out of the tab order while the bar is parked off-screen.
    this.setAttribute('aria-hidden', String(!visible));
    const link = this.querySelector('a');
    if (link) link.tabIndex = visible ? 0 : -1;
  }
}

if (!customElements.get('bc-sticky-cta')) {
  customElements.define('bc-sticky-cta', BcStickyCta);
}
