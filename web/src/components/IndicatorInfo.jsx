import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

const INDICATOR_HELP = {
  Capitalización: {
    what: 'El valor de mercado de todas las acciones de la compañía: precio por acción multiplicado por las acciones en circulación.',
    why: 'Sitúa el tamaño de la empresa y ayuda a comparar su escala, liquidez y perfil de riesgo con otras compañías.'
  },
  'PER (ttm)': {
    what: 'Relaciona el precio de la acción con el beneficio por acción de los últimos doce meses.',
    why: 'Muestra cuánto paga el mercado por cada unidad de beneficio actual. Conviene compararlo con el sector y con el crecimiento esperado.'
  },
  'PER estimado': {
    what: 'Relaciona el precio actual con el beneficio por acción que el consenso espera para los próximos doce meses.',
    why: 'Permite ver si la valoración parece más exigente o más barata cuando se incorporan las previsiones futuras.'
  },
  PEG: {
    what: 'Divide el PER entre la tasa esperada de crecimiento del beneficio.',
    why: 'Añade el crecimiento a la lectura del PER. Un valor bajo puede indicar una valoración razonable, aunque depende mucho de la fiabilidad de las previsiones.'
  },
  'Precio / Ventas': {
    what: 'Compara el valor bursátil de la empresa con sus ventas de los últimos doce meses.',
    why: 'Es útil cuando el beneficio es pequeño o negativo, pero no informa por sí solo sobre márgenes, deuda o calidad de esas ventas.'
  },
  'Precio / Valor contable': {
    what: 'Compara la capitalización con el patrimonio neto atribuido a los accionistas.',
    why: 'Ayuda especialmente en negocios intensivos en activos, como bancos o aseguradoras, y señala la prima que se paga sobre el valor contable.'
  },
  EV: {
    what: 'El valor de empresa suma la capitalización y la deuda neta para aproximar el coste económico total del negocio.',
    why: 'Facilita comparaciones entre compañías con estructuras de financiación distintas.'
  },
  'EV / Ventas': {
    what: 'Compara el valor de empresa con los ingresos anuales.',
    why: 'Permite valorar negocios aun cuando no generan beneficio, pero debe interpretarse junto con los márgenes y el potencial de crecimiento.'
  },
  'EV / EBITDA': {
    what: 'Compara el valor de empresa con el beneficio operativo antes de intereses, impuestos, depreciaciones y amortizaciones.',
    why: 'Es un múltiplo muy usado para comparar empresas porque incorpora la deuda y reduce diferencias contables, aunque no sustituye al flujo de caja.'
  },
  'Rent. por dividendo': {
    what: 'Es el dividendo anual por acción dividido entre el precio actual de la acción.',
    why: 'Indica la renta anual que ofrece la inversión, pero una rentabilidad muy alta puede anticipar un recorte del dividendo.'
  },
  'ROE (ttm)': {
    what: 'Mide el beneficio de los últimos doce meses generado por cada unidad de patrimonio neto.',
    why: 'Ayuda a evaluar la rentabilidad del capital aportado por los accionistas; un ROE alto sostenido suele señalar una ventaja económica.'
  },
  ROE: {
    what: 'Mide el beneficio generado por cada unidad de patrimonio neto.',
    why: 'Permite juzgar la eficiencia con la que la empresa remunera el capital de los accionistas, vigilando que no esté inflado por un exceso de deuda.'
  },
  ROA: {
    what: 'Mide el beneficio generado en relación con el total de activos de la empresa.',
    why: 'Indica la eficiencia con la que se utiliza la base de activos y permite comparar compañías de un mismo sector.'
  },
  'Margen bruto (ttm)': {
    what: 'Porcentaje de las ventas que queda después de descontar el coste directo de los productos o servicios durante los últimos doce meses.',
    why: 'Refleja poder de fijación de precios y eficiencia productiva antes de los gastos generales.'
  },
  'Margen operativo': {
    what: 'Porcentaje de las ventas que queda como beneficio después de los costes operativos ordinarios.',
    why: 'Mide la rentabilidad del negocio principal y permite observar si la escala está mejorando o deteriorando la eficiencia.'
  },
  'Margen neto': {
    what: 'Porcentaje de los ingresos que termina convertido en beneficio neto para los accionistas.',
    why: 'Resume la rentabilidad final tras costes, intereses e impuestos y ayuda a evaluar la calidad económica del negocio.'
  },
  'Crec. ingresos (a/a)': {
    what: 'Variación de los ingresos frente al mismo periodo del año anterior.',
    why: 'Muestra si la demanda y la escala del negocio avanzan, evitando parte de la estacionalidad al comparar periodos equivalentes.'
  },
  'Crec. beneficio (a/a)': {
    what: 'Variación del beneficio frente al mismo periodo del año anterior.',
    why: 'Permite comprobar si el crecimiento de ventas se traduce en más ganancias y si existe apalancamiento operativo.'
  },
  'BPA (ttm)': {
    what: 'Beneficio neto atribuible a cada acción durante los últimos doce meses.',
    why: 'Es la base de múltiplos como el PER y muestra cuánto beneficio corresponde a cada título, teniendo en cuenta emisiones o recompras.'
  },
  Ingresos: {
    what: 'Importe total generado por la venta de productos y servicios antes de descontar costes y gastos.',
    why: 'Es el punto de partida del crecimiento empresarial; su evolución muestra demanda, cuota de mercado y capacidad de expansión.'
  },
  EBITDA: {
    what: 'Resultado antes de intereses, impuestos, depreciaciones y amortizaciones.',
    why: 'Aproxima la rentabilidad operativa antes de financiación y cargos contables, aunque no equivale al flujo de caja disponible.'
  },
  'Bº operativo': {
    what: 'Beneficio generado por la actividad ordinaria después de costes directos y gastos operativos.',
    why: 'Muestra la rentabilidad del negocio principal sin mezclar financiación, impuestos o resultados extraordinarios.'
  },
  'Beneficio neto': {
    what: 'Resultado final después de costes operativos, intereses, impuestos y partidas extraordinarias.',
    why: 'Es la ganancia atribuible al periodo y una base esencial para valorar la empresa y su capacidad de remunerar al accionista.'
  },
  Activos: {
    what: 'Recursos económicos controlados por la empresa, como caja, inventarios, inmuebles o derechos de cobro.',
    why: 'Muestran la base utilizada para operar y generar beneficios; su calidad y rentabilidad importan tanto como su tamaño.'
  },
  Patrimonio: {
    what: 'Valor contable que queda para los accionistas después de restar los pasivos a los activos.',
    why: 'Actúa como colchón financiero y permite evaluar solvencia, rentabilidad sobre capital y valoración contable.'
  },
  Caja: {
    what: 'Efectivo y activos muy líquidos disponibles para la empresa.',
    why: 'Aporta flexibilidad para invertir, pagar deuda, recomprar acciones o afrontar periodos adversos.'
  },
  'Deuda neta': {
    what: 'Deuda financiera total menos caja y equivalentes.',
    why: 'Resume el endeudamiento económico real y ayuda a evaluar riesgo financiero y capacidad de pago.'
  },
  'Flujo operativo': {
    what: 'Efectivo generado por la actividad habitual de la empresa antes de inversiones y financiación.',
    why: 'Permite comprobar si los beneficios contables se convierten en caja y si el negocio puede financiarse internamente.'
  },
  Capex: {
    what: 'Inversiones en activos de larga duración necesarias para mantener o ampliar la capacidad del negocio.',
    why: 'Consume caja hoy para sostener operaciones o crecimiento futuro; distingue negocios ligeros de otros intensivos en capital.'
  },
  FCF: {
    what: 'Flujo de caja libre: efectivo operativo que queda después de las inversiones de capital.',
    why: 'Es la caja que puede destinarse a deuda, dividendos, recompras o adquisiciones y una referencia central para valorar empresas.'
  },
  Dividendos: {
    what: 'Efectivo distribuido por la empresa a sus accionistas.',
    why: 'Representa una parte del retorno total y permite evaluar la política de remuneración y el uso del capital.'
  },
  'Dividendo anual estimado': {
    what: 'Importe por acción que se espera repartir en dividendos durante un año.',
    why: 'Ayuda a estimar la renta futura, aunque puede variar si cambian los resultados o la política de distribución.'
  },
  'Rentabilidad estimada': {
    what: 'Dividendo anual esperado dividido entre el precio actual de la acción.',
    why: 'Permite comparar la renta prevista con otras inversiones, vigilando siempre su sostenibilidad.'
  },
  'Pay-out': {
    what: 'Porcentaje del beneficio neto destinado al pago de dividendos.',
    why: 'Indica cuánto margen queda para reinversión y si el dividendo dispone de un colchón razonable ante una caída del beneficio.'
  },
  'Acciones en circulación': {
    what: 'Número de acciones emitidas que permanecen en manos de los inversores.',
    why: 'Determina el reparto del beneficio por acción; emisiones diluyen y recompras aumentan la participación relativa de cada título.'
  },
  '% institucionales': {
    what: 'Proporción de las acciones en manos de fondos, gestoras, aseguradoras y otros inversores profesionales.',
    why: 'Aporta contexto sobre la composición del accionariado, liquidez y posible influencia de grandes tenedores.'
  },
  '% insiders': {
    what: 'Proporción de las acciones controlada por directivos, consejeros y personas vinculadas a la compañía.',
    why: 'Una participación relevante puede alinear intereses, aunque una concentración excesiva también reduce el capital negociable.'
  },
  'BPA real': {
    what: 'Beneficio por acción publicado por la compañía para el periodo.',
    why: 'Permite medir el resultado efectivo y compararlo con las expectativas previas del mercado.'
  },
  Estimado: {
    what: 'Previsión media del consenso de analistas antes de publicarse el resultado.',
    why: 'El mercado suele reaccionar a la diferencia entre el dato real y esta expectativa, no solo al nivel absoluto del resultado.'
  },
  Sorpresa: {
    what: 'Diferencia porcentual entre el beneficio por acción real y el estimado por los analistas.',
    why: 'Muestra si la empresa supera o incumple expectativas y puede influir en revisiones de estimaciones y cotización.'
  },
  Beta: {
    what: 'Estima cuánto tiende a moverse la acción frente al mercado. Una beta de 1 implica una sensibilidad similar al índice.',
    why: 'Ayuda a entender el riesgo de mercado: valores superiores a 1 suelen amplificar movimientos y valores inferiores suelen ser más defensivos.'
  },
  'Precio objetivo': {
    what: 'Precio medio que los analistas esperan para la acción dentro de su horizonte de valoración.',
    why: 'Ofrece una referencia de potencial, pero depende de supuestos y estimaciones que pueden cambiar; no debe tratarse como una garantía.'
  },
  'RSI (14)': {
    what: 'Oscilador de 0 a 100 que compara la intensidad de las subidas y bajadas de las últimas 14 sesiones.',
    why: 'Ayuda a detectar impulso y posibles zonas de sobrecompra por encima de 70 o sobreventa por debajo de 30, sin anticipar por sí solo un giro.'
  },
  MACD: {
    what: 'Compara dos medias exponenciales del precio y una línea de señal para medir tendencia e impulso.',
    why: 'Los cruces y el signo del histograma ayudan a identificar cambios de momentum, aunque pueden llegar tarde en mercados laterales.'
  },
  'SMA 50': {
    what: 'Media simple del precio de cierre de las últimas 50 sesiones.',
    why: 'Suaviza el ruido y representa la tendencia de medio plazo; el precio y sus cruces con otras medias aportan contexto técnico.'
  },
  'SMA 200': {
    what: 'Media simple del precio de cierre de las últimas 200 sesiones.',
    why: 'Es una referencia habitual de tendencia de largo plazo y puede actuar como zona de soporte o resistencia observada por muchos inversores.'
  },
  'SMA 50 / 200': {
    what: 'Compara las medias simples de 50 y 200 sesiones para resumir las tendencias de medio y largo plazo.',
    why: 'Una SMA 50 sobre la SMA 200 suele asociarse con una estructura alcista; por debajo, con una estructura bajista.'
  },
  'ATR (14)': {
    what: 'Promedio del rango verdadero de las últimas 14 sesiones; mide cuánto se mueve el precio, no su dirección.',
    why: 'Sirve para dimensionar riesgo, stops y posiciones de acuerdo con la volatilidad real de la acción.'
  },
  'Volatilidad 30d (anual.)': {
    what: 'Variabilidad de los rendimientos diarios de las últimas 30 sesiones, expresada como una tasa anualizada.',
    why: 'Cuantifica la intensidad reciente de las oscilaciones y ayuda a comparar el riesgo entre activos.'
  },
  'Distancia a máx. 52s': {
    what: 'Diferencia porcentual entre el precio actual y el máximo alcanzado durante las últimas 52 semanas.',
    why: 'Sitúa el precio dentro de su rango anual y muestra cuánto tendría que avanzar para recuperar su máximo reciente.'
  },
  'Distancia a mín. 52s': {
    what: 'Diferencia porcentual entre el precio actual y el mínimo alcanzado durante las últimas 52 semanas.',
    why: 'Ayuda a entender cuánto se ha recuperado la acción desde su suelo anual y su posición dentro del rango reciente.'
  },
  'Caída máxima (1a)': {
    what: 'Mayor pérdida porcentual desde un máximo hasta el mínimo posterior registrada durante el último año.',
    why: 'Resume el peor deterioro sufrido por un inversor en el periodo y aporta una medida intuitiva del riesgo bajista.'
  },
  Bollinger: {
    what: 'Bandas situadas alrededor de una media móvil a una distancia basada en la volatilidad reciente.',
    why: 'Muestran si el precio está relativamente extendido y si la volatilidad se expande o contrae; tocar una banda no implica por sí solo reversión.'
  },
  'Bandas de Bollinger': {
    what: 'Bandas situadas alrededor de una media móvil a una distancia basada en la volatilidad reciente.',
    why: 'Muestran si el precio está relativamente extendido y si la volatilidad se expande o contrae; tocar una banda no implica por sí solo reversión.'
  },
  'Tendencia de fondo': {
    what: 'Clasifica la estructura de largo plazo comparando el precio actual con la media de 200 sesiones.',
    why: 'Ayuda a distinguir si el mercado mantiene una tendencia principal alcista o bajista antes de valorar señales de más corto plazo.'
  },
  'Cruce de medias': {
    what: 'Compara la posición de la media de 50 sesiones con la de 200 sesiones.',
    why: 'Un cruce al alza puede confirmar fortalecimiento de tendencia y uno a la baja, deterioro; ambos son señales retardadas.'
  }
};

