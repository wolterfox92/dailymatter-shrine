/* Pijlknoppen voor de beeldslider — sections/custom-bc-package.liquid.

   De scroller zelf is native (overflow + scroll-snap) en werkt zonder dit
   bestand: vegen, pijltjestoetsen op de focusbare regio en find-in-page komen
   allemaal van de browser. Dit script voegt alleen de zichtbare affordance toe,
   want een scroll-container laat op touch niets zien waaraan je ziet dat er meer
   staat.

   De knoppen zijn in CSS verborgen tot dit script ze aanzet (data-ready), zodat
   een asset die niet laadt geen dode knoppen achterlaat in plaats van geen. */

class BcSlider extends HTMLElement {
  #scroller = null;
  #prev = null;
  #next = null;
  #onScroll = null;

  connectedCallback() {
    this.#scroller = this.querySelector('[data-slider-scroller]');
    this.#prev = this.querySelector('[data-slider-prev]');
    this.#next = this.querySelector('[data-slider-next]');

    // Eén beeld: de Liquid rendert dan geen knoppen. Niets te doen.
    if (!this.#scroller || !this.#prev || !this.#next) return;

    this.#prev.addEventListener('click', () => this.#step(-1));
    this.#next.addEventListener('click', () => this.#step(1));

    // Eén handler voor scroll én resize: de knopstand hangt alleen van de
    // scrollpositie af, en die verschuift bij allebei.
    this.#onScroll = () => this.#sync();
    this.#scroller.addEventListener('scroll', this.#onScroll, { passive: true });
    window.addEventListener('resize', this.#onScroll, { passive: true });

    this.dataset.ready = 'true';
    this.#sync();
  }

  disconnectedCallback() {
    if (!this.#onScroll) return;
    this.#scroller?.removeEventListener('scroll', this.#onScroll);
    window.removeEventListener('resize', this.#onScroll);
  }

  #step(direction) {
    const scroller = this.#scroller;
    // Eén slide is precies één zichtbare breedte: de slides staan op
    // flex: 0 0 100%. Scroll-snap vangt afrondingsverschillen op.
    scroller.scrollBy({
      left: direction * scroller.clientWidth,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }

  #sync() {
    const { scrollLeft, clientWidth, scrollWidth } = this.#scroller;
    // Eén pixel speling: subpixelbreedtes maken de eindstand zelden exact.
    this.#prev.disabled = scrollLeft <= 1;
    this.#next.disabled = scrollLeft + clientWidth >= scrollWidth - 1;
  }
}

if (!customElements.get('bc-slider')) {
  customElements.define('bc-slider', BcSlider);
}
