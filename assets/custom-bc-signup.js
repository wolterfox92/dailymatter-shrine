/* Black Cherry waitlist signup — sections/custom-bc-signup.liquid.

   Two Klaviyo client-side endpoints, both authenticated with the public API key
   (site ID) only:
   - POST /client/subscriptions  subscribes the email to the waitlist
   - POST /client/profiles       writes the two survey answers as profile properties
   Docs: https://developers.klaviyo.com/en/reference/create_client_subscription
         https://developers.klaviyo.com/en/reference/create_client_profile

   No Klaviyo onsite script is involved, so the page carries no third-party JS. */

const KLAVIYO_SUBSCRIBE_URL = 'https://a.klaviyo.com/client/subscriptions/';
const KLAVIYO_PROFILE_URL = 'https://a.klaviyo.com/client/profiles/';
const KLAVIYO_REVISION = '2026-07-15';

class BcSignupForm extends HTMLElement {
  #form;
  #panel;
  #thanks;
  #thanksTitle;
  #status;
  #button;
  #done;
  #surveys = [];
  #email = '';
  #busy = false;

  connectedCallback() {
    this.#form = this.querySelector('[data-bc-form]');
    if (!this.#form) return;

    this.#panel = this.querySelector('[data-bc-panel]');
    this.#thanks = this.querySelector('[data-bc-thanks]');
    this.#thanksTitle = this.querySelector('[data-bc-thanks-title]');
    this.#status = this.querySelector('[data-bc-status]');
    this.#button = this.querySelector('[data-bc-submit]');
    this.#done = this.querySelector('[data-bc-done]');
    this.#surveys = [...this.querySelectorAll('[data-bc-survey]')];

    this.#form.addEventListener('submit', this.#onSubmit);

    for (const survey of this.#surveys) {
      for (const option of survey.querySelectorAll('[data-bc-option]')) {
        option.addEventListener('click', () => this.#onAnswer(survey, option));
      }
    }
  }

  disconnectedCallback() {
    this.#form?.removeEventListener('submit', this.#onSubmit);
  }

  /* ---- Signup ---------------------------------------------------------- */

  #onSubmit = async (event) => {
    event.preventDefault();
    if (this.#busy) return;

    const data = new FormData(this.#form);

    // Honeypot filled means a bot: act as if it worked, send nothing.
    if (data.get('company')) {
      this.#showThanks('');
      return;
    }

    const emailField = this.#form.querySelector('input[type="email"]');
    const consentField = this.#form.querySelector('input[name="consent"]');
    const email = String(data.get('email') || '').trim();
    const firstName = String(data.get('first_name') || '')
      .trim()
      .split(' ')[0];

    if (!email || !emailField.checkValidity()) {
      this.#showError(this.#status?.dataset.invalidText);
      this.#fail('email');
      emailField.setAttribute('aria-invalid', 'true');
      emailField.focus();
      return;
    }
    emailField.removeAttribute('aria-invalid');

    if (consentField?.required && !consentField.checked) {
      this.#showError(this.#status?.dataset.consentText);
      this.#fail('consent');
      consentField.focus();
      return;
    }

    const { companyId, listId } = this.dataset;
    if (!companyId || !listId) {
      this.#showError(this.#status?.dataset.errorText);
      this.#fail('config');
      return;
    }

    this.#setBusy(true);

    try {
      const response = await fetch(
        `${KLAVIYO_SUBSCRIBE_URL}?company_id=${encodeURIComponent(companyId)}`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/vnd.api+json',
            revision: KLAVIYO_REVISION,
          },
          body: JSON.stringify(this.#subscriptionPayload(email, firstName, listId)),
        }
      );

      if (!response.ok) {
        // Carry the status through the catch: a response that failed and a fetch
        // that never got one need different answers.
        const failure = new Error(`Klaviyo responded ${response.status}`);
        failure.status = response.status;
        throw failure;
      }

      this.#email = email;
      this.#showThanks(firstName);
      this.dispatchEvent(
        new CustomEvent('bc:subscribed', { bubbles: true, detail: { email, listId } })
      );
    } catch (error) {
      console.error('[custom-bc-signup]', error);
      this.#showError(this.#status?.dataset.errorText);
      this.#fail('api', error.status ?? null);
    } finally {
      this.#setBusy(false);
    }
  };

  /* Announce why a signup did not happen. The three showError branches above and
     this catch all write the same two or three strings into the status line, so
     from the outside they are indistinguishable — and they need opposite responses:
     a blanked setting silently drops every signup, a 500 is Klaviyo having a
     moment. Analytics listens for this; nothing here knows about a vendor.
     Payload: reason 'email' | 'consent' | 'config' | 'api', and for 'api' the HTTP
     status, or null when the fetch never got a response at all. */
  #fail(reason, status = null) {
    this.dispatchEvent(
      new CustomEvent('bc:signup-error', { bubbles: true, detail: { reason, status } })
    );
  }

  #subscriptionPayload(email, firstName, listId) {
    // first_name is a first-class profile attribute on this endpoint. Sending it
    // as a legacy properties.$first_name instead is accepted with a 202 and then
    // silently dropped — verified against a real profile on 2026-08-02.
    const attributes = { email };
    if (firstName) attributes.first_name = firstName;

    return {
      data: {
        type: 'subscription',
        attributes: {
          custom_source: this.dataset.customSource || 'Waitlist',
          profile: { data: { type: 'profile', attributes } },
        },
        relationships: { list: { data: { type: 'list', id: listId } } },
      },
    };
  }