export function getIndicatorHelp(name) {
  return INDICATOR_HELP[name] || null;
}

export default function IndicatorInfo({ name, helpKey = name, className = '' }) {
  const help = getIndicatorHelp(helpKey);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 300 });
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const titleId = useId();
  const panelId = useId();

  const placePanel = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 24);
    const height = panelRef.current?.getBoundingClientRect().height || 190;
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
    const below = rect.bottom + 8;
    const top = below + height <= window.innerHeight - 12
      ? below
      : Math.max(12, rect.top - height - 8);
    setPosition({ top, left, width });
  }, []);

  useLayoutEffect(() => {
    if (open) placePanel();
  }, [open, placePanel]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    window.addEventListener('resize', placePanel);
    window.addEventListener('scroll', placePanel, true);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
      window.removeEventListener('resize', placePanel);
      window.removeEventListener('scroll', placePanel, true);
    };
  }, [open, placePanel]);

  if (!help) return <span className={className}>{name}</span>;

  return (
    <span className={`indicator-info ${className}`.trim()} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="indicator-info-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <span>{name}</span>
        <span className="indicator-info-icon" aria-hidden="true">i</span>
      </button>
      {open && (
        <span
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          className="indicator-popover"
          style={position}
        >
          <span className="indicator-popover-head">
            <strong id={titleId}>{name}</strong>
            <button type="button" className="indicator-popover-close" onClick={() => setOpen(false)} aria-label="Cerrar explicación">×</button>
          </span>
          <span className="indicator-popover-label">Qué es</span>
          <span className="indicator-popover-copy">{help.what}</span>
          <span className="indicator-popover-label">Por qué importa</span>
          <span className="indicator-popover-copy">{help.why}</span>
        </span>
      )}
    </span>
  );
}
