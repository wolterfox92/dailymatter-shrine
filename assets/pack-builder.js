(() => {
  if (customElements.get('pack-builder')) return;

  const formatMoney = (cents, format) => {
    const value = (cents / 100).toFixed(2);
    if (!format) return `$${value}`;
    return format
      .replace(/\{\{\s*amount\s*\}\}/g, value)
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/g, Math.round(cents / 100).toString())
      .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/g, value.replace('.', ','))
      .replace(/\{\{\s*amount_no_decimals_with_comma_separator\s*\}\}/g, Math.round(cents / 100).toString());
  };

  class PackBuilder extends HTMLElement {
    constructor() {
      super();
      this.state = {
        tierQty: 0,
        tierPct: 0,
        counts: {},
        mode: 'subscription',
        sellingPlanId: null,
        loading: false,
      };
    }

    connectedCallback() {
      this.moneyFormat = this.dataset.moneyFormat || '${{amount}}';
      this.hasSubscription = this.dataset.hasSubscription === 'true';
      this.skipCart = this.dataset.skipCart === 'true';
      this.perDaySuffix = this.dataset.perDaySuffix || '/ day';
      this.sticksPerPack = Number(this.dataset.sticksPerPack) || 0;

      try {
        this.tiers = JSON.parse(this.dataset.tiers || '[]');
      } catch (_) {
        this.tiers = [];
      }

      this.state.mode = this.dataset.preselectedMode || 'subscription';
      if (!this.hasSubscription) this.state.mode = 'one_time';

      // Initial tier = first
      const firstTier = this.tiers[0];
      if (firstTier) {
        this.state.tierQty = Number(firstTier.qty) || 1;
        this.state.tierPct = Number(firstTier.pct) || 0;
      }

      this.cacheEls();
      this.bind();
      this.render();
      this.relocateTiers();
    }

    relocateTiers() {
      const tiersEl = this.querySelector('.pack-builder__tiers');
      if (!tiersEl) return;
      // Prefer the slot inside this pack-builder's own subscribe mode card.
      // Fall back to a standalone subscription-widget slot elsewhere on the page.
      const slot = this.querySelector('.pack-builder__mode--subscription [data-pack-builder-tiers-slot]')
        || document.querySelector('[data-pack-builder-tiers-slot]');
      if (!slot) return;
      const cs = getComputedStyle(this);
      ['--pb-accent', '--pb-accent-text', '--pb-border-radius', '--pb-border-width', '--pb-tier-cols'].forEach((v) => {
        const value = cs.getPropertyValue(v);
        if (value) tiersEl.style.setProperty(v, value.trim());
      });
      slot.appendChild(tiersEl);
      tiersEl.classList.add('pack-builder__tiers--in-subscription');
    }

    cacheEls() {
      this.tierButtons = Array.from(this.querySelectorAll('.pack-builder__tier'));
      this.flavorEls = Array.from(this.querySelectorAll('.pack-builder__flavor'));
      this.statusEl = this.querySelector('[data-status]');
      this.atcEl = this.querySelector('[data-atc]');
      this.atcLabelEl = this.querySelector('[data-atc-label]');
      this.atcOriginalLabel = this.atcLabelEl ? this.atcLabelEl.textContent : 'Add to cart';
      this.modeRadios = Array.from(this.querySelectorAll('.pack-builder__mode-radio'));
      this.freqSelect = this.querySelector('.pack-builder__frequency-select');

      // Seed counts
      this.flavorEls.forEach(el => {
        const id = el.dataset.variantId;
        this.state.counts[id] = 0;
      });

      if (this.freqSelect) {
        this.state.sellingPlanId = this.freqSelect.value;
      }
    }

    bind() {
      this.tierButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const qty = Number(btn.dataset.tierQty);
          const pct = Number(btn.dataset.tierPct);
          this.state.tierQty = qty;
          this.state.tierPct = pct;
          // If new tier is smaller than current selections, trim them
          let total = this.totalCount();
          if (total > qty) {
            const ids = Object.keys(this.state.counts);
            for (let i = ids.length - 1; i >= 0 && total > qty; i--) {
              const overflow = total - qty;
              const current = this.state.counts[ids[i]];
              const reduce = Math.min(current, overflow);
              this.state.counts[ids[i]] -= reduce;
              total -= reduce;
            }
          }
          this.render();
        });
      });

      this.flavorEls.forEach(el => {
        const id = el.dataset.variantId;
        const countEl = el.querySelector('[data-count]');
        el.querySelectorAll('[data-step]').forEach(btn => {
          btn.addEventListener('click', () => {
            const step = Number(btn.dataset.step);
            const next = this.state.counts[id] + step;
            if (next < 0) return;
            this.state.counts[id] = next;
            countEl.textContent = next;
            this.syncTierToTotal();
            this.render();
          });
        });
      });

      this.modeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
          if (radio.checked) {
            this.state.mode = radio.value;
            this.render();
          }
        });
      });

      if (this.freqSelect) {
        this.freqSelect.addEventListener('change', () => {
          this.state.sellingPlanId = this.freqSelect.value;
          this.notify();
        });
      }

      if (this.atcEl) {
        this.atcEl.addEventListener('click', () => this.addToCart());
      }
    }

    notify() {
      this.dispatchEvent(new CustomEvent('pack-builder:state', {
        bubbles: true,
        detail: {
          mode: this.state.mode,
          sellingPlanId: this.state.sellingPlanId,
          tierQty: this.state.tierQty,
          tierPct: this.state.tierPct,
          totalCount: this.totalCount(),
          isComplete: this.state.tierQty > 0 && this.totalCount() >= this.state.tierQty,
          hasSubscription: this.hasSubscription,
        },
      }));
    }

    setSellingPlan(id) {
      if (!this.freqSelect) return;
      const value = String(id);
      if (this.freqSelect.value === value) return;
      this.freqSelect.value = value;
      this.state.sellingPlanId = this.freqSelect.value;
      this.notify();
    }

    setMode(mode) {
      if (mode === 'subscription' && !this.hasSubscription) return;
      const radio = this.modeRadios.find((r) => r.value === mode);
      if (!radio || radio.checked) return;
      radio.checked = true;
      this.state.mode = mode;
      this.render();
    }

    triggerAddToCart() {
      if (this.state.tierQty > 0 && this.totalCount() >= this.state.tierQty) {
        this.addToCart();
        return true;
      }
      this.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (this.statusEl) {
        this.statusEl.classList.remove('pack-builder__status--flash');
        // force reflow to restart animation
        void this.statusEl.offsetWidth;
        this.statusEl.classList.add('pack-builder__status--flash');
      }
      return false;
    }

    totalCount() {
      return Object.values(this.state.counts).reduce((a, b) => a + b, 0);
    }

    maxTierQty() {
      return this.tiers.reduce((max, t) => Math.max(max, Number(t.qty) || 0), 0);
    }

    syncTierToTotal() {
      const total = this.totalCount();
      if (total <= 0) return;
      // Pick the smallest tier whose qty >= total; if none fits, stick with the largest
      const sorted = [...this.tiers].sort((a, b) => Number(a.qty) - Number(b.qty));
      const match = sorted.find(t => Number(t.qty) >= total) || sorted[sorted.length - 1];
      if (!match) return;
      this.state.tierQty = Number(match.qty);
      this.state.tierPct = Number(match.pct) || 0;
    }

    basePriceForCounts() {
      let total = 0;
      this.flavorEls.forEach(el => {
        const id = el.dataset.variantId;
        const price = Number(el.dataset.variantPrice);
        total += price * (this.state.counts[id] || 0);
      });
      return total;
    }

    averageUnitPrice() {
      // Use first variant's price as base if no selections yet
      if (this.flavorEls.length === 0) return 0;
      const firstPrice = Number(this.flavorEls[0].dataset.variantPrice) || 0;
      return firstPrice;
    }

    render() {
      // Tier active state + grid cols
      this.style.setProperty('--pb-tier-cols', this.tierButtons.length || 1);
      const unitPriceForTiers = this.averageUnitPrice();
      this.tierButtons.forEach(btn => {
        const tQty = Number(btn.dataset.tierQty);
        const tPct = Number(btn.dataset.tierPct) || 0;
        const isActive = tQty === this.state.tierQty;
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');

        const perDayEl = btn.querySelector('[data-tier-per-day]');
        if (perDayEl) {
          const totalSticks = tQty * this.sticksPerPack;
          if (totalSticks > 0 && unitPriceForTiers > 0) {
            const tierTotal = unitPriceForTiers * tQty * (1 - tPct / 100);
            const perDayCents = Math.round(tierTotal / totalSticks);
            perDayEl.textContent = `${formatMoney(perDayCents, this.moneyFormat)} ${this.perDaySuffix}`;
            perDayEl.hidden = false;
          } else {
            perDayEl.textContent = '';
            perDayEl.hidden = true;
          }
        }
      });

      // Flavor counts
      this.flavorEls.forEach(el => {
        const id = el.dataset.variantId;
        const count = this.state.counts[id] || 0;
        const countEl = el.querySelector('[data-count]');
        if (countEl) countEl.textContent = count;
        const downBtn = el.querySelector('.pack-builder__step--down');
        const upBtn = el.querySelector('.pack-builder__step--up');
        if (downBtn) downBtn.disabled = count <= 0;
        if (upBtn) upBtn.disabled = el.dataset.variantAvailable === 'false';
      });

      // Price calculation
      const unitsRequired = this.state.tierQty;
      const currentTotalUnits = this.totalCount();
      const unitsToPrice = currentTotalUnits > 0 ? currentTotalUnits : unitsRequired;
      const unitPrice = this.averageUnitPrice();

      const baseTotal = currentTotalUnits > 0 ? this.basePriceForCounts() : unitPrice * unitsRequired;
      const pct = Number(this.state.tierPct) || 0;
      const discountedTotal = Math.round(baseTotal * (1 - pct / 100));

      // Update subscription prices
      const subPriceEl = this.querySelector('[data-sub-price]');
      const subCompareEl = this.querySelector('[data-sub-compare]');
      if (subPriceEl) subPriceEl.textContent = formatMoney(discountedTotal, this.moneyFormat);
      if (subCompareEl) {
        if (pct > 0) {
          subCompareEl.textContent = formatMoney(baseTotal, this.moneyFormat);
          subCompareEl.hidden = false;
        } else {
          subCompareEl.hidden = true;
        }
      }

      // One-time prices — no tier discount, always full price
      const otPriceEl = this.querySelector('[data-ot-price]');
      const otCompareEl = this.querySelector('[data-ot-compare]');
      if (otPriceEl) otPriceEl.textContent = formatMoney(baseTotal, this.moneyFormat);
      if (otCompareEl) otCompareEl.hidden = true;

      // Status text + ATC enabled
      const remaining = this.state.tierQty - currentTotalUnits;
      if (remaining > 0) {
        if (this.statusEl) this.statusEl.textContent = `Select ${remaining} more to fill your pack (${currentTotalUnits}/${this.state.tierQty})`;
        if (this.atcEl) {
          this.atcEl.disabled = true;
          if (this.atcLabelEl) this.atcLabelEl.textContent = this.atcOriginalLabel;
        }
      } else {
        if (this.statusEl) this.statusEl.textContent = '';
        if (this.atcEl) {
          this.atcEl.disabled = this.state.loading;
          if (this.atcLabelEl) this.atcLabelEl.textContent = this.atcOriginalLabel;
        }
      }

      this.notify();
    }

    async addToCart() {
      if (this.state.loading) return;
      const total = this.totalCount();
      if (total === 0 || total < this.state.tierQty) return;

      const items = [];
      this.flavorEls.forEach(el => {
        const id = el.dataset.variantId;
        const qty = this.state.counts[id] || 0;
        if (qty > 0) {
          const item = { id: Number(id), quantity: qty };
          if (this.state.mode === 'subscription' && this.state.sellingPlanId) {
            item.selling_plan = Number(this.state.sellingPlanId);
          }
          items.push(item);
        }
      });

      if (items.length === 0) return;

      this.state.loading = true;
      this.atcEl.disabled = true;
      this.atcEl.dataset.loading = 'true';
      if (this.atcLabelEl) this.atcLabelEl.textContent = 'Adding…';

      try {
        const sectionsToRefresh = ['cart-drawer', 'cart-icon-bubble', 'cart-notification'];
        const res = await fetch(`${window.routes?.cart_add_url || '/cart/add'}.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            items,
            sections: sectionsToRefresh.join(','),
            sections_url: window.location.pathname,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.description || err.message || 'Add to cart failed');
        }
        const data = await res.json().catch(() => ({}));

        if (this.skipCart) {
          window.location.href = '/checkout';
          return;
        }

        // Reset counts
        this.flavorEls.forEach(el => {
          const id = el.dataset.variantId;
          this.state.counts[id] = 0;
        });

        // Swap rendered section HTML so the drawer/header reflect the new cart
        // before we open anything. Without this the drawer opens with stale markup.
        const sections = data && data.sections ? data.sections : null;
        if (sections) {
          const swap = (sectionId, targetSelector) => {
            const html = sections[sectionId];
            if (!html) return;
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const incoming = doc.querySelector(targetSelector);
            const current = document.querySelector(targetSelector);
            if (incoming && current) {
              current.innerHTML = incoming.innerHTML;
              if (incoming.className) current.className = incoming.className;
            }
          };
          swap('cart-drawer', 'cart-drawer');
          swap('cart-icon-bubble', '#cart-icon-bubble');
        }

        // Notify the rest of the theme that the cart changed
        document.documentElement.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
        if (window.PUB_SUB_EVENTS && window.publish) {
          window.publish(window.PUB_SUB_EVENTS.cartUpdate, { source: 'pack-builder', cartData: data });
        }

        // Open the cart drawer (preferred) or fall back to the notification
        const drawer = document.querySelector('cart-drawer');
        const drawerOpened = drawer && typeof drawer.open === 'function'
          ? (drawer.open(), true)
          : false;
        if (!drawerOpened && drawer) {
          // Custom-element class isn't registered — use the same CSS hooks the theme uses
          drawer.classList.add('animate', 'active');
          drawer.removeAttribute('aria-hidden');
          document.body.classList.add('overflow-hidden');
        }
        if (!drawer) {
          const notif = document.querySelector('cart-notification');
          if (notif && typeof notif.open === 'function') notif.open();
        }
      } catch (err) {
        if (this.statusEl) this.statusEl.textContent = err.message || 'Something went wrong.';
        console.error(err);
      } finally {
        this.state.loading = false;
        this.atcEl.dataset.loading = 'false';
        this.render();
      }
    }
  }

  customElements.define('pack-builder', PackBuilder);
})();
