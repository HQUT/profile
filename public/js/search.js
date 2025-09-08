(function () {
  function isValidUrl(url) {
    try {
      var u = new URL(url, document.baseURI);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch (e) { return false; }
  }
  function norm(s) { return (s || "").toString().toLowerCase(); }

  function buildDomIndex() {
    var items = [];
    function pushIf(id, title) {
      var el = document.getElementById(id);
      if (!el) return;
      items.push({ title: title, url: new URL("#" + id, document.baseURI).href, content: el.textContent || "" });
    }
    pushIf("about",      "About Me");
    pushIf("experience", "Experience");
    pushIf("education",  "Education");
    pushIf("projects",   "Projects");
    pushIf("skills",     "Skills");
    pushIf("contact",    "Contact");

    var s = document.getElementById("skills");
    if (s) {
      var bad = s.querySelectorAll(".badge, .level-badge");
      if (bad.length) {
        var txt = Array.prototype.map.call(bad, function (b) { return b.textContent; }).join(" ");
        items.push({ title: "Skills (badges)", url: new URL("#skills", document.baseURI).href, content: txt });
      }
    }
    var p = document.getElementById("projects");
    if (p) {
      var pbad = p.querySelectorAll(".badge");
      if (pbad.length) {
        var ptxt = Array.prototype.map.call(pbad, function (b) { return b.textContent; }).join(" ");
        items.push({ title: "Projects (badges)", url: new URL("#projects", document.baseURI).href, content: ptxt });
      }
    }
    return items;
  }

  function fetchHugoIndex() {
    return new Promise(function (resolve) {
      var url = new URL("index.json", document.baseURI).href;
      fetch(url, { cache: "no-store" })
        .then(function (r) { if (!r.ok) throw new Error("no index"); return r.json(); })
        .then(function (raw) {
          var arr = Array.isArray(raw) ? raw : (raw.pages || raw.items || raw.results || raw.data || []);
          var out = [];
          for (var i = 0; i < arr.length; i++) {
            var it = arr[i];
            if (!it || typeof it !== "object") continue;
            var title = it.title || it.Title || "";
            var desc  = it.description || it.Description || it.summary || it.Summary || "";
            var body  = it.content || it.plain || it.Plain || "";
            var link  = it.permalink || it.Permalink || it.relpermalink || it.RelPermalink || "";
            try { link = link ? new URL(link, document.baseURI).href : ""; } catch(e){ link = ""; }
            if (!link) continue;
            out.push({ title: title, url: link, content: (desc + " " + body) });
          }
          resolve(out);
        })
        .catch(function () { resolve([]); });
    });
  }

  function positionPanel() {
    var panel = document.getElementById("search-content");
    var inputs = document.querySelectorAll("#search");
    if (!panel || inputs.length === 0) return;

    var inputEl = (window.innerWidth > 768 && inputs[0]) ? inputs[0] : (inputs[1] || inputs[0]);
    panel.style.width = window.innerWidth > 768 ? "500px" : "300px";
    var rect = inputEl.getBoundingClientRect();
    panel.style.position = "absolute";
    panel.style.top  = (rect.top + window.scrollY + rect.height + 8) + "px";
    panel.style.left = (rect.left + window.scrollX) + "px";
  }

  function renderResults(results, q) {
    var panel = document.getElementById("search-content");
    var list  = document.getElementById("search-results");
    if (!panel || !list) return;

    list.innerHTML = "";
    if (!results.length) {
      var p = document.createElement("p");
      p.className = "text-center py-3";
      p.textContent = 'No results found for "' + q + '"';
      list.appendChild(p);
    } else {
      for (var i = 0; i < Math.min(results.length, 12); i++) {
        var r = results[i];
        if (!r.url || !isValidUrl(r.url)) continue;

        var card = document.createElement("div");
        card.className = "card";

        var a = document.createElement("a");
        a.href = r.url;

        var inner = document.createElement("div");
        inner.className = "p-3";

        var h5 = document.createElement("h5");
        h5.textContent = r.title || "Untitled";

        var desc = document.createElement("div");
        var txt  = r.content || "";
        var nq   = norm(q);
        var ntxt = norm(txt);
        var idx  = ntxt.indexOf(nq);
        var snip = txt;
        if (idx >= 0) {
          var start = Math.max(0, idx - 40);
          var end   = Math.min(txt.length, idx + q.length + 40);
          snip = (start > 0 ? "…" : "") + txt.slice(start, end) + (end < txt.length ? "…" : "");
        } else {
          snip = txt.slice(0, 100) + (txt.length > 100 ? "…" : "");
        }
        desc.textContent = snip;

        inner.appendChild(h5);
        inner.appendChild(desc);
        a.appendChild(inner);
        card.appendChild(a);
        list.appendChild(card);
      }
    }
    positionPanel();
    panel.style.display = "block";
  }

  var debounce;
  window.searchOnChange = function (evt) {
    clearTimeout(debounce);
    debounce = setTimeout(function () {
      var q = (evt && evt.target && evt.target.value ? evt.target.value : "").trim();
      var panel = document.getElementById("search-content");
      var list  = document.getElementById("search-results");
      if (!q) {
        if (panel) panel.style.display = "none";
        if (list) list.innerHTML = "";
        return;
      }

      positionPanel();

      var domIndex = buildDomIndex();
      fetchHugoIndex().then(function (hugoIndex) {
        var all = domIndex.concat(hugoIndex);
        var nq = norm(q);
        var results = [];
        for (var i = 0; i < all.length; i++) {
          var it = all[i];
          var hay = norm(it.title + " " + (it.content || ""));
          if (hay.indexOf(nq) !== -1) {
            results.push({ title: it.title, url: it.url, content: it.content || "" });
          }
        }
        renderResults(results, q);
      });
    }, 250);
  };

  // Stäng panelen med ESC / klick utanför
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      var p = document.getElementById("search-content");
      var r = document.getElementById("search-results");
      if (p) p.style.display = "none";
      if (r) r.innerHTML = "";
    }
  });
  document.addEventListener("click", function (e) {
    var panel = document.getElementById("search-content");
    if (!panel) return;
    var inputs = document.querySelectorAll("#search");
    var inside = panel.contains(e.target);
    if (!inside) {
      for (var i = 0; i < inputs.length; i++) {
        if (inputs[i] && inputs[i].contains(e.target)) { inside = true; break; }
      }
    }
    if (!inside) {
      panel.style.display = "none";
      var r = document.getElementById("search-results");
      if (r) r.innerHTML = "";
    }
  });
})();
