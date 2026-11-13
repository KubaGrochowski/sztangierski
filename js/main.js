// Sztangierski – skrypty strony
(() => {
  const root = document.documentElement;
  const reducedMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reduced = () => reducedMQ.matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- Motyw jasny / ciemny ---------- */
  const themeBtn = document.querySelector(".theme-toggle");
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  const syncThemeUI = () => {
    const dark = root.getAttribute("data-theme") === "dark";
    if (themeBtn) {
      themeBtn.setAttribute("aria-pressed", String(dark));
      themeBtn.setAttribute("aria-label", dark ? "Włącz jasny motyw" : "Włącz ciemny motyw");
    }
    if (metaTheme) metaTheme.setAttribute("content", "#1533a0"); // niebieski nagłówek w obu motywach
  };
  const applyTheme = (t) => {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("theme", t); } catch (e) { /* tryb prywatny */ }
    syncThemeUI();
  };
  syncThemeUI();

  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      if (reduced()) return applyTheme(next);

      // Okrąg rozlewający się od przycisku (View Transitions API)
      if (document.startViewTransition) {
        const r = themeBtn.getBoundingClientRect();
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        root.classList.add("theme-switching");
        const vt = document.startViewTransition(() => applyTheme(next));
        vt.ready.then(() => {
          root.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
            { duration: 650, easing: "cubic-bezier(.16, 1, .3, 1)", pseudoElement: "::view-transition-new(root)" }
          );
        }).catch(() => {});
        vt.finished.catch(() => {}).finally(() => root.classList.remove("theme-switching"));
      } else {
        root.classList.add("theme-fade");
        applyTheme(next);
        setTimeout(() => root.classList.remove("theme-fade"), 450);
      }
    });
  }

  /* ---------- Menu mobilne ---------- */
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("nav");
  if (toggle && nav) {
    const setOpen = (open) => {
      nav.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Zamknij menu" : "Otwórz menu");
    };
    toggle.addEventListener("click", () => setOpen(!nav.classList.contains("open")));
    document.addEventListener("keydown", (e) => e.key === "Escape" && setOpen(false));
    nav.addEventListener("click", (e) => e.target.closest("a") && setOpen(false));
  }

  /* ---------- Nagłówki dzielone na słowa ---------- */
  document.querySelectorAll("[data-split]").forEach((h) => {
    if (reduced()) return;
    h.setAttribute("aria-label", h.textContent.replace(/\s+/g, " ").trim());
    let w = 0;
    const wrap = (node) => {
      const outer = document.createElement("span");
      outer.className = "split-word";
      outer.setAttribute("aria-hidden", "true");
      const inner = document.createElement("span");
      inner.style.setProperty("--w", w++);
      inner.appendChild(node);
      outer.appendChild(inner);
      return outer;
    };
    const frag = document.createDocumentFragment();
    [...h.childNodes].forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.split(/( +)/).forEach((part) => {
          if (!part) return;
          if (/^ +$/.test(part)) frag.appendChild(document.createTextNode(" "));
          else frag.appendChild(wrap(document.createTextNode(part)));
        });
      } else {
        frag.appendChild(wrap(node));
      }
    });
    h.replaceChildren(frag);
  });

  /* ---------- Odsłanianie przy przewijaniu ---------- */
  document.querySelectorAll("[data-reveal-group]").forEach((group) => {
    group.querySelectorAll("[data-reveal]").forEach((el, i) => el.style.setProperty("--i", i));
  });

  // Liczniki w kafelkach z liczbami
  const countUp = (el) => {
    if (el.dataset.counted) return;
    el.dataset.counted = "1";
    const m = el.textContent.match(/(\d+(?:,\d+)?)/);
    if (!m || reduced()) return;
    const [pre, post] = [el.textContent.slice(0, m.index), el.textContent.slice(m.index + m[0].length)];
    const decimals = m[0].includes(",") ? m[0].split(",")[1].length : 0;
    const target = parseFloat(m[0].replace(",", "."));
    const t0 = performance.now();
    const dur = 1400;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = pre + (target * eased).toFixed(decimals).replace(".", ",") + post;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const items = document.querySelectorAll("[data-reveal]");
  const onVisible = (el) => {
    el.classList.add("visible");
    el.querySelectorAll(".fact strong").forEach(countUp);
    if (el.matches(".fact")) countUp(el.querySelector("strong"));
  };
  if (reduced() || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("visible"));
  } else {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => {
        if (en.isIntersecting) { onVisible(en.target); io.unobserve(en.target); }
      }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    items.forEach((el) => io.observe(el));
  }

  /* ---------- Przewijanie: nagłówek, postęp, „do góry” ---------- */
  const header = document.querySelector(".header");
  const toTop = document.querySelector(".to-top");
  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, y / max) : 0;
    if (header) {
      header.classList.toggle("scrolled", y > 8);
      header.style.setProperty("--progress", p.toFixed(4));
    }
    if (toTop) {
      toTop.style.setProperty("--progress", p.toFixed(4));
      toTop.classList.toggle("show", y > 600);
    }
    ticking = false;
  };
  onScroll();
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  if (toTop) toTop.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" });
  });

  /* ---------- Galeria: podgląd pełnoekranowy ---------- */
  const lb = document.querySelector(".lightbox");
  const thumbs = [...document.querySelectorAll(".g-item")];
  if (lb && thumbs.length && typeof lb.showModal === "function") {
    const img = lb.querySelector(".lb-img");
    const txt = lb.querySelector(".lb-text");
    const cnt = lb.querySelector(".lb-count");
    let idx = 0;
    let opener = null;

    const preload = (i) => { const im = new Image(); im.src = thumbs[(i + thumbs.length) % thumbs.length].dataset.full; };
    const render = (i) => {
      idx = (i + thumbs.length) % thumbs.length;
      const t = thumbs[idx];
      img.src = t.dataset.full;
      img.alt = t.dataset.caption;
      txt.textContent = t.dataset.caption;
      cnt.textContent = `${idx + 1} / ${thumbs.length}`;
      preload(idx + 1); preload(idx - 1);
    };
    const go = (dir) => {
      if (reduced()) return render(idx + dir);
      img.classList.add(dir > 0 ? "leave-left" : "leave-right");
      setTimeout(() => {
        render(idx + dir);
        img.classList.remove("leave-left", "leave-right");
        img.style.transition = "none";
        img.style.transform = `translateX(${dir > 0 ? 40 : -40}px)`;
        img.style.opacity = "0";
        requestAnimationFrame(() => requestAnimationFrame(() => {
          img.style.transition = ""; img.style.transform = ""; img.style.opacity = "";
        }));
      }, 200);
    };
    const close = () => {
      if (!lb.open || lb.classList.contains("closing")) return;
      if (reduced()) { lb.close(); return; }
      lb.classList.add("closing");
      setTimeout(() => { lb.classList.remove("closing"); lb.close(); }, 200);
    };

    thumbs.forEach((t, i) => t.addEventListener("click", () => {
      opener = t;
      render(i);
      lb.showModal();
      document.body.style.overflow = "hidden";
    }));
    lb.addEventListener("close", () => { document.body.style.overflow = ""; opener && opener.focus(); });
    lb.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
    lb.querySelector(".lb-close").addEventListener("click", close);
    lb.querySelector(".lb-prev").addEventListener("click", () => go(-1));
    lb.querySelector(".lb-next").addEventListener("click", () => go(1));
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
    lb.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    });
    // Przesuwanie palcem
    let x0 = null;
    img.addEventListener("pointerdown", (e) => { x0 = e.clientX; });
    img.addEventListener("pointerup", (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    });
  }

  /* ---------- Status otwarcia (Pn–Pt 8:00–17:00, czas polski, bez świąt) ---------- */
  const now = new Date();
  // Aktualna data i godzina w Polsce – niezależnie od strefy czasowej urządzenia
  const plParts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(now).map((p) => [p.type, p.value])
  );
  const today = new Date(Date.UTC(+plParts.year, +plParts.month - 1, +plParts.day));
  const mins = +plParts.hour * 60 + +plParts.minute;

  // Dni ustawowo wolne od pracy w Polsce
  const easter = (y) => {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), dayOfMonth = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(y, month - 1, dayOfMonth));
  };
  const key = (d) => d.toISOString().slice(0, 10);
  const holidays = (y) => {
    const e = easter(y);
    const plus = (n) => key(new Date(e.getTime() + n * 864e5));
    const fixed = ["01-01", "01-06", "05-01", "05-03", "08-15", "11-01", "11-11", "12-24", "12-25", "12-26"].map((md) => `${y}-${md}`);
    return new Set([...fixed, plus(0), plus(1), plus(49), plus(60)]); // Wielkanoc, Poniedziałek Wielkanocny, Zielone Świątki, Boże Ciało
  };
  const holidayCache = {};
  const isHoliday = (d) => (holidayCache[d.getUTCFullYear()] ||= holidays(d.getUTCFullYear())).has(key(d));
  const isWorkingDay = (d) => d.getUTCDay() >= 1 && d.getUTCDay() <= 5 && !isHoliday(d);

  const openNow = isWorkingDay(today) && mins >= 8 * 60 && mins < 17 * 60;
  let text;
  if (openNow) {
    text = "Otwarte teraz · do 17:00";
  } else if (isWorkingDay(today) && mins < 8 * 60) {
    text = "Zamknięte · otwieramy dziś o 8:00";
  } else {
    const dayNames = ["w niedzielę", "w poniedziałek", "we wtorek", "w środę", "w czwartek", "w piątek", "w sobotę"];
    let next = new Date(today.getTime() + 864e5), offset = 1;
    while (!isWorkingDay(next) && offset < 14) { next = new Date(next.getTime() + 864e5); offset++; }
    const when = offset === 1 ? "jutro" : dayNames[next.getUTCDay()];
    text = `Zamknięte${isHoliday(today) ? " · dziś święto" : ""} · otwieramy ${when} o 8:00`;
  }
  document.querySelectorAll("[data-status]").forEach((el) => {
    el.classList.add(openNow ? "is-open" : "is-closed");
    el.querySelector("[data-status-text]").textContent = text;
  });
  document.querySelectorAll(`.hours tr[data-day="${today.getUTCDay()}"]`).forEach((tr) => tr.classList.add("today"));

  /* ---------- Rok w stopce ---------- */
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = now.getFullYear()));

  /* ---------- Formularz kontaktowy ---------- */
  const form = document.getElementById("contact-form");
  if (!form) return;

  const rules = {
    name: (v) => v.trim().length >= 2 || "Podaj imię i nazwisko.",
    phone: (v) => /^\+?[\d\s-]{9,}$/.test(v.trim()) || "Podaj numer telefonu, np. 600 000 000.",
    email: (v) => v.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || "Sprawdź adres e-mail.",
    message: (v) => v.trim().length >= 10 || "Opisz problem w kilku słowach (min. 10 znaków).",
    consent: (_, el) => el.checked || "Zaznacz zgodę, abyśmy mogli odpowiedzieć.",
  };

  const check = (el) => {
    const rule = rules[el.name];
    if (!rule) return true;
    const res = rule(el.value, el);
    const field = el.closest(".field");
    const ok = res === true;
    field.classList.toggle("invalid", !ok);
    el.setAttribute("aria-invalid", String(!ok));
    const err = field.querySelector(".error");
    if (err) err.textContent = ok ? "" : res;
    return ok;
  };

  form.querySelectorAll("input, textarea").forEach((el) => {
    el.addEventListener("blur", () => el.value && check(el));
    el.addEventListener("input", () => el.closest(".field").classList.contains("invalid") && check(el));
    el.addEventListener("change", () => el.type === "checkbox" && check(el));
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const invalid = Object.keys(rules).map((n) => form.elements[n]).filter((el) => !check(el));
    if (invalid.length) {
      invalid.forEach((el) => {
        const f = el.closest(".field");
        f.classList.remove("shake");
        void f.offsetWidth; // restart animacji
        f.classList.add("shake");
      });
      invalid[0].focus();
      return;
    }

    // Strona statyczna – wiadomość otwierana w programie pocztowym klienta.
    const d = Object.fromEntries(new FormData(form));
    const body =
      `Imię i nazwisko: ${d.name}\nTelefon: ${d.phone}\nE-mail: ${d.email || "-"}\n` +
      `Samochód: ${d.car || "-"}\nUsługa: ${d.service}\n\n${d.message}`;
    window.location.href =
      `mailto:jark6@op.pl?subject=${encodeURIComponent("Zapytanie ze strony – " + d.service)}&body=${encodeURIComponent(body)}`;

    const status = document.getElementById("form-status");
    status.textContent = "Dziękujemy! Otworzyliśmy program pocztowy z gotową wiadomością – wystarczy ją wysłać.";
    status.classList.add("show");
    form.reset();
  });
})();
