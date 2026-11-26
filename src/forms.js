// Auto-generated: sends form entries to the site owner's Dasyal Inbox. Do not edit.
export const FORMS_URL = "https://api.dasyal.com/api/forms/cmww7dxik02dp3psy961s77zi";

/**
 * submitForm({ name, email, message, ...anyOtherFields }, { form: 'contact' })
 * Resolves when the entry was saved. Throws an Error with a friendly message otherwise.
 */
export async function submitForm(fields, options = {}) {
  let res;
  try {
    res = await fetch(FORMS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ form: options.form || 'contact', fields, page: window.location.href, _hp: options.trap || '' }),
    });
  } catch (e) {
    throw new Error('Could not send. Please check your connection and try again.');
  }
  let data = null;
  try { data = await res.json(); } catch (e) { /* not JSON */ }
  if (!res.ok || !data || !data.ok) throw new Error((data && data.message) || 'Could not send. Please try again.');
  return data;
}
