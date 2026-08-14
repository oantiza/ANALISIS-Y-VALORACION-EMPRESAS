import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode, LineStyle } from 'lightweight-charts';
import { useTheme } from './Theme.jsx';

const cssColor = (styles, name, fallback) => styles.getPropertyValue(name).trim() || fallback;

function baseOptions(el) {
  const styles = getComputedStyle(el);
  const grid = cssColor(styles, '--grid', '#e1e6ec');
  const line = cssColor(styles, '--line', '#d5dce5');
  const gold = cssColor(styles, '--gold', '#8d6d3d');
  const crossLabel = cssColor(styles, '--chart-cross-label', gold);
  return {
    layout: {
      background: { type: ColorType.Solid, color: 'transparent' },
      textColor: cssColor(styles, '--chart-text', '#6e7b8b'),
      fontFamily: "'Roboto Flex', system-ui, sans-serif",
      fontSize: 11
    },
    grid: { vertLines: { color: grid }, horzLines: { color: grid } },
    rightPriceScale: { borderColor: line },
    timeScale: { borderColor: line, timeVisible: false },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: { color: gold, width: 1, style: LineStyle.Dashed, labelBackgroundColor: crossLabel },
      horzLine: { color: gold, width: 1, style: LineStyle.Dashed, labelBackgroundColor: crossLabel }
    },
    handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
    handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true }
  };
}

function resolveColor(styles, value, fallback) {
  return value?.startsWith('--') ? cssColor(styles, value, fallback) : (value || fallback);
}

/** Gráfico de velas con volumen y overlays (SMA50, SMA200, Bollinger). */
export default function CandleChart({ candles, sma50, sma200, bbUpper, bbLower, height = 380 }) {
  const ref = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!ref.current || !candles?.length) return;
    const el = ref.current;
    const styles = getComputedStyle(el);
    const opts = baseOptions(el);
    const pos = cssColor(styles, '--pos', '#187344');
    const neg = cssColor(styles, '--neg', '#bd2d3d');
    const chart = createChart(el, { ...opts, width: el.clientWidth, height });

    const candleSeries = chart.addCandlestickSeries({
      upColor: pos, downColor: neg,
      borderUpColor: pos, borderDownColor: neg,
      wickUpColor: pos, wickDownColor: neg
    });
    candleSeries.setData(candles.map((c) => ({ time: c.date, open: c.open, high: c.high, low: c.low, close: c.close })));

    const volSeries = chart.addHistogramSeries({
      priceScaleId: 'vol',
      priceFormat: { type: 'volume' },
      color: cssColor(styles, '--volume', '#cbd5e0'),
      lastValueVisible: false,
      priceLineVisible: false
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 }, visible: false });
    volSeries.setData(candles.map((c) => ({
      time: c.date,
      value: c.volume || 0,
      color: c.close >= c.open
        ? cssColor(styles, '--volume-up', 'rgba(24,115,68,0.28)')
        : cssColor(styles, '--volume-down', 'rgba(189,45,61,0.25)')
    })));

    const addLine = (data, color, width = 2, style = LineStyle.Solid) => {
      if (!data) return;
      const s = chart.addLineSeries({ color, lineWidth: width, lineStyle: style, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      s.setData(
        candles.map((c, i) => ({ time: c.date, value: data[i] })).filter((p) => p.value != null)
      );
    };
    addLine(sma50, cssColor(styles, '--sma50', '#3e76b5'), 2);
    addLine(sma200, cssColor(styles, '--sma200', '#815e24'), 2);
    addLine(bbUpper, cssColor(styles, '--bb', 'rgba(62,118,181,0.38)'), 1, LineStyle.Dashed);
    addLine(bbLower, cssColor(styles, '--bb', 'rgba(62,118,181,0.38)'), 1, LineStyle.Dashed);

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth }));
    ro.observe(el);
    return () => { ro.disconnect(); chart.remove(); };
  }, [candles, sma50, sma200, bbUpper, bbLower, height, theme]);

  return <div ref={ref} className="chart-box" />;
}

/** Gráfico auxiliar de indicador (RSI, MACD…): líneas + histograma + niveles. */
export function IndicatorChart({ dates, lines = [], histogram, levels = [], height = 140 }) {
  const ref = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!ref.current || !dates?.length) return;
    const el = ref.current;
    const styles = getComputedStyle(el);
    const opts = baseOptions(el);
    const chart = createChart(el, {
      ...opts,
      width: el.clientWidth,
      height,
      timeScale: { ...opts.timeScale, visible: true }
    });

    if (histogram) {
      const h = chart.addHistogramSeries({ priceLineVisible: false, lastValueVisible: false });
      h.setData(
        dates.map((d, i) => ({
          time: d,
          value: histogram[i],
          color: (histogram[i] ?? 0) >= 0
            ? cssColor(styles, '--hist-up', 'rgba(24,115,68,0.48)')
            : cssColor(styles, '--hist-down', 'rgba(189,45,61,0.48)')
        })).filter((p) => p.value != null)
      );
    }

    let firstLine = null;
    for (const ln of lines) {
      const s = chart.addLineSeries({ color: resolveColor(styles, ln.color, cssColor(styles, '--gold', '#8d6d3d')), lineWidth: ln.width || 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      s.setData(dates.map((d, i) => ({ time: d, value: ln.data[i] })).filter((p) => p.value != null));
      if (!firstLine) firstLine = s;
    }

    for (const lv of levels) {
      (firstLine || chart.addLineSeries({ visible: false })).createPriceLine({
        price: lv.value, color: resolveColor(styles, lv.color, cssColor(styles, '--ink3', '#7e8a99')), lineWidth: 1, lineStyle: LineStyle.Dashed,
        axisLabelVisible: true, title: lv.label || ''
      });
    }

    chart.timeScale().fitContent();
    const ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth }));
    ro.observe(el);
    return () => { ro.disconnect(); chart.remove(); };
  }, [dates, lines, histogram, levels, height, theme]);

  return <div ref={ref} className="chart-box" />;
}
