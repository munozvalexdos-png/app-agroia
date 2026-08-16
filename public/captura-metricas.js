/**
 * Unidades flexibles de área y producción en el formulario de captura.
 * Conserva hectareas y rendimientoEstimadoTonHa en los registros existentes.
 */
(function () {
  const AREA_UNITS = [
    'Hectáreas (Ha)',
    'Metros cuadrados (m²)',
    'Estanques / Espejos de agua',
    'Metros cúbicos (m³)',
    'Colmenas / Cajas',
    'Litros / Capacidad de tanque',
  ];

  const PROD_UNITS = [
    'Ton/Ha (Agrícola)',
    'Kg/ha o Cargas/Ha',
    'Número de Cabezas / Animales (Ganado bovino, porcino, ovino, caprino, equino/mular)',
    'Cantidad de Peces / Alevines (Piscicultura)',
    'Aves / Pollos / Gallinas (Avicultura)',
    'Litros/Día o Litros/Lote (Lácteos/Miel)',
  ];

  const state = {
    area: 'Hectáreas (Ha)',
    produccion: 'Ton/Ha (Agrícola)',
  };

  function suggestFromEtapa(etapa) {
    const value = String(etapa || '');
    if (value.includes('Piscicultura')) {
      return {
        area: 'Estanques / Espejos de agua',
        produccion: 'Cantidad de Peces / Alevines (Piscicultura)',
      };
    }
    if (value.includes('Avicultura')) {
      return {
        area: 'Metros cuadrados (m²)',
        produccion: 'Aves / Pollos / Gallinas (Avicultura)',
      };
    }
    if (value.includes('Apicultura')) {
      return {
        area: 'Colmenas / Cajas',
        produccion: 'Litros/Día o Litros/Lote (Lácteos/Miel)',
      };
    }
    if (value.includes('Láctea')) {
      return {
        area: 'Hectáreas (Ha)',
        produccion: 'Litros/Día o Litros/Lote (Lácteos/Miel)',
      };
    }
    if (
      value.includes('Ganadería') ||
      value.includes('Porcina') ||
      value.includes('Ovino') ||
      value.includes('Equinos')
    ) {
      return {
        area: 'Hectáreas (Ha)',
        produccion:
          'Número de Cabezas / Animales (Ganado bovino, porcino, ovino, caprino, equino/mular)',
      };
    }
    return {
      area: 'Hectáreas (Ha)',
      produccion: 'Ton/Ha (Agrícola)',
    };
  }

  function makeSelect(kind, options, current) {
    const select = document.createElement('select');
    select.setAttribute('data-agro-unidad', kind);
    select.className =
      'w-full mt-1 bg-slate-900 text-white rounded-xl px-2 py-1.5 border border-slate-700 focus:border-emerald-500 text-[10px]';
    for (const option of options) {
      const el = document.createElement('option');
      el.value = option;
      el.textContent = option;
      if (option === current) el.selected = true;
      select.appendChild(el);
    }
    select.addEventListener('change', () => {
      if (kind === 'area') state.area = select.value;
      else state.produccion = select.value;
      const input = select.parentElement && select.parentElement.querySelector('input[type="number"]');
      if (input) input.setAttribute('placeholder', select.value);
    });
    return select;
  }

  function enhanceLabel(label, kind, title, options, current) {
    if (label.textContent !== title) label.textContent = title;
    const wrap = label.parentElement;
    if (!wrap) return;
    const input = wrap.querySelector('input[type="number"]');
    if (input) {
      input.setAttribute('placeholder', current);
      input.setAttribute('min', '0');
    }
    if (!wrap.querySelector('[data-agro-unidad="' + kind + '"]')) {
      wrap.appendChild(makeSelect(kind, options, current));
    }
  }

  function isEtapaSelect(select) {
    return Array.from(select.options).some(function (option) {
      return (
        option.value.indexOf('Germinación') !== -1 ||
        option.value.indexOf('Ganadería Bovina Láctea') !== -1
      );
    });
  }

  function hookEtapaSelects(root) {
    const selects = root.querySelectorAll('select');
    for (const select of selects) {
      if (!isEtapaSelect(select) || select.dataset.agroEtapaHook === '1') continue;
      select.dataset.agroEtapaHook = '1';
      select.addEventListener('change', function () {
        const suggested = suggestFromEtapa(select.value);
        state.area = suggested.area;
        state.produccion = suggested.produccion;
        const areaSel = document.querySelector('[data-agro-unidad="area"]');
        const prodSel = document.querySelector('[data-agro-unidad="prod"]');
        if (areaSel) areaSel.value = suggested.area;
        if (prodSel) prodSel.value = suggested.produccion;
        const areaInput = areaSel && areaSel.parentElement && areaSel.parentElement.querySelector('input[type="number"]');
        const prodInput = prodSel && prodSel.parentElement && prodSel.parentElement.querySelector('input[type="number"]');
        if (areaInput) areaInput.setAttribute('placeholder', suggested.area);
        if (prodInput) prodInput.setAttribute('placeholder', suggested.produccion);
      });
    }
  }

  let patching = false;
  function enhanceForm(root) {
    if (patching || !root || !root.querySelectorAll) return;
    patching = true;
    try {
      const labels = root.querySelectorAll('label');
      for (const label of labels) {
        const text = (label.textContent || '').trim();
        if (text === 'Hectáreas (Ha)' || text === 'Área / Capacidad Productiva') {
          enhanceLabel(label, 'area', 'Área / Capacidad Productiva', AREA_UNITS, state.area);
        }
        if (text === 'Est. Rendimiento (Ton/Ha)' || text === 'Estimado Producción / Población') {
          enhanceLabel(
            label,
            'prod',
            'Estimado Producción / Población',
            PROD_UNITS,
            state.produccion,
          );
        }
      }
      const captions = root.querySelectorAll('span');
      for (const caption of captions) {
        const text = (caption.textContent || '').trim();
        if (text === 'Área Sembrada') caption.textContent = 'Área / Capacidad Productiva';
        if (text === 'Rendimiento Est.') caption.textContent = 'Estimado Producción / Población';
      }
      hookEtapaSelects(root);
    } finally {
      patching = false;
    }
  }

  function decorateRecord(value) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(decorateRecord);
      return;
    }
    if (Object.prototype.hasOwnProperty.call(value, 'hectareas') && value.unidadArea == null) {
      value.unidadArea = state.area;
    }
    if (
      Object.prototype.hasOwnProperty.call(value, 'rendimientoEstimadoTonHa') &&
      value.unidadProduccion == null
    ) {
      value.unidadProduccion = state.produccion;
    }
    if (value.lote) decorateRecord(value.lote);
    if (value.datosCampo) decorateRecord(value.datosCampo);
  }

  const origStringify = JSON.stringify;
  JSON.stringify = function (value, replacer, space) {
    try {
      decorateRecord(value);
    } catch (err) {
      /* ignore */
    }
    return origStringify.call(this, value, replacer, space);
  };

  if (typeof window.fetch === 'function') {
    const origFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      if (init && typeof init.body === 'string') {
        try {
          const parsed = JSON.parse(init.body);
          decorateRecord(parsed);
          init = Object.assign({}, init, { body: origStringify(parsed) });
        } catch (err) {
          /* ignore */
        }
      }
      return origFetch(input, init);
    };
  }

  function start() {
    enhanceForm(document.body);
    let scheduled = false;
    const observer = new MutationObserver(function () {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(function () {
        scheduled = false;
        enhanceForm(document.body);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