  /* ---- Survey ---------------------------------------------------------- */

  async #onAnswer(survey, option) {
    for (const other of survey.querySelectorAll('[data-bc-option]')) {
      other.setAttribute('aria-pressed', String(other === option));
    }

    const property = survey.dataset.property;
    const answer = option.value;

    survey.hidden = true;
    this.#advance(this.#surveys.indexOf(survey) + 1);

    // Best effort: the signup already succeeded, so a failed property write is
    // not worth interrupting the visitor for.
    const { companyId } = this.dataset;
    if (!companyId || !property || !this.#email) return;

    try {
      await fetch(`${KLAVIYO_PROFILE_URL}?company_id=${encodeURIComponent(companyId)}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/vnd.api+json',
          revision: KLAVIYO_REVISION,
        },
        body: JSON.stringify({
          data: {
            type: 'profile',
            attributes: { email: this.#email, properties: { [property]: answer } },
          },
        }),
      });
    } catch (error) {
      console.error('[custom-bc-signup]', error);
    }
  }

  /* Reveal the survey at `index`, or the closing text when the questions run
     out. Focus moves to the new question so it is announced, rather than being
     left on a button that just vanished. */
  #advance(index) {
    const next = this.#surveys[index];
    if (next) {
      next.hidden = false;
      const legend = next.querySelector('legend');
      if (legend) {
        legend.tabIndex = -1;
        legend.focus();
      }
      return;
    }

    if (this.#done) {
      this.#done.hidden = false;
      this.#done.tabIndex = -1;
      this.#done.focus();
    }
  }

  /* ---- State ----------------------------------------------------------- */

  #setBusy(busy) {
    this.#busy = busy;
    if (!this.#button) return;
    this.#button.disabled = busy;
    this.#button.setAttribute('aria-busy', String(busy));
  }

  #showError(message) {
    if (!this.#status) return;
    this.#status.textContent = message || '';
  }

  #showThanks(firstName) {
    this.#showError('');
    if (this.#panel) this.#panel.hidden = true;
    if (!this.#thanks) return;

    if (this.#thanksTitle) {
      const { successTitle, successTitleNamed } = this.dataset;
      this.#thanksTitle.textContent =
        firstName && successTitleNamed
          ? successTitleNamed.replace('[naam]', firstName)
          : successTitle || this.#thanksTitle.textContent;
    }

    this.#thanks.hidden = false;

    // Reveal the first survey question, or the closing text when there are none.
    const first = this.#surveys[0];
    if (first) {
      first.hidden = false;
    } else if (this.#done) {
      this.#done.hidden = false;
    }

    // Focus the confirmation heading, not the question: the visitor should hear
    // that the signup worked before being asked anything else.
    this.#thanksTitle?.focus();
  }
}

if (!customElements.get('bc-signup-form')) {
  customElements.define('bc-signup-form', BcSignupForm);
}
