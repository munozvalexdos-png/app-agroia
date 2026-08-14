/**
 * Respuestas de respaldo cuando Gemini no está disponible (señal de campo).
 */

export function queryAgronomicKnowledgeBase(prompt: string): string {
  const query = prompt.toLowerCase();

  if (
    query.includes('roya') ||
    query.includes('broca') ||
    query.includes('café') ||
    query.includes('cafe') ||
    query.includes('cafetal')
  ) {
    return `☕ **Plan de manejo fitosanitario para café en el Tolima (Planadas, Líbano, Fresno, Chaparral)**

1. **Control de Roya (*Hemileia vastatrix*)**
   - Fungicidas de foco (triazoles) previo a floraciones de marzo y septiembre.
   - Variedades **Castillo Tolima** y **Cenicafé 1**.
   - Nutrición foliar con cobre y boro.

2. **Manejo integrado de Broca (*Hypothenemus hampei*)**
   - Control cultural **Re-Re** cada 15 días.
   - *Beauveria bassiana* en focos mayores al 2 %.
   - Trampas etanólicas por lote.

📍 Comuníquese con la UMATA de su municipio para insumos biológicos.`;
  }

  if (
    query.includes('aguacate') ||
    query.includes('hass') ||
    query.includes('cajamarca') ||
    query.includes('ica')
  ) {
    return `🥑 **Requisitos ICA para predio exportador de Aguacate Hass (Cajamarca, Herveo, Fresno)**

1. **Documentación**
   - Libertad y tradición (máx. 30 días) o contrato de arrendamiento.
   - Cédula del propietario.
   - Coordenadas GPS del lote.

2. **Infraestructura e inocuidad**
   - Zona de acopio, bodega de insumos con llave, trampa de vertimientos y lavamanos.

3. **Plagas cuarentenarias**
   - Barrenador de la semilla (*Heilipus lauri*, *H. trifasciatus*).
   - Polilla (*Stenoma catenifer*).

📜 Radique en ICA Ibagué o Cajamarca.`;
  }

  if (
    query.includes('arroz') ||
    query.includes('espinal') ||
    query.includes('saldaña') ||
    query.includes('saldana') ||
    query.includes('agua')
  ) {
    return `🌾 **Manejo de arroz en El Espinal y Saldaña**

1. **Agua y suelo**
   - Lámina 3–5 cm y secas intermitentes para fortalecer raíces y prevenir *Pyricularia*.

2. **Fertilización fraccionada (por ha)**
   - Presiembra: silicio y materia orgánica.
   - 12–15 ddt: N + P (enraizamiento).
   - 25–30 ddt: N + K (macollamiento).
   - Embuche: K + Zn (llenado de grano).

💧 Consulte adecuación de distritos Usocoello y Usosaldaña.`;
  }

  if (
    query.includes('ficat') ||
    query.includes('fondo') ||
    query.includes('subsidio') ||
    query.includes('crédito') ||
    query.includes('credito') ||
    query.includes('umata')
  ) {
    return `📜 **Fondo FICAT — Gobernación del Tolima**

El **FICAT** otorga incentivo a la tasa y capital semilla para pequeños y medianos productores.

**Líneas**
1. Maquinaria y motocultores (hasta 30 % del equipo).
2. Transformación agroindustrial (beneficio de café, cacao, cuartos fríos).
3. Siembra y renovación de perennes, con gracia de 2 años.

**Requisitos**
- Registro en censo / SIG Tolima.
- Certificado de pequeño o mediano productor (UMATA).
- Predio georreferenciado.`;
  }

  if (
    query.includes('cacao') ||
    query.includes('ataco') ||
    query.includes('fermentación') ||
    query.includes('fermentacion') ||
    query.includes('secado')
  ) {
    return `🍫 **Fermentación y secado de cacao (Ataco y Chaparral)**

1. **Fermentación en cajones**
   - Madera dulce sin olores fuertes.
   - Volteo a las 48 h y luego cada 24 h, 5–6 días.
   - Temperatura interna 45–48 °C.

2. **Secado solar**
   - Primeros 2 días: capa de 5 cm, lento.
   - Días 3–6: remover 4–6 veces al día hasta 6.5–7.0 % de humedad.`;
  }

  const excerpt = prompt.slice(0, 80);
  return `🌱 **Asesoría técnica agropecuaria del Tolima**

Entendido su requerimiento sobre: *"${excerpt}"*.

1. Realice un muestreo representativo en el lote.
2. Para visita de agrónomo, radique en la **UMATA** o Secretaría de Agricultura municipal.
3. Mantenga el predio georreferenciado para acceder a incentivos departamentales.

¿Desea consultar otro cultivo, norma del ICA o fondo FICAT?`;
}
