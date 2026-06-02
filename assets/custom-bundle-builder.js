(() => {
  if (customElements.get('custom-bundle-builder')) return;

  const formatMoney = (cents, format) => {
    const value = (cents / 100).toFixed(2);
    if (!format) return `$${value}`;
    return format
      .replace(/\{\{\s*amount\s*\}\}/g, value)
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/g, Math.round(cents / 100).toString())
      .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/g, value.replace('.', ','))
      .replace(/\{\{\s*amount_no_decimals_with_comma_separator\s*\}\}/g, Math.round(cents / 100).toString());
  };

  class CustomBundleBuilder extends HTMLElement {
    constructor() {
      super();
      this.state = {
        slots: [],
        sellingPlanId: null,
        loading: false,
      };
    }

    connectedCallback() {
      this.moneyFormat = this.dataset.moneyFormat || '${{amount}}';
      this.bundleSize = Number(this.dataset.bundleSize) || 3;
      this.discountPct = Number(this.dataset.discountPct) || 0;
      this.hasSubscription = this.dataset.hasSubscription === 'true';
      this.skipCart = this.dataset.skipCart === 'true';

      this.state.slots = new Array(this.bundleSize).fill(null);

      this.cacheEls();
      this.selectMoreLabel = (this.atcEl && this.atcEl.dataset.selectMoreLabel) || 'Select more flavours';
      this.atcActiveLabel = (this.atcEl && this.atcEl.dataset.atcActiveLabel) || 'Add to cart';
      this.bind();
      this.render();
    }

    cacheEls() {
      this.flavorEls = Array.from(this.querySelectorAll('.custom-bundle-builder__flavor'));
      this.slotEls = Array.from(this.querySelectorAll('.custom-bundle-builder__slot'));

      // Cache each slot's empty-state HTML (the placeholder icon) once at init
      // so we can restore it when a variant is removed.
      this.slotEls.forEach((slot) => {
        const imgWrap = slot.querySelector('[data-slot-img]');
        if (imgWrap && !imgWrap.dataset.placeholderHtml) {
          imgWrap.dataset.placeholderHtml = imgWrap.innerHTML;
        }
      });
      this.selectedCountEl = this.querySelector('[data-selected-count]');
      this.totalCountEl = this.querySelector('[data-total-count]');
      this.freqSelect = this.querySelector('[data-frequency]');
      this.lineItemsEl = this.querySelector('[data-lineitems]');
      this.priceEl = this.querySelector('[data-price]');
      this.compareEl = this.querySelector('[data-compare]');
      this.saveBadgeEl = this.querySelector('[data-save-badge]');
      this.saveAmountEl = this.querySelector('[data-save-amount]');
      this.atcEl = this.querySelector('[data-atc]');
      this.atcLabelEl = this.querySelector('[data-atc-label]');
      this.statusEl = this.querySelector('[data-status]');

      if (this.freqSelect) {
        this.state.sellingPlanId = this.freqSelect.value;
      }
    }

    bind() {
      this.flavorEls.forEach((el) => {
        const btn = el.querySelector('[data-add-variant]');
        if (!btn) return;
        btn.addEventListener('click', () => {
          this.addToBundle(el);
        });
      });

      this.slotEls.forEach((slot, idx) => {
        const removeBtn = slot.querySelector('[data-slot-remove]');
        if (!removeBtn) return;
        removeBtn.addEventListener('click', () => {
          this.removeFromBundle(idx);
        });
      });

      if (this.freqSelect) {
        this.freqSelect.addEventListener('change', () => {
          this.state.sellingPlanId = this.freqSelect.value;
        });
      }

      if (this.atcEl) {
        this.atcEl.addEventListener('click', () => this.addToCart());
      }
    }

    addToBundle(flavorEl) {
      const emptyIndex = this.state.slots.indexOf(null);
      if (emptyIndex === -1) return;

      const variant = {
        id: flavorEl.dataset.variantId,
        price: Number(flavorEl.dataset.variantPrice) || 0,
        compare: Number(flavorEl.dataset.variantCompare) || 0,
        title: flavorEl.dataset.variantTitle,
        image: flavorEl.dataset.variantImage,
      };
      this.state.slots[emptyIndex] = variant;
      this.render();
    }

    removeFromBundle(index) {
      if (!this.state.slots[index]) return;
      // Shift left so filled slots stay contiguous
      this.state.slots.splice(index, 1);
      this.state.slots.push(null);
      this.render();
    }

    selectedCount() {
      return this.state.slots.filter((s) => s !== null).length;
    }

    aggregateLineItems() {
      const map = new Map();
      for (const v of this.state.slots) {
        if (!v) continue;
        const entry = map.get(v.id);
        if (entry) {
          entry.qty += 1;
        } else {
          map.set(v.id, { id: v.id, title: v.title, price: v.price, qty: 1 });
        }
      }
      return Array.from(map.values());
    }

    render() {
      const selected = this.selectedCount();
      const full = selected >= this.bundleSize;

      if (this.selectedCountEl) this.selectedCountEl.textContent = selected;
      if (this.totalCountEl) this.totalCountEl.textContent = this.bundleSize;

      // Slots
      this.slotEls.forEach((slot, idx) => {
        const v = this.state.slots[idx];
        const imgWrap = slot.querySelector('[data-slot-img]');
        const removeBtn = slot.querySelector('[data-slot-remove]');
        if (v) {
          slot.dataset.filled = 'true';
          if (imgWrap) {
            imgWrap.innerHTML = v.image
              ? `<img src="${v.image}" alt="${this.escapeAttr(v.title)}" loading="lazy" width="120" height="120">`
              : '';
          }
          if (removeBtn) removeBtn.hidden = false;
        } else {
          delete slot.dataset.filled;
          if (imgWrap && imgWrap.dataset.placeholderHtml) {
            imgWrap.innerHTML = imgWrap.dataset.placeholderHtml;
          }
          if (removeBtn) removeBtn.hidden = true;
        }
      });

      // Disable Add buttons when bundle is full
      this.flavorEls.forEach((el) => {
        const btn = el.querySelector('[data-add-variant]');
        if (!btn) return;
        if (el.dataset.variantAvailable === 'false') {
          btn.disabled = true;
          return;
        }
        btn.dataset.bundleFull = full ? 'true' : 'false';
        btn.disabled = full;
      });

      // Line items
      const items = this.aggregateLineItems();
      if (this.lineItemsEl) {
        if (items.length === 0) {
          this.lineItemsEl.hidden = true;
          this.lineItemsEl.innerHTML = '';
        } else {
          this.lineItemsEl.hidden = false;
          this.lineItemsEl.innerHTML = items
            .map(
              (item) =>
                `<li class="custom-bundle-builder__lineitem"><span>${this.escapeText(item.title)}</span><span class="custom-bundle-builder__lineitem-qty">x${item.qty}</span></li>`
            )
            .join('');
        }
      }

      // Totals
      const baseTotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
      const discounted = Math.round(baseTotal * (1 - this.discountPct / 100));
      const saved = baseTotal - discounted;

      if (this.priceEl) this.priceEl.textContent = formatMoney(discounted, this.moneyFormat);
      if (this.compareEl) {
        if (this.discountPct > 0 && baseTotal > 0) {
          this.compareEl.textContent = formatMoney(baseTotal, this.moneyFormat);
          this.compareEl.hidden = false;
        } else {
          this.compareEl.hidden = true;
        }
      }
      if (this.saveBadgeEl) {
        if (saved > 0 && full) {
          this.saveBadgeEl.hidden = false;
          if (this.saveAmountEl) this.saveAmountEl.textContent = formatMoney(saved, this.moneyFormat);
        } else {
          this.saveBadgeEl.hidden = true;
        }
      }

      // ATC state + label
      if (this.atcEl && this.atcLabelEl) {
        if (!full) {
          this.atcEl.disabled = true;
          const remaining = this.bundleSize - selected;
          const tmpl = this.selectMoreLabel || 'Select more flavours';
          // Replace numeric placeholders if present, otherwise prefix the remaining count
          if (/\d/.test(tmpl)) {
            this.atcLabelEl.textContent = tmpl.replace(/\d+/, String(remaining));
          } else {
            this.atcLabelEl.textContent = `${tmpl} (${remaining})`;
          }
        } else {
          this.atcEl.disabled = this.state.loading;
          this.atcLabelEl.textContent = `${this.atcActiveLabel} — ${formatMoney(discounted, this.moneyFormat)}`;
        }
      }
    }

    escapeAttr(s) {
      return String(s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }

    escapeText(s) {
      const div = document.createElement('div');
      div.textContent = String(s || '');
      return div.innerHTML;
    }

    async addToCart() {
      if (this.state.loading) return;
      if (this.selectedCount() < this.bundleSize) return;

      const items = this.aggregateLineItems().map((it) => {
        const item = { id: Number(it.id), quantity: it.qty };
        if (this.state.sellingPlanId) {
          item.selling_plan = Number(this.state.sellingPlanId);
        }
        return item;
      });
      if (items.length === 0) return;

      this.state.loading = true;
      this.atcEl.disabled = true;
      this.atcEl.dataset.loading = 'true';
      const labelBefore = this.atcLabelEl ? this.atcLabelEl.textContent : '';
      if (this.atcLabelEl) this.atcLabelEl.textContent = 'Adding…';

      try {
        const sectionsToRefresh = ['cart-drawer', 'cart-icon-bubble', 'cart-notification'];
        const res = await fetch(`${(window.routes && window.routes.cart_add_url) || '/cart/add'}.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
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

        // Reset bundle
        this.state.slots = new Array(this.bundleSize).fill(null);

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

        document.documentElement.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
        if (window.PUB_SUB_EVENTS && window.publish) {
          window.publish(window.PUB_SUB_EVENTS.cartUpdate, { source: 'custom-bundle-builder', cartData: data });
        }

        const drawer = document.querySelector('cart-drawer');
        const drawerOpened = drawer && typeof drawer.open === 'function' ? (drawer.open(), true) : false;
        if (!drawerOpened && drawer) {
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
        if (this.atcLabelEl) this.atcLabelEl.textContent = labelBefore;
      } finally {
        this.state.loading = false;
        this.atcEl.dataset.loading = 'false';
        this.render();
      }
    }
  }

  customElements.define('custom-bundle-builder', CustomBundleBuilder);
})();
