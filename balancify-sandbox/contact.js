/* Contact form for the Balancify sandbox.
   The form UI calls sendContact and does not build the outgoing message itself.
   Swap the body of sendContact for an Appwrite Function later; keep the payload. */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.BALContact = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var TO = "detoxify.ai@proton.me";
  var BODY_MAX = 1000;
  var KINDS = ["באג", "הצעה לשיפור", "כללי"];

  function trim(s) { return String(s == null ? "" : s).replace(/^\s+|\s+$/g, ""); }

  function validEmail(s) {
    if (!s || s.length > 254) return false;
    if (s.indexOf("..") !== -1) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
  }

  function validateContact(input) {
    var src = input || {};
    var name = trim(src.name);
    var email = trim(src.email);
    var kind = trim(src.kind);
    var subject = trim(src.subject);
    var body = trim(src.body);
    var errors = {};
    if (!name) errors.name = "נא למלא שם מלא";
    if (!email || !validEmail(email)) errors.email = "נא למלא מייל תקין";
    if (KINDS.indexOf(kind) === -1) errors.kind = "נא לבחור סוג פנייה";
    if (!subject) errors.subject = "נא למלא נושא";
    if (!body) errors.body = "נא לכתוב את הפנייה";
    else if (body.length > BODY_MAX) errors.body = "הפנייה יכולה להכיל עד 1000 תווים";
    return {
      ok: !errors.name && !errors.email && !errors.kind && !errors.subject && !errors.body,
      errors: errors,
      value: { name: name, email: email, kind: kind, subject: subject, body: body }
    };
  }

  function subjectLine(value) {
    return "[איזוניפיי] " + value.kind + ": " + value.subject;
  }

  function bodyText(value) {
    return [
      "שם מלא: " + value.name,
      "מייל עיקרי: " + value.email,
      "סוג פנייה: " + value.kind,
      "נושא: " + value.subject,
      "פנייה:",
      value.body
    ].join("\n");
  }

  function mailtoHref(value) {
    return "mailto:" + TO + "?subject=" + encodeURIComponent(subjectLine(value)) + "&body=" + encodeURIComponent(bodyText(value));
  }

  function openMailto(href) {
    if (typeof document === "undefined" || !document.body) return;
    var a = document.createElement("a");
    a.href = href;
    a.rel = "noopener";
    a.style.position = "fixed";
    a.style.width = "1px";
    a.style.height = "1px";
    a.style.opacity = "0";
    a.style.inset = "0 auto auto 0";
    document.body.appendChild(a);
    a.click();
    if (a.parentNode) a.parentNode.removeChild(a);
  }

  function sendContact(input, open) {
    var check = validateContact(input);
    if (!check.ok) return { ok: false, errors: check.errors };
    var href = mailtoHref(check.value);
    // TODO: Replace this mailto handoff with an Appwrite Function call.
    // sendContact stays the only send step. Keep the payload
    // { name, email, kind, subject, body } and the { ok, errors } result
    // so the form UI does not need to change.
    var opener = typeof open === "function" ? open : openMailto;
    opener(href);
    return { ok: true, href: href };
  }

  return {
    TO: TO,
    BODY_MAX: BODY_MAX,
    KINDS: KINDS,
    validateContact: validateContact,
    subjectLine: subjectLine,
    bodyText: bodyText,
    mailtoHref: mailtoHref,
    sendContact: sendContact
  };
});
