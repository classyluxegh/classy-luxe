'use client';

import { useState } from 'react';
import { waLink } from '@/lib/site';
import { WhatsAppIcon } from './Icons';
import { useStore } from './StoreProvider';

function open(number: string, text: string) {
  window.open(waLink(number, text), '_blank', 'noopener');
}

export function OffersForm() {
  const { notify, settings } = useStore();
  const [error, setError] = useState('');
  return (
    <form className="offers-form reveal d2" noValidate onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const name = String(fd.get('name') || '').trim();
      if (!name) { setError('Please enter your name.'); return; }
      setError('');
      open(settings.whatsappNumber, `Hello Classy Luxe! Please add me to your WhatsApp list for new arrivals and offers.\n\nName: ${name}\nInterested in: ${fd.get('interest')}`);
      notify('WhatsApp opened — send the message to join the list.');
    }}>
      <div className={`field${error ? ' invalid' : ''}`}>
        <label htmlFor="offerName">Your name</label>
        <input id="offerName" name="name" autoComplete="name" placeholder="e.g. Ama Owusu" aria-invalid={!!error} onChange={() => error && setError('')} />
        {error && <p className="field-error">{error}</p>}
      </div>
      <div className="field">
        <label htmlFor="offerInterest">I&apos;m most interested in</label>
        <select id="offerInterest" name="interest">
          <option>All new arrivals &amp; offers</option>
          <option>Student Collection</option>
          <option>General Collection</option>
          <option>Body Splash &amp; Oil Perfumes</option>
          <option>Body &amp; Home (diffusers, hand cream, soap)</option>
        </select>
      </div>
      <button type="submit" className="btn btn-dark">Join via WhatsApp</button>
    </form>
  );
}

export function ContactForm() {
  const { notify, settings } = useStore();
  const [errors, setErrors] = useState<Record<string, string>>({});
  return (
    <form className="contact-form reveal d2" noValidate onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const name = String(fd.get('name') || '').trim();
      const msg = String(fd.get('message') || '').trim();
      const errs: Record<string, string> = {};
      if (!name) errs.name = 'Please enter your name.';
      if (!msg) errs.message = 'Please write a short message.';
      setErrors(errs);
      if (Object.keys(errs).length) return;
      const subject = String(fd.get('subject') || '') || 'General enquiry';
      open(settings.whatsappNumber, `Hello Classy Luxe!\n\n*Name:* ${name}\n*Phone:* ${String(fd.get('phone') || '').trim() || 'Not provided'}\n*Subject:* ${subject}${subject.includes('GCTU') ? ' — GCTU' : ''}\n\n*Message:*\n${msg}`);
      notify('WhatsApp opened — tap send to deliver your message.');
    }}>
      <h3>Send a message</h3>
      <p className="form-note">Your message opens in WhatsApp, ready to send to us.</p>
      <div className="field-row">
        <div className={`field${errors.name ? ' invalid' : ''}`}>
          <label htmlFor="cName">Your name</label>
          <input id="cName" name="name" autoComplete="name" placeholder="e.g. Ama Owusu" aria-invalid={!!errors.name} />
          {errors.name && <p className="field-error">{errors.name}</p>}
        </div>
        <div className="field">
          <label htmlFor="cPhone">Phone / WhatsApp <small>(optional)</small></label>
          <input id="cPhone" name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="e.g. 024 000 0000" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="cSubject">Subject</label>
        <select id="cSubject" name="subject" defaultValue="">
          <option value="" disabled>Choose a topic…</option>
          <option>Place an Order</option><option>Product Enquiry</option><option>Student Delivery (GCTU)</option>
          <option>Nationwide Delivery</option><option>Returns &amp; Exchanges</option><option>Other</option>
        </select>
      </div>
      <div className={`field${errors.message ? ' invalid' : ''}`}>
        <label htmlFor="cMsg">Message</label>
        <textarea id="cMsg" name="message" rows={4} placeholder="Tell us what you’re looking for — a fragrance, a gift, a delivery question…" aria-invalid={!!errors.message} />
        {errors.message && <p className="field-error">{errors.message}</p>}
      </div>
      <button type="submit" className="btn btn-dark btn-wa"><WhatsAppIcon />Send via WhatsApp</button>
    </form>
  );
}
