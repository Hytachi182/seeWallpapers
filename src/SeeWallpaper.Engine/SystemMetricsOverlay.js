(() => {
  // Isolate the common widget from each scene's CSS and bridge callbacks.
  let settings = {}, metrics = {}, host, root;
  const history = { cpu: [], ram: [] };
  const labels = {
    en: ['CPU', 'RAM', 'Uptime', 'Power', 'Computer', 'Battery', 'AC power', 'System metrics'],
    fr: ['CPU', 'RAM', 'Durée de fonctionnement', 'Alimentation', 'Ordinateur', 'Batterie', 'Secteur', 'Métriques système'],
    de: ['CPU', 'RAM', 'Betriebszeit', 'Stromversorgung', 'Computer', 'Akku', 'Netzbetrieb', 'Systemmetriken'],
    es: ['CPU', 'RAM', 'Tiempo encendido', 'Alimentación', 'Equipo', 'Batería', 'Corriente', 'Métricas del sistema'],
    lb: ['CPU', 'RAM', 'Lafzäit', 'Stroumversuergung', 'Computer', 'Batterie', 'Netzstroum', 'Systemmetriken'],
    ro: ['CPU', 'RAM', 'Timp de funcționare', 'Alimentare', 'Calculator', 'Baterie', 'Rețea electrică', 'Metrici de sistem'],
    pl: ['CPU', 'RAM', 'Czas pracy', 'Zasilanie', 'Komputer', 'Bateria', 'Zasilanie sieciowe', 'Metryki systemowe'],
    it: ['CPU', 'RAM', 'Tempo di attività', 'Alimentazione', 'Computer', 'Batteria', 'Rete elettrica', 'Metriche di sistema']
  };
  const number = (key, fallback, min, max) => {
    const value = Number(settings['__seeMetrics' + key] ?? fallback);
    return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  };
  const selected = (key, fallback = true) => (settings['__seeMetrics' + key] ?? fallback) === true;
  const percent = value => value != null && Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Number(value))) : null;
  function mount() {
    if (host || !document.body) return;
    host = document.createElement('div');
    host.id = 'seeWallpaper-system-metrics';
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
    root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>
      :host{all:initial;font-family:"Segoe UI",sans-serif;color:#f5f7fb}
      *{box-sizing:border-box}section{position:absolute;width:min(var(--width),calc(100vw - 2 * var(--gap)));max-height:calc(100vh - 2 * var(--gap));overflow:hidden;padding:16px 18px;border-radius:12px;background:rgba(16,18,26,var(--background));font-size:var(--font);color:#f5f7fb;box-shadow:0 6px 20px #0003}
      h2{font:600 0.9em "Segoe UI",sans-serif;margin:0 0 12px;color:var(--accent)}
      .row{margin-top:10px}.line{display:flex;justify-content:space-between;align-items:baseline;gap:18px}
      .label{font-size:0.85em;color:#cbd3e2}.value{font-variant-numeric:tabular-nums;font-weight:600;text-align:right;overflow-wrap:anywhere;min-width:0}
      .bar{height:5px;background:#ffffff20;margin-top:7px;border-radius:3px;overflow:hidden}.fill{height:100%;background:var(--accent)}
      svg{display:block;width:100%;height:32px;margin-top:6px}polyline{fill:none;stroke:var(--accent);stroke-width:2;stroke-linejoin:round}
      .empty{margin:0;color:#cbd3e2;font-size:0.9em}
    </style><section role="region"><h2></h2><div id="rows"></div></section>`;
    document.body.append(host);
    render();
  }
  function render() {
    if (!host) return;
    host.hidden = !selected('Enabled', false);
    host.style.display = host.hidden ? 'none' : 'block';
    if (host.hidden) return;
    const text = labels[settings.__seeMetricsLanguage] || labels.en;
    const panel = root.querySelector('section');
    const scale = number('Size', 100, 70, 160) / 100;
    const color = /^#[\da-f]{6}$/i.test(settings.__seeMetricsColor || '') ? settings.__seeMetricsColor : '#58d5ff';
    panel.style.cssText = `--width:${280 * scale}px;--font:${14 * scale}px;--gap:${number('Margin', 24, 8, 120)}px;--background:${number('Opacity', 85, 0, 100) / 100};--accent:${color};`;
    const position = settings.__seeMetricsPosition || 'bottom-right';
    panel.style.top = position.startsWith('top') ? 'var(--gap)' : '';
    panel.style.bottom = position.startsWith('top') ? '' : 'var(--gap)';
    panel.style.left = position.endsWith('left') ? 'var(--gap)' : '';
    panel.style.right = position.endsWith('left') ? '' : 'var(--gap)';
    panel.setAttribute('aria-label', text[7]);
    root.querySelector('h2').textContent = text[7];
    const rows = root.querySelector('#rows');
    rows.replaceChildren();
    const uptime = typeof metrics.uptime === 'string' ? metrics.uptime.replace(/\.\d{7}$/, '') : '—';
    const values = [
      ['Cpu', text[0], percent(metrics.cpuUsage), 'cpu'],
      ['Ram', text[1], percent(metrics.memoryUsage), 'ram'],
      ['Uptime', text[2], uptime],
      ['Power', text[3], metrics.isOnBattery == null ? '—' : metrics.isOnBattery ? text[5] : text[6]],
      ['Hostname', text[4], metrics.hostname || '—']
    ];
    for (const [key, label, value, series] of values) {
      if (!selected(key, key === 'Cpu' || key === 'Ram')) continue;
      const row = document.createElement('div'); row.className = 'row';
      const line = document.createElement('div'); line.className = 'line';
      const title = document.createElement('span'); title.className = 'label'; title.textContent = label;
      const reading = document.createElement('span'); reading.className = 'value';
      reading.textContent = series ? value == null ? '—' : value.toFixed(1) + '%' : value;
      line.append(title, reading); row.append(line);
      if (series && settings.__seeMetricsStyle === 'bars') {
        const track = document.createElement('div'); track.className = 'bar';
        const fill = document.createElement('div'); fill.className = 'fill'; fill.style.width = (value ?? 0) + '%';
        track.append(fill); row.append(track);
      }
      if (series && settings.__seeMetricsStyle === 'graphs') {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 240 32'); svg.setAttribute('aria-hidden', 'true');
        // Break the line at unavailable samples rather than inventing zero readings.
        let segment = [];
        const flush = () => {
          if (segment.length > 1) {
            const path = document.createElementNS(svg.namespaceURI, 'polyline');
            path.setAttribute('points', segment.join(' ')); svg.append(path);
          }
          segment = [];
        };
        history[series].forEach((sample, index) => {
          if (sample == null) flush(); else segment.push(`${index * 240 / 29},${31 - sample * 0.3}`);
        });
        flush(); row.append(svg);
      }
      rows.append(row);
    }
    if (!rows.childElementCount) {
      const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = '—'; rows.append(empty);
    }
  }
  window.__seeWallpaperMetricsOverlay = {
    settings(value) {
      const wasEnabled = selected('Enabled', false);
      settings = value || {};
      if (wasEnabled !== selected('Enabled', false)) {
        history.cpu.length = 0; history.ram.length = 0;
      }
      mount(); render();
    },
    metrics(value) {
      metrics = value || {};
      for (const [key, value] of [['cpu', metrics.cpuUsage], ['ram', metrics.memoryUsage]]) {
        history[key].push(percent(value)); if (history[key].length > 30) history[key].shift();
      }
      render();
    }
  };
  document.addEventListener('DOMContentLoaded', mount, { once: true });
})();
