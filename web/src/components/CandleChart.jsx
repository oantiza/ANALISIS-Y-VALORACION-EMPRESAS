import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode, LineStyle } from 'lightweight-charts';

const BASE_OPTS = {
  layout: {
    background: { type: ColorType.Solid, color: 'transparent' },
    textColor: '#8a8272',
    fontFamily: "'Roboto Flex', system-ui, sans-serif",
    fontSize: 11
  },
  grid: {
    vertLines: { color: '#e3e8ef' },
    horzLines: { color: '#e3e8ef' }
  },
  rightPriceScale: { borderColor: '#d8dee7' },
  timeScale: { borderColor: '#d8dee7', timeVisible: false },
  crosshair: {
    mode: CrosshairMode.Normal,
    vertLine: { color: '#5e7ca3', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#5e7ca3' },
    horzLine: { color: '#5e7ca3', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#5e7ca3' }
  }
};

/** Gráfico de velas con volumen y overlays (SMA50, SMA200, Bollinger). */
export default function CandleChart({ candles, sma50, sma200, bbUpper, bbLower, height = 380 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !candles?.length) return;
    const el = ref.current;
    const chart = createChart(el, { ...BASE_OPTS, width: el.clientWidth, height });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#1e7a46', downColor: '#c0303c',
      borderUpColor: '#1e7a46', borderDownColor: '#c0303c',
      wickUpColor: '#1e7a46', wickDownColor: '#c0303c'
    });
    candleSeries.setData(candles.map((c) => ({ time: c.date, open: c.open, high: c.high, low: c.low, close: c.close })));

    const volSeries = chart.addHistogramSeries({
      priceScaleId: 'vol',
      priceFormat: { type: 'volume' },
      color: '#cbd5e0',
      lastValueVisible: false,
      priceLineVisible: false
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 }, visible: false });
    volSeries.setData(candles.map((c) => ({
      time: c.date,
      value: c.volume || 0,
      color: c.close >= c.open ? 'rgba(30,122,70,0.28)' : 'rgba(192,48,60,0.25)'
    })));

    const addLine = (data, color, width = 2, style = LineStyle.Solid) => {
      if (!data) return;
      const s = chart.addLineSeries({ color, lineWidth: width, lineStyle: style, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      s.setData(
        candles.map((c, i) => ({ time: c.date, value: data[i] })).filter((p) => p.value != null)
      );
    };
    addLine(sma50, '#3e76b5', 2);
    addLine(sma200, '#1b2430', 2);
    addLine(bbUpper, 'rgba(23,73,123,0.35)', 1, LineStyle.Dashed);
    addLine(bbLower, 'rgba(23,73,123,0.35)', 1, LineStyle.Dashed);

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth }));
    ro.observe(el);
    return () => { ro.disconnect(); chart.remove(); };
  }, [candles, sma50, sma200, bbUpper, bbLower, height]);

  return <div ref={ref} className="chart-box" />;
}

/** Gráfico auxiliar de indicador (RSI, MACD…): líneas + histograma + niveles. */
export function IndicatorChart({ dates, lines = [], histogram, levels = [], height = 140 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !dates?.length) return;
    const el = ref.current;
    const chart = createChart(el, {
      ...BASE_OPTS,
      width: el.clientWidth,
      height,
      timeScale: { ...BASE_OPTS.timeScale, visible: true }
    });

    if (histogram) {
      const h = chart.addHistogramSeries({ priceLineVisible: false, lastValueVisible: false });
      h.setData(
        dates.map((d, i) => ({
          time: d,
          value: histogram[i],
          color: (histogram[i] ?? 0) >= 0 ? 'rgba(30,122,70,0.45)' : 'rgba(192,48,60,0.45)'
        })).filter((p) => p.value != null)
      );
    }

    let firstLine = null;
    for (const ln of lines) {
      const s = chart.addLineSeries({ color: ln.color, lineWidth: ln.width || 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      s.setData(dates.map((d, i) => ({ time: d, value: ln.data[i] })).filter((p) => p.value != null));
      if (!firstLine) firstLine = s;
    }

    for (const lv of levels) {
      (firstLine || chart.addLineSeries({ visible: false })).createPriceLine({
        price: lv.value, color: lv.color || '#94a7bd', lineWidth: 1, lineStyle: LineStyle.Dashed,
        axisLabelVisible: true, title: lv.label || ''
      });
    }

    chart.timeScale().fitContent();
    const ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth }));
    ro.observe(el);
    return () => { ro.disconnect(); chart.remove(); };
  }, [dates, lines, histogram, levels, height]);

  return <div ref={ref} className="chart-box" />;
}