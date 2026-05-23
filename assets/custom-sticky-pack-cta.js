(() => {
  if (customElements.get('custom-sticky-pack-cta')) return;

  class CustomStickyPackCta extends HTMLElement {
    connectedCallback() {
      this.packBuilder = document.querySelector(this.dataset.packBuilderSelector || 'pack-builder');
      this.selectEl = this.querySelector('[data-spc-select]');
      this.planTextEl = this.querySelector('[data-spc-plan-text]');
      this.saveEl = this.querySelector('[data-spc-save]');
      this.atcEl = this.querySelector('[data-spc-atc]');

      this.setupVisibility();
      this.bindEvents();
      this.syncInitial();
    }

    disconnectedCallback() {
      if (this.io) this.io.disconnect();
    }

    setupVisibility() {
      if (!this.packBuilder) return;
      this.io = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          const isAbove = entry.boundingClientRect.bottom < 0;
          this.classList.toggle('is-hidden', !isAbove);
        },
        { threshold: 0, rootMargin: '0px' }
      );
      this.io.observe(this.packBuilder);
    }

    bindEvents() {
      if (this.selectEl) {
        this.selectEl.addEventListener('change', () => {
          this.updatePlanText();
          if (this.packBuilder && typeof this.packBuilder.setSellingPlan === 'function') {
            this.packBuilder.setSellingPlan(this.selectEl.value);
          }
        });
      }

      if (this.atcEl) {
        this.atcEl.addEventListener('click', () => this.scrollToPackBuilder());
      }

      if (this.packBuilder) {
        this.packBuilder.addEventListener('pack-builder:state', (e) => this.onPbState(e.detail));
      }
    }

    syncInitial() {
      this.updatePlanText();
      if (!this.packBuilder) return;
      const pbSelect = this.packBuilder.querySelector('.pack-builder__frequency-select');
      if (pbSelect && this.selectEl && pbSelect.value) {
        this.selectEl.value = pbSelect.value;
        this.updatePlanText();
      }
      const activeTier = this.packBuilder.querySelector('.pack-builder__tier[aria-selected="true"]');
      if (activeTier) {
        const pct = Number(activeTier.dataset.tierPct) || 0;
        this.updateSave(pct);
      }
    }

    onPbState(detail) {
      if (!detail) return;
      if (this.selectEl && detail.sellingPlanId) {
        const val = String(detail.sellingPlanId);
        if (this.selectEl.value !== val) {
          this.selectEl.value = val;
          this.updatePlanText();
        }
      }
      const pct = detail.mode === 'subscription' ? Number(detail.tierPct) || 0 : 0;
      this.updateSave(pct);
    }

    updatePlanText() {
      if (!this.selectEl || !this.planTextEl) return;
      const opt = this.selectEl.options[this.selectEl.selectedIndex];
      if (opt) this.planTextEl.textContent = opt.textContent.trim();
    }

    updateSave(pct) {
      if (!this.saveEl) return;
      if (pct > 0) {
        this.saveEl.textContent = `Save ${pct}%`;
        this.saveEl.hidden = false;
      } else {
        this.saveEl.hidden = true;
      }
    }

    scrollToPackBuilder() {
      if (!this.packBuilder) return;
      if (typeof this.packBuilder.setMode === 'function') {
        this.packBuilder.setMode('subscription');
      }
      this.packBuilder.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  customElements.define('custom-sticky-pack-cta', CustomStickyPackCta);
})();
