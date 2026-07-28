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
    vertLines: { color: '#ece5d6' },
    horzLines: { color: '#ece5d6' }
  },
  rightPriceScale: { borderColor: '#dcd3c4' },
  timeScale: { borderColor: '#dcd3c4', timeVisible: false },
  crosshair: {
    mode: CrosshairMode.Normal,
    vertLine: { color: '#9c8459', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#9c8459' },
    horzLine: { color: '#9c8459', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#9c8459' }
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
      upColor: '#2e6b4e', downColor: '#a81e33',
      borderUpColor: '#2e6b4e', borderDownColor: '#a81e33',
      wickUpColor: '#2e6b4e', wickDownColor: '#a81e33'
    });
    candleSeries.setData(candles.map((c) => ({ time: c.date, open: c.open, high: c.high, low: c.low, close: c.close })));

    const volSeries = chart.addHistogramSeries({
      priceScaleId: 'vol',
      priceFormat: { type: 'volume' },
      color: '#d8cfbe',
      lastValueVisible: false,
      priceLineVisible: false
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 }, visible: false });
    volSeries.setData(candles.map((c) => ({
      time: c.date,
      value: c.volume || 0,
      color: c.close >= c.open ? 'rgba(46,107,78,0.28)' : 'rgba(168,30,51,0.25)'
    })));

    const addLine = (data, color, width = 2, style = LineStyle.Solid) => {
      if (!data) return;
      const s = chart.addLineSeries({ color, lineWidth: width, lineStyle: style, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      s.setData(
        candles.map((c, i) => ({ time: c.date, value: data[i] })).filter((p) => p.value != null)
      );
    };
    addLine(sma50, '#9c8459', 2);
    addLine(sma200, '#201e1b', 2);
    addLine(bbUpper, 'rgba(168,30,51,0.35)', 1, LineStyle.Dashed);
    addLine(bbLower, 'rgba(168,30,51,0.35)', 1, LineStyle.Dashed);

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
          color: (histogram[i] ?? 0) >= 0 ? 'rgba(46,107,78,0.45)' : 'rgba(168,30,51,0.45)'
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
        price: lv.value, color: lv.color || '#9c8459', lineWidth: 1, lineStyle: LineStyle.Dashed,
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