import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef
} from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

function isoGuess(feature) {
  return feature.id ? String(feature.id).padStart(3, '0') : '—';
}

// Maps a feature's data-coverage status to the CSS class that colors it
// (see .land.data-etti / .data-gtbi / .data-both in App.css). Countries
// with no ETTI/GTBI data get no extra class, so they keep the default
// --land fill.
function dataClassFor(feature, countryStatus) {
  const status = countryStatus?.[isoGuess(feature)];
  if (status === 'both') return 'data-both';
  if (status === 'etti') return 'data-etti';
  if (status === 'gtbi') return 'data-gtbi';
  return '';
}

const Globe = forwardRef(function Globe({ worldData, onCountryClick, countryStatus, countryQuickStats }, ref) {
  const containerRef = useRef(null);
  const d3State = useRef({}); // stash mutable d3 objects across renders
  const quickStatsRef = useRef(countryQuickStats);
  quickStatsRef.current = countryQuickStats; // always read the latest without re-running the main effect

  useEffect(() => {
    if (!worldData || !containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = ''; // clear any previous render (e.g. StrictMode double-invoke)

    const width0 = container.clientWidth || window.innerWidth;
    const height0 = container.clientHeight || window.innerHeight;

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', [0, 0, width0, height0])
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const defs = svg.append('defs');

    const glow = defs
      .append('radialGradient')
      .attr('id', 'glow')
      .attr('cx', '50%')
      .attr('cy', '45%');
    glow.append('stop').attr('offset', '0%').attr('stop-color', '#1B3A4A').attr('stop-opacity', 0.55);
    glow.append('stop').attr('offset', '100%').attr('stop-color', '#080D16').attr('stop-opacity', 0);

    const ocean = defs
      .append('radialGradient')
      .attr('id', 'ocean')
      .attr('cx', '38%')
      .attr('cy', '32%');
    ocean.append('stop').attr('offset', '0%').attr('stop-color', '#123049');
    ocean.append('stop').attr('offset', '100%').attr('stop-color', '#070C15');

    const g = svg.append('g');

    const scaleBase = Math.min(width0, height0) / 2.15;
    const projection = d3
      .geoOrthographic()
      .scale(scaleBase)
      .translate([width0 / 2, height0 / 2])
      .rotate([-10, -20]);

    const path = d3.geoPath(projection);

    g.append('circle')
      .attr('class', 'sphere-glow')
      .attr('cx', width0 / 2)
      .attr('cy', height0 / 2)
      .attr('r', scaleBase * 1.5);

    g.append('circle')
      .attr('class', 'sphere-fill')
      .attr('cx', width0 / 2)
      .attr('cy', height0 / 2)
      .attr('r', scaleBase);

    const graticule = d3.geoGraticule10();
    g.append('path').datum(graticule).attr('class', 'graticule').attr('d', path);

    const countriesLayer = g.append('g');

    const tooltip = d3
      .select(container)
      .append('div')
      .attr('class', 'globe-tooltip')
      .style('opacity', 0);

    const countries = topojson.feature(worldData, worldData.objects.countries);
    const allFeatures = countries.features;

    let selectedNode = null;

    function tooltipHtml(feature) {
      const stats = quickStatsRef.current?.[isoGuess(feature)];
      const name = feature.properties.name;
      const fmt = (entry) => (entry ? `${entry.score !== null ? entry.score.toFixed(2) : 'Data Pending'} (${entry.year})` : '—');
      return `
        <div class="globe-tooltip-name">${name}</div>
        <div class="globe-tooltip-row"><span>ETTI</span><span>${fmt(stats?.etti)}</span></div>
        <div class="globe-tooltip-row"><span>GTBI</span><span>${fmt(stats?.gtbi)}</span></div>
      `;
    }

    const land = countriesLayer
      .selectAll('path.land')
      .data(allFeatures)
      .join('path')
      .attr('class', (d) => `land ${dataClassFor(d, countryStatus)}`.trim())
      .attr('d', path)
      .on('pointerenter', function (event, d) {
        tooltip.html(tooltipHtml(d)).style('opacity', 1);
      })
      .on('pointermove', function (event) {
        const [x, y] = d3.pointer(event, container);
        const tooltipNode = tooltip.node();
        const containerRect = container.getBoundingClientRect();
        const tw = tooltipNode.offsetWidth;
        const th = tooltipNode.offsetHeight;
        // Keep it beside the cursor but never past the container's edge.
        let left = x + 16;
        let top = y - th / 2;
        if (left + tw > containerRect.width) left = x - tw - 16;
        top = Math.max(6, Math.min(top, containerRect.height - th - 6));
        tooltip.style('left', `${left}px`).style('top', `${top}px`);
      })
      .on('pointerleave', function () {
        tooltip.style('opacity', 0);
      })
      .on('click', function (event, d) {
        event.stopPropagation();
        selectCountry(d, this);
      });

    function selectCountry(feature, node) {
      if (selectedNode) d3.select(selectedNode).classed('selected', false);
      if (node) {
        d3.select(node).classed('selected', true);
        selectedNode = node;
      }
      onCountryClick(feature.properties.name, isoGuess(feature), node);
    }

    const sensitivity = 0.8;
    const drag = d3.drag()
      .on('start', function () {
        tooltip.style('opacity', 0);
      })
      .on('drag', function (event) {
      const rotate = projection.rotate();
      const k = sensitivity / (projection.scale() / 100);
      const nextLongitude = rotate[0] + event.dx * k;
      const nextLatitude = rotate[1] - event.dy * k;
      projection.rotate([nextLongitude, nextLatitude, rotate[2]]);
      land.attr('d', path);
      g.selectAll('.graticule').attr('d', path);
    });
    svg.call(drag);

    const zoom = d3
      .zoom()
      .scaleExtent([0.6, 5])
      .on('zoom', (event) => {
        const k = event.transform.k;
        projection.scale(scaleBase * k);
        path.projection(projection);
        land.attr('d', path);
        g.select('.graticule').attr('d', path);
        g.select('.sphere-fill').attr('r', scaleBase * k);
        g.select('.sphere-glow').attr('r', scaleBase * k * 1.5);
      });
    svg.call(zoom);

    let autorotate = d3.timer(function () {
      const rotate = projection.rotate();
      const k = 4;
      projection.rotate([rotate[0] + 0.008 * k, rotate[1]]);
      land.attr('d', path);
      g.select('.graticule').attr('d', path);
    });
    ['pointerdown', 'wheel'].forEach((evt) => {
      svg.node().addEventListener(evt, () => autorotate.stop(), { once: true });
    });

    // stash for imperative API + cleanup
    d3State.current = { svg, g, land, path, projection, countriesLayer, autorotate, selectCountry, allFeatures };

    return () => {
      autorotate.stop();
      svg.on('.zoom', null);
      container.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldData, countryStatus]);

  useImperativeHandle(ref, () => ({
    focusOnFeature(feature) {
      const { g, path, projection, countriesLayer, autorotate, selectCountry } = d3State.current;
      if (!projection) return;
      autorotate.stop();

      const centroid = d3.geoCentroid(feature);
      const targetRotate = [-centroid[0], -centroid[1]];
      d3.transition()
        .duration(900)
        .tween('rotate', () => {
          const r = d3.interpolate(projection.rotate(), targetRotate);
          return (t) => {
            projection.rotate(r(t));
            countriesLayer.selectAll('path.land').attr('d', path);
            g.select('.graticule').attr('d', path);
          };
        });

      const node = countriesLayer
        .selectAll('path.land')
        .filter((d) => d === feature)
        .node();
      selectCountry(feature, node);
    }
  }));

  return <div id="globe-container" ref={containerRef} />;
});

export default Globe;