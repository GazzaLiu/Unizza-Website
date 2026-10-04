// Contact form: Turnstile (explicit render) + POST /api/contact.
(function () {
  // Turnstile site keys are public. The test key always passes and only works on localhost.
  var PROD_SITEKEY = "0x4AAAAAAFI0KOjfaHpUPx_S";
  var TEST_SITEKEY = "1x00000000000000000000AA";
  var isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var SITEKEY = isLocal ? TEST_SITEKEY : PROD_SITEKEY;
  var LOAD_TIMEOUT_MS = 10000;

  var form = document.getElementById("email-form");
  if (!form) return;
  var wrapper = form.parentNode;
  var button = form.querySelector('input[type="submit"]');
  var status = document.getElementById("form-status");
  var done = wrapper.querySelector(".w-form-done");
  var fail = wrapper.querySelector(".w-form-fail");
  var idleLabel = button.value;
  var token = null;
  var widgetId = null;

  // Messages come from data-msg-* attributes on the form, so each language page supplies its own.
  function msg(name, fallback) {
    return form.dataset["msg" + name.charAt(0).toUpperCase() + name.slice(1)] || fallback;
  }

  function setStatus(text) {
    status.textContent = text || "";
    status.hidden = !text;
  }

  function clearFieldErrors() {
    form.querySelectorAll(".field-error").forEach(function (el) { el.hidden = true; });
  }

  function showFieldError(field) {
    var el = form.querySelector('.field-error[data-for="' + field + '"]');
    if (el) el.hidden = false;
  }

  function showFail() {
    fail.style.display = "block";
  }

  // Only a fresh Turnstile token enables the button.
  function onToken(t) {
    token = t;
    button.disabled = false;
  }

  function dropToken() {
    token = null;
    button.disabled = true;
  }

  window.unizzaTurnstileReady = function () {
    widgetId = window.turnstile.render("#turnstile", {
      sitekey: SITEKEY,
      language: /^zh/i.test(document.documentElement.lang) ? "zh-tw" : "en",
      callback: onToken,
      "expired-callback": dropToken,
      "error-callback": function () {
        dropToken();
        showFail();
      },
    });
  };

  // api.js blocked (ad blocker, network): fall back to the mailto link.
  setTimeout(function () {
    if (!window.turnstile) showFail();
  }, LOAD_TIMEOUT_MS);

  function localField(name) {
    var el = form.elements[name];
    var value = el.value.trim();
    if (!value || value.length > Number(el.getAttribute("maxlength"))) return false;
    if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;
    return true;
  }

  // Capture phase so Webflow's own form handler never sees the submit.
  form.addEventListener(
    "submit",
    function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      clearFieldErrors();
      setStatus("");

      var invalid = ["name", "email", "message"].filter(function (f) { return !localField(f); });
      if (invalid.length) {
        invalid.forEach(showFieldError);
        return;
      }
      if (!token) {
        setStatus(msg("verifyWait", "Please wait for the verification to finish."));
        return;
      }

      var payload = {
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        message: form.elements.message.value.trim(),
        turnstileToken: token,
      };
      button.disabled = true;
      button.value = button.getAttribute("data-wait") || idleLabel;

      fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          if (res.ok) {
            form.style.display = "none";
            done.style.display = "block";
            return;
          }
          return res.json().catch(function () { return {}; }).then(function (body) {
            if (res.status === 400) {
              if (body.field) showFieldError(body.field);
              else setStatus(msg("check", "Please check the form and try again."));
            } else if (res.status === 403) {
              setStatus(msg("verifyFailed", "Verification failed. Please try again."));
            } else {
              showFail();
            }
            resetTurnstile();
          });
        })
        .catch(function () {
          showFail();
          resetTurnstile();
        })
        .finally(function () {
          button.value = idleLabel;
        });
    },
    true
  );

  // Tokens are single-use: after any failure, wait for a new one.
  function resetTurnstile() {
    dropToken();
    if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
  }
})();
