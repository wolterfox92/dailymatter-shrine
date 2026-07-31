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
      this.saveDisplay = this.dataset.saveDisplay || 'amount';
      this.saveLabel = (this.dataset.saveLabel || '').trim();
      this.statusTemplate = this.dataset.statusTemplate || '';
      this.loadingLabel = this.dataset.atcLoadingLabel || '…';
      this.errorLabel = this.dataset.atcErrorLabel || '';
      this.atcShowPrice = this.dataset.atcShowPrice !== 'false';

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
    }

    cacheEls() {
      this.planButtons = Array.from(this.querySelectorAll('.pack-builder__seg[data-plan]'));
      this.tierButtons = Array.from(this.querySelectorAll('.pack-builder__tier'));
      this.flavorEls = Array.from(this.querySelectorAll('.pack-builder__flavor'));
      this.statusEl = this.querySelector('[data-status]');
      this.atcEl = this.querySelector('[data-atc]');
      this.atcLabelEl = this.querySelector('[data-atc-label]');
      this.atcOriginalLabel = this.atcLabelEl ? this.atcLabelEl.textContent.trim() : 'Add to cart';
      this.planSaveEl = this.querySelector('[data-plan-save]');
      this.summaryEl = this.querySelector('.pack-builder__summary');
      this.summaryTitleEl = this.querySelector('[data-summary-title]');
      this.summaryPriceEl = this.querySelector('[data-summary-price]');
      this.summaryCompareEl = this.querySelector('[data-summary-compare]');
      this.summarySaveEl = this.querySelector('[data-summary-save]');
      this.freqSelect = this.querySelector('.pack-builder__frequency-select');
      this.freqLabelEl = this.querySelector('[data-freq-label]');
      this.freqPillEl = this.querySelector('[data-freq-pill]');

      // Seed counts
      this.flavorEls.forEach((el) => {
        const id = el.dataset.variantId;
        this.state.counts[id] = 0;
      });

      if (this.freqSelect) {
        this.state.sellingPlanId = this.freqSelect.value;
        this.updateFreqDisplay();
      }
    }

    planLabel(mode) {
      const btn = this.planButtons.find((b) => b.dataset.plan === mode);
      const labelEl = btn && btn.querySelector('.pack-builder__seg-label');
      return labelEl ? labelEl.textContent.trim() : '';
    }

    updateFreqDisplay() {
      if (!this.freqSelect) return;
      const opt = this.freqSelect.options[this.freqSelect.selectedIndex];
      const text = opt ? opt.textContent.trim() : '';
      if (this.freqLabelEl) this.freqLabelEl.textContent = text;
      if (this.freqPillEl) {
        const match = (this.dataset.mostPopularMatch || '').trim().toLowerCase();
        const show = match
          ? text.toLowerCase().includes(match)
          : this.freqSelect.selectedIndex === 0;
        this.freqPillEl.hidden = !show;
      }
    }

    bind() {
      this.planButtons.forEach((btn) => {
        btn.addEventListener('click', () => this.setMode(btn.dataset.plan));
      });

      this.tierButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
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

      this.flavorEls.forEach((el) => {
        const id = el.dataset.variantId;
        const countEl = el.querySelector('[data-count]');
        el.querySelectorAll('[data-step]').forEach((btn) => {
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

      if (this.freqSelect) {
        this.freqSelect.addEventListener('change', () => {
          this.state.sellingPlanId = this.freqSelect.value;
          this.updateFreqDisplay();
          this.notify();
        });
      }

      if (this.atcEl) {
        this.atcEl.addEventListener('click', () => this.addToCart());
      }
    }

    notify() {
      const pricing = this.pricing();
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
          total: pricing.total,
          totalFormatted: formatMoney(pricing.total, this.moneyFormat),
          saving: pricing.saving,
          savingFormatted: pricing.saving > 0 ? this.formatSaving(pricing.saving, this.state.tierPct) : '',
        },
      }));
    }

    setSellingPlan(id) {
      if (!this.freqSelect) return;
      const value = String(id);
      if (this.freqSelect.value === value) return;
      this.freqSelect.value = value;
      this.state.sellingPlanId = this.freqSelect.value;
      this.updateFreqDisplay();
      this.notify();
    }

    setMode(mode) {
      if (mode !== 'subscription' && mode !== 'one_time') return;
      if (mode === 'subscription' && !this.hasSubscription) return;
      if (this.state.mode === mode) return;
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

    syncTierToTotal() {
      const total = this.totalCount();
      if (total <= 0) return;
      // Pick the smallest tier whose qty >= total; if none fits, stick with the largest
      const sorted = [...this.tiers].sort((a, b) => Number(a.qty) - Number(b.qty));
      const match = sorted.find((t) => Number(t.qty) >= total) || sorted[sorted.length - 1];
      if (!match) return;
      this.state.tierQty = Number(match.qty);
      this.state.tierPct = Number(match.pct) || 0;
    }

    basePriceForCounts() {
      let total = 0;
      this.flavorEls.forEach((el) => {
        const id = el.dataset.variantId;
        const price = Number(el.dataset.variantPrice);
        total += price * (this.state.counts[id] || 0);
      });
      return total;
    }

    averageUnitPrice() {
      // Use first variant's price as base if no selections yet
      if (this.flavorEls.length === 0) return 0;
      return Number(this.flavorEls[0].dataset.variantPrice) || 0;
    }

    /** Base (undiscounted) total for a given pack quantity. */
    baseTotalFor(tierQty) {
      const selected = this.totalCount();
      if (selected > 0 && tierQty === this.state.tierQty) return this.basePriceForCounts();
      return this.averageUnitPrice() * tierQty;
    }

    /** Prices for the currently selected tier + plan. */
    pricing() {
      const base = this.baseTotalFor(this.state.tierQty);
      const pct = Number(this.state.tierPct) || 0;
      const discounted = Math.round(base * (1 - pct / 100));
      const isSub = this.state.mode === 'subscription';
      return {
        base,
        pct,
        total: isSub ? discounted : base,
        saving: isSub ? base - discounted : 0,
        subscriptionSaving: base - discounted,
      };
    }

    formatSaving(cents, pct) {
      const value = this.saveDisplay === 'percent'
        ? `${Math.round(pct)}%`
        : formatMoney(cents, this.moneyFormat);
      return this.saveLabel ? `${this.saveLabel} ${value}` : value;
    }

    renderPlans() {
      if (this.planButtons.length === 0) return;
      this.planButtons.forEach((btn) => {
        const isActive = btn.dataset.plan === this.state.mode;
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      this.dataset.selectedMode = this.state.mode;

      const activeBtn = this.planButtons.find((b) => b.dataset.plan === this.state.mode);
      if (this.summaryEl && activeBtn && activeBtn.id) {
        this.summaryEl.setAttribute('aria-labelledby', activeBtn.id);
      }
      if (this.summaryTitleEl) {
        this.summaryTitleEl.textContent = this.planLabel(this.state.mode);
      }

      // The badge on the subscription tab always advertises what subscribing saves.
      if (this.planSaveEl) {
        const { subscriptionSaving, pct } = this.pricing();
        if (subscriptionSaving > 0) {
          this.planSaveEl.textContent = this.formatSaving(subscriptionSaving, pct);
          this.planSaveEl.hidden = false;
        } else {
          this.planSaveEl.hidden = true;
        }
      }
    }

    renderTiers() {
      this.style.setProperty('--pb-tier-cols', this.tierButtons.length || 1);
      const isSub = this.state.mode === 'subscription' || !this.hasSubscription;

      this.tierButtons.forEach((btn) => {
        const tQty = Number(btn.dataset.tierQty);
        const tPct = Number(btn.dataset.tierPct) || 0;
        btn.setAttribute('aria-pressed', tQty === this.state.tierQty ? 'true' : 'false');

        const tierBase = this.baseTotalFor(tQty);
        const tierSaving = Math.round(tierBase * (tPct / 100));

        const saveEl = btn.querySelector('[data-tier-save]');
        if (saveEl) {
          if (isSub && tierSaving > 0) {
            saveEl.textContent = this.formatSaving(tierSaving, tPct);
            saveEl.hidden = false;
          } else {
            saveEl.hidden = true;
          }
        }

        const perDayEl = btn.querySelector('[data-tier-per-day]');
        if (perDayEl) {
          const totalSticks = tQty * this.sticksPerPack;
          const tierTotal = isSub ? tierBase - tierSaving : tierBase;
          if (totalSticks > 0 && tierTotal > 0) {
            const perDayCents = Math.round(tierTotal / totalSticks);
            perDayEl.textContent = `${formatMoney(perDayCents, this.moneyFormat)} ${this.perDaySuffix}`;
            perDayEl.hidden = false;
          } else {
            perDayEl.textContent = '';
            perDayEl.hidden = true;
          }
        }
      });
    }

    renderFlavors() {
      this.flavorEls.forEach((el) => {
        const id = el.dataset.variantId;
        const count = this.state.counts[id] || 0;
        const countEl = el.querySelector('[data-count]');
        if (countEl) countEl.textContent = count;
        const downBtn = el.querySelector('.pack-builder__step--down');
        const upBtn = el.querySelector('.pack-builder__step--up');
        if (downBtn) downBtn.disabled = count <= 0;
        if (upBtn) upBtn.disabled = el.dataset.variantAvailable === 'false';
      });
    }

    renderSummary() {
      const { base, total, saving, pct } = this.pricing();

      if (this.summaryPriceEl) this.summaryPriceEl.textContent = formatMoney(total, this.moneyFormat);
      if (this.summaryCompareEl) {
        if (saving > 0) {
          this.summaryCompareEl.textContent = formatMoney(base, this.moneyFormat);
          this.summaryCompareEl.hidden = false;
        } else {
          this.summaryCompareEl.hidden = true;
        }
      }
      if (this.summarySaveEl) {
        if (saving > 0) {
          this.summarySaveEl.textContent = this.formatSaving(saving, pct);
          this.summarySaveEl.hidden = false;
        } else {
          this.summarySaveEl.hidden = true;
        }
      }
    }

    atcLabel() {
      if (!this.atcShowPrice) return this.atcOriginalLabel;
      const { total } = this.pricing();
      if (total <= 0) return this.atcOriginalLabel;
      return `${this.atcOriginalLabel} · ${formatMoney(total, this.moneyFormat)}`;
    }

    renderStatus() {
      const selected = this.totalCount();
      const remaining = this.state.tierQty - selected;

      if (remaining > 0) {
        if (this.statusEl) {
          this.statusEl.textContent = this.statusTemplate
            .replace('[remaining]', remaining)
            .replace('[selected]', selected)
            .replace('[total]', this.state.tierQty);
        }
        if (this.atcEl) this.atcEl.disabled = true;
      } else {
        if (this.statusEl) this.statusEl.textContent = '';
        if (this.atcEl) this.atcEl.disabled = this.state.loading;
      }

      if (this.atcLabelEl && !this.state.loading) {
        this.atcLabelEl.textContent = this.atcLabel();
      }
    }

    render() {
      this.renderPlans();
      this.renderTiers();
      this.renderFlavors();
      this.renderSummary();
      this.renderStatus();
      this.notify();
    }

    async addToCart() {
      if (this.state.loading) return;
      const total = this.totalCount();
      if (total === 0 || total < this.state.tierQty) return;

      const items = [];
      this.flavorEls.forEach((el) => {
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

      // The button is optional (see the "show add to cart" setting) — the sticky
      // bar can drive this method without one being rendered.
      this.state.loading = true;
      if (this.atcEl) {
        this.atcEl.disabled = true;
        this.atcEl.dataset.loading = 'true';
      }
      if (this.atcLabelEl) this.atcLabelEl.textContent = this.loadingLabel;

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
          throw new Error(err.description || err.message || this.errorLabel);
        }
        const data = await res.json().catch(() => ({}));

        if (this.skipCart) {
          window.location.href = '/checkout';
          return;
        }

        // Reset counts
        this.flavorEls.forEach((el) => {
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
        if (this.statusEl) this.statusEl.textContent = err.message || this.errorLabel;
        console.error(err);
      } finally {
        this.state.loading = false;
        if (this.atcEl) this.atcEl.dataset.loading = 'false';
        this.render();
      }
    }
  }

  customElements.define('pack-builder', PackBuilder);
})();
