import React, { useState, useEffect, useRef, useCallback } from 'react';
import API_BASE from './config';
import {
  Search,
  ChevronRight,
  Mail,
  Lock,
  X,
  User,
  Home,
  Settings,
  Users,
  MapPin,
  Banknote,
  Info,
  ChevronDown,
  Check,
  Cloud,
  Droplet,
  ShieldAlert,
  TreePine,
  Trash2,
  Flame,
  Waves,
  VolumeX,
  Car,
  Map as MapIcon,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  Share2,
  Camera,
  MessageSquare,
  AlertTriangle,
  Loader2,
  Wrench,
  Lightbulb,
  ScanSearch,
  Navigation,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { renderToString } from 'react-dom/server';
import AreaIntelligence from './components/AreaIntelligence';
import ActionEngine from './components/ActionEngine';

import OmniSearch from './components/OmniSearch';
import CivicAssistant from './components/CivicAssistant';
import UserProfile from './components/UserProfile';

const PRIMARY_FILTERS = ['Trees', 'Toilets', 'Health', 'Water'];
const SECONDARY_FILTERS = [
  // Action Civic Domain Categories (real data — 4,795 points)
  'Waste Management',
  'Civic & Infrastructure',
  'Water & Sanitation',
  'Community & Civic Engagement',
  'Environment & Disaster Management',
  'Environment & Green Spaces',
  'Health & Wellness',
];

const ISSUE_CONFIG = {
  'Air': { icon: Cloud, color: '#64748b' },
  'Water': { icon: Droplet, color: '#3b82f6' },
  'Safety': { icon: ShieldAlert, color: '#ef4444' },
  'Deforestation': { icon: TreePine, color: '#10b981' },
  'Garbage': { icon: Trash2, color: '#d97706' },
  'Stubble Burning': { icon: Flame, color: '#f97316' },
  'Lake Polluted': { icon: Waves, color: '#14b8a6' },
  'Noise Pollution': { icon: VolumeX, color: '#a855f7' },
  'Illegal Parking': { icon: Car, color: '#52525b' },
  'Encroachment': { icon: MapIcon, color: '#be123c' },
  // DB / Facility Categories
  'Public Infra': { icon: MapPin, color: '#64748b' },
  'Climate': { icon: Cloud, color: '#10b981' },
  'Trees': { icon: TreePine, color: '#10b981' },
  'Toilets': { icon: Sparkles, color: '#3b82f6' },
  'Health': { icon: ShieldAlert, color: '#ef4444' },
  'Action': { icon: CheckCircle2, color: '#10b981' },
  'Actions': { icon: CheckCircle2, color: '#10b981' },
  'People': { icon: Users, color: '#8b5cf6' },
  // Action Civic Domain Categories (7 civic domains from Bengaluru Actions dataset)
  'Waste Management':                { icon: Trash2,        color: '#d97706' },
  'Civic & Infrastructure':          { icon: MapPin,        color: '#6366f1' },
  'Water & Sanitation':              { icon: Droplet,       color: '#3b82f6' },
  'Community & Civic Engagement':    { icon: Users,         color: '#8b5cf6' },
  'Environment & Disaster Management': { icon: AlertTriangle, color: '#ef4444' },
  'Environment & Green Spaces':      { icon: TreePine,      color: '#10b981' },
  'Health & Wellness':               { icon: ShieldAlert,   color: '#ec4899' },
  // Action Subcategory Icons — keyed by Action Type (civic_class-aware map markers)
  'Hands-on Action':        { icon: Wrench,      color: '#10b981' }, // ASSET — emerald
  'Solutions & Prototypes': { icon: Lightbulb,   color: '#06b6d4' }, // ASSET — cyan
  'Community & Engagement': { icon: Users,       color: '#8b5cf6' }, // MOMENTUM — purple
  'Investigation & Audit':  { icon: ScanSearch,  color: '#f59e0b' }, // CHALLENGE — amber
  'Reporting & Mapping':    { icon: Navigation,  color: '#ef4444' }, // CHALLENGE — red
  // Area Intelligence Bucket Cards
  'Field Work':   { icon: Wrench,      color: '#10b981' }, // Action assets aggregate
  'Field Audits': { icon: ScanSearch,  color: '#f59e0b' }, // Action challenges aggregate
};

// --- Ninja Avatar Helpers ---
const NINJA_AVATAR_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];
const getNinjaColor = (id) => NINJA_AVATAR_COLORS[Number(id) % NINJA_AVATAR_COLORS.length];
const getNinjaInitial = (name) => name ? name.trim()[0].toUpperCase() : '?';

const NinjaAvatar = ({ id, name, size = 'sm' }) => {
  const color = getNinjaColor(id);
  const initial = getNinjaInitial(name);
  const sizeClass = size === 'sm' ? 'w-10 h-10 text-sm' : 'w-12 h-12 text-base';
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white shrink-0 select-none`}
      style={{ backgroundColor: color }}
    >
      {initial}
    </div>
  );
};

const CITIES = [
  { name: 'Bangalore', lat: 12.9716, lon: 77.5946 },
  { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
  { name: 'Delhi', lat: 28.6139, lon: 77.2090 },
  { name: 'Punjab', lat: 31.1471, lon: 75.3412 },
];

// --- TEXTURE GENERATOR ENGINE (Shared) ---
const generateTextures = (map) => {
  const size = 64; // High-DPI texture size
  const center = size / 2;
  const radius = 28;

  Object.entries(ISSUE_CONFIG).forEach(([category, config]) => {
    const Icon = config.icon;
    const svgString = renderToString(<Icon size={32} color="#ffffff" strokeWidth={2.5} xmlns="http://www.w3.org/2000/svg" />);

    const img = new Image();
    const svgBase64 = btoa(unescape(encodeURIComponent(svgString)));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(center, center, radius - 3, 0, Math.PI * 2);
      ctx.fillStyle = config.color;
      ctx.fill();

      ctx.drawImage(img, center - 16, center - 16, 32, 32);

      if (!map.hasImage(`icon-${category}`)) {
        map.addImage(`icon-${category}`, ctx.getImageData(0, 0, size, size));
      }
    };
    img.src = `data:image/svg+xml;base64,${svgBase64}`;
  });

  const fallbackCanvas = document.createElement('canvas');
  fallbackCanvas.width = size; fallbackCanvas.height = size;
  const ctx = fallbackCanvas.getContext('2d');
  ctx.beginPath(); ctx.arc(center, center, radius, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.beginPath(); ctx.arc(center, center, radius - 3, 0, Math.PI * 2); ctx.fillStyle = '#a855f7'; ctx.fill();
  if (!map.hasImage('icon-default')) map.addImage('icon-default', ctx.getImageData(0, 0, size, size));
};

export default function App() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const mapRef2 = useRef(null);
  const mapInstance2 = useRef(null);
  const markersRef = useRef({});
  const issueMarkersRef = useRef({});
  const markerClusterGroupRef = useRef(null);

  // Auth & State Management
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [activeNinjas, setActiveNinjas] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  const [activeFilters, setActiveFilters] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filterSearchQuery, setFilterSearchQuery] = useState('');
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isLoadingIssue, setIsLoadingIssue] = useState(false);
  const [activeTab, setActiveTab] = useState('area');
  const [activeAreaIssues, setActiveAreaIssues] = useState([]);
  const [activeAreaActions, setActiveAreaActions] = useState([]);
  const [activeAreaActionFilter, setActiveAreaActionFilter] = useState('All Categories');
  const [activeAreaActionTypeFilter, setActiveAreaActionTypeFilter] = useState('All Types');
  const [activeAreaTopicFilter, setActiveAreaTopicFilter] = useState('All Topics');
  const [activeActionFiltersList, setActiveActionFiltersList] = useState({ categories: [], actionTypes: [], topics: [] });
  const [resolvedIssueIds, setResolvedIssueIds] = useState([]);
  // Tracks which PRIMARY_FILTERS have data in current viewport — drives filter button dim state
  const [viewportCounts, setViewportCounts] = useState({});
  const [pendingQuery, setPendingQuery] = useState('');
  const handleAssistantQueryConsumed = useCallback(() => setPendingQuery(''), []);
  const [isComparing, setIsComparing] = useState(false);
  const [activeViewport, setActiveViewport] = useState('A');
  const [mapCenters, setMapCenters] = useState({ A: null, B: null });
  const [regionAData, setRegionAData] = useState({ issues: [], actions: [], counts: {}, total: 0, filters: { categories: [], actionTypes: [] } });
  const [regionBData, setRegionBData] = useState({ issues: [], actions: [], counts: {}, total: 0, filters: { categories: [], actionTypes: [] } });
  const [ninjaDropdownOpen, setNinjaDropdownOpen] = useState(false);
  const ninjaDropdownRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedCity, setSelectedCity] = useState(CITIES[0]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const searchTimeoutRef = useRef(null);

  const handleSearchInput = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (query.length > 2) {
      setIsSearching(true);
      setShowSearchDropdown(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
          const data = await res.json();
          setSearchResults(data || []);
        } catch (err) {
          console.error("Geocoding failed", err);
        } finally {
          setIsSearching(false);
        }
      }, 500);
    } else {
      setSearchResults([]);
      setShowSearchDropdown(false);
    }
  };

  const handleSelectLocation = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    setSearchQuery(result.display_name);
    setShowSearchDropdown(false);

    if (mapInstance.current) {
      // MapLibre flyTo syntax: center is [lng, lat] not [lat, lng]
      mapInstance.current.flyTo({
        center: [lon, lat],
        zoom: 16,
        duration: 1500
      });
    }
  };

  const handleCitySelect = (city) => {
    setSelectedCity(city);
    setShowCityDropdown(false);
    if (mapInstance.current) {
      mapInstance.current.flyTo({
        center: [city.lon, city.lat],
        zoom: 12,
        duration: 2000
      });
    }
  };

  const handleVerifyIssue = (category = null) => {
    const unresolvedIssues = activeAreaIssues.filter(issue => !resolvedIssueIds.includes(issue.id));
    let targetIssue = null;

    if (category) {
      targetIssue = unresolvedIssues.find(issue => issue.type === category);
    }

    if (!targetIssue && unresolvedIssues.length > 0) {
      targetIssue = unresolvedIssues[0];
    }

    if (targetIssue) {
      setSelectedIssue(targetIssue);
      setActiveTab('problem');
    }
  };

  const toggleFilter = (filter) => {
    setActiveFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter]
    );
  };

  const spring = { type: 'spring', stiffness: 500, damping: 30 };

  useEffect(() => {
    if (!mapInstance.current && mapRef.current) {
      console.log('🌍 [SamaajData Telemetry] Initializing MapLibre Engine...');

      const rect = mapRef.current.getBoundingClientRect();
      console.log(`📏 [SamaajData Telemetry] Map Container Dimensions: ${rect.width}px x ${rect.height}px`);

      if (rect.width === 0 || rect.height === 0) {
        console.error('🚨 [SamaajData Telemetry] FATAL: Map container has 0 width or height! The map will not render.');
      }

      mapInstance.current = new maplibregl.Map({
        container: mapRef.current,
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        center: [77.5852, 12.9105],
        zoom: 15,
        pitch: 0,
        maxZoom: 20 // 1% Google-Tier: Capped at crisp street level
      });
      mapInstance.current.on('error', (e) => {
        console.error('🚨 [SamaajData Telemetry] MAP ENGINE ERROR:', e.error || e);
      });

      // Silently inject default icons for any unregistered categories to prevent console spam
      mapInstance.current.on('styleimagemissing', (e) => {
        const id = e.id;
        const defaultImg = mapInstance.current.getImage('icon-default');
        if (defaultImg) {
          mapInstance.current.addImage(id, defaultImg.data);
        }
      });

      mapInstance.current.on('load', () => {
        console.log('✅ [SamaajData Telemetry] Base map style loaded successfully. Injecting vector tiles...');

        // Generate and inject textures immediately
        generateTextures(mapInstance.current);

        // Add In-Memory Supercluster Vector Source
        mapInstance.current.addSource('samaaj_points', {
          type: 'vector',
          tiles: [`${API_BASE}/api/tiles/{z}/{x}/{y}?category=${activeFilters.length > 0 ? encodeURIComponent(activeFilters.join(',')) : 'all'}&v=${Date.now()}`],
          minzoom: 0,
          maxzoom: 20 // 1% Google-Tier: Match map max zoom
        });

        // Layer 1: Premium Shadow for Clusters
        mapInstance.current.addLayer({
          id: 'clusters-shadow',
          type: 'circle',
          source: 'samaaj_points',
          'source-layer': 'samaaj_points',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#000000',
            'circle-radius': 24,
            'circle-blur': 0.8,
            'circle-opacity': 0.6,
            'circle-translate': [0, 6] // Offset for true drop-shadow
          }
        });

        // Layer 2: Premium Dark Clusters (Matches original DOM styling)
        mapInstance.current.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'samaaj_points',
          'source-layer': 'samaaj_points',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#121212', // Deep dark backdrop
            'circle-radius': 22,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#3f3f46', // zinc-700
            'circle-opacity': 0.95
          }
        });

        // Layer 3: Cluster Text
        mapInstance.current.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'samaaj_points',
          'source-layer': 'samaaj_points',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 14,
            'text-allow-overlap': true, // Forces numbers to NEVER be pushed off-center by MapLibre collision engine
            'text-ignore-placement': true // Locks text to exact circle center
          },
          paint: {
            'text-color': '#ffffff'
          }
        });

        // Layer 4: High-Fidelity Unclustered Icons (using injected WebGL textures)
        mapInstance.current.addLayer({
          id: 'unclustered-point',
          type: 'symbol',
          source: 'samaaj_points',
          'source-layer': 'samaaj_points',
          filter: ['all', ['!', ['has', 'point_count']], ['!=', 'type', 'Action']],
          layout: {
            'icon-image': [
              'coalesce',
              ['concat', 'icon-', ['get', 'category']],
              'icon-default'
            ],
            'icon-size': 0.5,
            'icon-allow-overlap': true,
            'icon-pitch-alignment': 'map'
          }
        });

        // Layer 5: Action Unclustered Icons — UNIFIED: samaaj_points source-layer, type filter
        mapInstance.current.addLayer({
          id: 'unclustered-action-symbol',
          type: 'symbol',
          source: 'samaaj_points',
          'source-layer': 'samaaj_points',
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'Action']],
          layout: {
            'icon-image': [
              'coalesce',
              ['concat', 'icon-', ['get', 'subcategory']],
              'icon-Action',
              'icon-default'
            ],
            'icon-size': 0.5,
            'icon-allow-overlap': true,
            'icon-pitch-alignment': 'map'
          }
        });
        // NOTE: No separate action-cluster layers. All data clusters into the single 'clusters' pool.

        // --- SPIDERFY (BRANCH OUT) ENGINE ---
        mapInstance.current.addSource('spider-legs', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        mapInstance.current.addSource('spider-points', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

        mapInstance.current.addLayer({
          id: 'spider-legs-layer',
          type: 'line',
          source: 'spider-legs',
          paint: {
            'line-color': '#ffffff',
            'line-width': 2,
            'line-opacity': 0.4
          }
        });

        mapInstance.current.addLayer({
          id: 'spider-points-layer',
          type: 'symbol',
          source: 'spider-points',
          layout: {
            'icon-image': [
              'case',
              // Action type: use subcategory icon first, fallback to generic Action icon
              ['==', ['get', 'type'], 'Action'],
              ['coalesce',
                ['concat', 'icon-', ['get', 'subcategory']],
                'icon-Action'
              ],
              // Facility type: use category icon
              ['coalesce',
                ['concat', 'icon-', ['get', 'category']],
                ['concat', 'icon-', ['get', 'subcategory']],
                'icon-default'
              ]
            ],
            'icon-size': 0.5,
            'icon-allow-overlap': true,
            'icon-pitch-alignment': 'map'
          }
        });

        // Setup interactions
        const handleUnclusteredClick = async (e) => {
          const props = e.features[0].properties;
          const targetId = props.dp_id || props.id;

          // GOOGLE TIER: Optimistic UI - open the panel immediately with a loading state
          // User sees instant response (0ms), data fills in after the fast PK lookup (~5ms)
          setIsLoadingIssue(true);
          setSelectedIssue(null);
          setActiveTab('problem');

          try {
            // NEW: Fast /api/point/:id endpoint - direct PK lookup, sub-5ms vs 4s sequential scan
            const response = await fetch(`${API_BASE}/api/point/${targetId}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            setSelectedIssue(data);
          } catch (err) {
            console.error('[SamaajData] Failed to fetch point details:', err);
            setToastMessage('Could not load point data. Try again.');
            setTimeout(() => setToastMessage(null), 3000);
            setActiveTab('area');
          } finally {
            setIsLoadingIssue(false);
          }
        };

        mapInstance.current.on('click', 'unclustered-point', handleUnclusteredClick);
        mapInstance.current.on('click', 'unclustered-action-symbol', handleUnclusteredClick);

        const mapClickHandler = async (e) => {
          const features = mapInstance.current.queryRenderedFeatures(e.point, {
            layers: ['clusters'] // UNIFIED: one cluster pool for all data types
          });
          if (features.length > 0) {
            const clusterId = features[0].properties.cluster_id;
            const centerCoords = features[0].geometry.coordinates;
            const currentZoom = mapInstance.current.getZoom();

            try {
              // Read all active filter params from live tile URL to match the index used
              const source = mapInstance.current.getSource('samaaj_points');
              let activeCat = 'all';
              let actionCat = 'All Categories';
              let actionType = 'All Types';
              let activeTopic = 'All Topics';
              if (source && source.tiles && source.tiles[0]) {
                const url = new URL(source.tiles[0]);
                activeCat = url.searchParams.get('category') || 'all';
                actionCat = url.searchParams.get('actionCat') || 'All Categories';
                actionType = url.searchParams.get('actionType') || 'All Types';
                activeTopic = url.searchParams.get('topic') || 'All Topics';
              }

              const expRes = await fetch(`${API_BASE}/api/tiles/cluster/${clusterId}/expansionZoom?category=${encodeURIComponent(activeCat)}&actionCat=${encodeURIComponent(actionCat)}&actionType=${encodeURIComponent(actionType)}&topic=${encodeURIComponent(activeTopic)}`);
              if (!expRes.ok) {
                mapInstance.current.easeTo({ center: centerCoords, zoom: Math.min(currentZoom + 2, 20), duration: 500 });
                return;
              }
              const expData = await expRes.json();
              const expansionZoom = expData.expansionZoom;

              if (expansionZoom <= 20 && currentZoom < expansionZoom) {
                mapInstance.current.easeTo({
                  center: centerCoords,
                  zoom: expansionZoom + 0.5,
                  duration: 800
                });
              } else {
                const res = await fetch(`${API_BASE}/api/tiles/cluster/${clusterId}/leaves?category=${encodeURIComponent(activeCat)}&actionCat=${encodeURIComponent(actionCat)}&actionType=${encodeURIComponent(actionType)}&topic=${encodeURIComponent(activeTopic)}`);
                const allLeaves = await res.json();

                // Visually cap at 30 to prevent UI chaos (Google style)
                const maxLeaves = Math.min(allLeaves.length, 30);
                const leaves = allLeaves.slice(0, maxLeaves);

                const legs = [];
                const points = [];

                // Use MapLibre's screen-pixel projection so circles don't distort into ellipses at different latitudes
                const centerPx = mapInstance.current.project(centerCoords);

                leaves.forEach((leaf, i) => {
                  let legLength, angle;

                  if (leaves.length <= 8) {
                    // Golden Circle for small clusters
                    angle = (i / leaves.length) * Math.PI * 2;
                    legLength = 45; // Fixed pixel radius
                  } else {
                    // Mathematically Perfect Vogel Spiral for dense clusters
                    const goldenAngle = 137.5 * (Math.PI / 180);
                    angle = i * goldenAngle;
                    // Sqrt scaling ensures perfectly uniform point density
                    legLength = 30 + Math.sqrt(i + 1) * 12;
                  }

                  const targetPx = {
                    x: centerPx.x + Math.cos(angle) * legLength,
                    y: centerPx.y + Math.sin(angle) * legLength
                  };

                  // Cast pixel back to geographic coordinate
                  const targetLngLat = mapInstance.current.unproject(targetPx);
                  const targetCoords = [targetLngLat.lng, targetLngLat.lat];

                  legs.push({
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: [centerCoords, targetCoords] }
                  });

                  points.push({
                    type: 'Feature',
                    properties: leaf.properties,
                    geometry: { type: 'Point', coordinates: targetCoords }
                  });
                });

                mapInstance.current.getSource('spider-legs').setData({ type: 'FeatureCollection', features: legs });
                mapInstance.current.getSource('spider-points').setData({ type: 'FeatureCollection', features: points });
              }
            } catch (err) {
              console.error('Failed to process cluster click:', err);
            }
          }
        };

        // Cluster Click: Spiderfy or Zoom (unified pool)
        mapInstance.current.on('click', 'clusters', mapClickHandler);

        // Dynamic Clearing: If user zooms, pan, or clicks away, instantly clear the Spiderfy web
        mapInstance.current.on('zoomstart', () => {
          if (mapInstance.current.getSource('spider-legs')) {
            mapInstance.current.getSource('spider-legs').setData({ type: 'FeatureCollection', features: [] });
            mapInstance.current.getSource('spider-points').setData({ type: 'FeatureCollection', features: [] });
          }
        });

        // Click outside clears spiderfy ring
        mapInstance.current.on('click', (e) => {
          const features = mapInstance.current.queryRenderedFeatures(e.point, { layers: ['clusters', 'spider-points-layer', 'unclustered-point', 'unclustered-action-symbol'] });
          if (features.length === 0) {
            if (mapInstance.current.getSource('spider-legs')) {
              mapInstance.current.getSource('spider-legs').setData({ type: 'FeatureCollection', features: [] });
              mapInstance.current.getSource('spider-points').setData({ type: 'FeatureCollection', features: [] });
            }
          }
        });

        // Click handler for Spiderfy Points
        mapInstance.current.on('click', 'spider-points-layer', async (e) => {
          const props = e.features[0].properties;
          const targetId = props.dp_id || props.id;

          // GOOGLE TIER: Optimistic UI - open panel instantly, fill data when ready
          setIsLoadingIssue(true);
          setSelectedIssue(null);
          setActiveTab('problem');

          try {
            const response = await fetch(`${API_BASE}/api/point/${targetId}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            setSelectedIssue(data);
          } catch (err) {
            console.error('[SamaajData] Failed to fetch spiderfy point:', err);
            setActiveTab('area');
          } finally {
            setIsLoadingIssue(false);
          }
        });

        const pointerEnters = () => { mapInstance.current.getCanvas().style.cursor = 'pointer'; };
        const pointerLeaves = () => { mapInstance.current.getCanvas().style.cursor = ''; };

        mapInstance.current.on('mouseenter', 'unclustered-point', pointerEnters);
        mapInstance.current.on('mouseleave', 'unclustered-point', pointerLeaves);
        mapInstance.current.on('mouseenter', 'unclustered-action-symbol', pointerEnters);
        mapInstance.current.on('mouseleave', 'unclustered-action-symbol', pointerLeaves);
        mapInstance.current.on('mouseenter', 'clusters', pointerEnters);
        mapInstance.current.on('mouseleave', 'clusters', pointerLeaves);
        mapInstance.current.on('mouseenter', 'spider-points-layer', pointerEnters);
        mapInstance.current.on('mouseleave', 'spider-points-layer', pointerLeaves);
      });

      // Context update is now handled by a separate useEffect

    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Surgical Sync of Civic Issues to Map Pins
  // CRITICAL: PRIMARY_FILTERS = facility filters (category param)
  //           SECONDARY_FILTERS = action domain filters (actionCat param) — must NOT go into category or facility tiles vanish
  useEffect(() => {
    if (!mapInstance.current || !mapInstance.current.isStyleLoaded()) return;

    const source = mapInstance.current.getSource('samaaj_points');
    if (!source) return;

    const primaryFilters = activeFilters.filter(f => PRIMARY_FILTERS.includes(f));
    const actionDomainFilters = activeFilters.filter(f => SECONDARY_FILTERS.includes(f));
    // BUG FIX: Support multi-select secondary filters — join ALL active domain filters, not just [0]
    const effectiveActionCat = actionDomainFilters.length > 0 ? actionDomainFilters[0] : activeAreaActionFilter;

    // Robust filter matrix — all 8 combinations handled correctly:
    // Any action-specific filter active with NO primary facility filter → category=none (exclude facilities)
    // Primary filter active → category=Trees,Water,... (facilities only of those types)
    // Mixed → primary facilities + action-filtered actions together
    // No filters → category=all (show everything)
    const isActionOnlyView = primaryFilters.length === 0 && (
      effectiveActionCat !== 'All Categories' ||
      activeAreaActionTypeFilter !== 'All Types' ||
      activeAreaTopicFilter !== 'All Topics'
    );
    const filtersParam = primaryFilters.length > 0
      ? primaryFilters.join(',')
      : isActionOnlyView ? 'none' : 'all';

    let newTilesUrl = `${API_BASE}/api/tiles/{z}/{x}/{y}?category=${encodeURIComponent(filtersParam)}&v=${Date.now()}`;
    if (effectiveActionCat !== 'All Categories') newTilesUrl += `&actionCat=${encodeURIComponent(effectiveActionCat)}`;
    if (activeAreaActionTypeFilter !== 'All Types') newTilesUrl += `&actionType=${encodeURIComponent(activeAreaActionTypeFilter)}`;
    if (activeAreaTopicFilter !== 'All Topics') newTilesUrl += `&topic=${encodeURIComponent(activeAreaTopicFilter)}`;

    // GOOGLE TIER: Use setTiles() directly — surgical URL swap with zero layer disruption.
    // NEVER use setStyle(newStyle, {diff:true}) for tile URL changes — it risks dropping
    // spider-legs, spider-points, and other custom GeoJSON layers during the diff.
    source.setTiles([newTilesUrl]);

  }, [activeFilters, selectedIssue, resolvedIssueIds, activeAreaActionFilter, activeAreaActionTypeFilter, activeAreaTopicFilter]);

  // Map 2 Initialization Logic (Secondary Viewport)
  useEffect(() => {
    if (isComparing && !mapInstance2.current && mapRef2.current) {
      console.log('🌍 [SamaajData Telemetry] Initializing Secondary MapLibre Engine...');
      mapInstance2.current = new maplibregl.Map({
        container: mapRef2.current,
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        center: [77.6271, 12.9279], // Default to Koramangala
        zoom: 14,
        pitch: 0,
        maxZoom: 20,
        preserveDrawingBuffer: false
      });

      mapInstance2.current.on('load', () => {
        generateTextures(mapInstance2.current);

        const filtersParam = activeFilters.length > 0 ? activeFilters.join(',') : 'all';
        mapInstance2.current.addSource('samaaj_points', {
          type: 'vector',
          tiles: [`${API_BASE}/api/tiles/{z}/{x}/{y}?category=${encodeURIComponent(filtersParam)}&v=${Date.now()}`],
          minzoom: 0,
          maxzoom: 20
        });

        mapInstance2.current.addLayer({
          id: 'clusters-shadow-2',
          type: 'circle',
          source: 'samaaj_points',
          'source-layer': 'samaaj_points',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#000000',
            'circle-radius': 24,
            'circle-blur': 0.8,
            'circle-opacity': 0.6,
            'circle-translate': [0, 6]
          }
        });

        // Basic clustered look for Map 2
        mapInstance2.current.addLayer({
          id: 'clusters-2',
          type: 'circle',
          source: 'samaaj_points',
          'source-layer': 'samaaj_points',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#121212',
            'circle-radius': 22,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#3f3f46',
            'circle-opacity': 0.95
          }
        });

        mapInstance2.current.addLayer({
          id: 'cluster-count-2',
          type: 'symbol',
          source: 'samaaj_points',
          'source-layer': 'samaaj_points',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 14,
            'text-allow-overlap': true,
            'text-ignore-placement': true
          },
          paint: {
            'text-color': '#ffffff'
          }
        });

        // Add Unclustered Points Layer
        mapInstance2.current.addLayer({
          id: 'unclustered-point',
          type: 'symbol',
          source: 'samaaj_points',
          'source-layer': 'samaaj_points',
          filter: ['all', ['!', ['has', 'point_count']], ['!=', 'type', 'Action']],
          layout: {
            'icon-image': [
              'coalesce',
              ['concat', 'icon-', ['get', 'category']],
              'icon-default'
            ],
            'icon-size': 0.5,
            'icon-allow-overlap': true,
            'icon-pitch-alignment': 'map'
          }
        });

        // BUG FIX: Action unclustered on Map B — unified samaaj_points source-layer + subcategory icon routing
        mapInstance2.current.addLayer({
          id: 'unclustered-action-symbol-2',
          type: 'symbol',
          source: 'samaaj_points',
          'source-layer': 'samaaj_points',
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'Action']],
          layout: {
            'icon-image': [
              'coalesce',
              ['concat', 'icon-', ['get', 'subcategory']],
              'icon-Action',
              'icon-default'
            ],
            'icon-size': 0.5,
            'icon-allow-overlap': true,
            'icon-pitch-alignment': 'map'
          }
        });
        // NOTE: No separate action-cluster layers on Map B — all data clusters into clusters-2 pool.

        // --- SPIDERFY (BRANCH OUT) ENGINE ---
        mapInstance2.current.addSource('spider-legs', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        mapInstance2.current.addSource('spider-points', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

        mapInstance2.current.addLayer({
          id: 'spider-legs-layer',
          type: 'line',
          source: 'spider-legs',
          paint: {
            'line-color': '#ffffff',
            'line-width': 2,
            'line-opacity': 0.4
          }
        });

        mapInstance2.current.addLayer({
          id: 'spider-points-layer',
          type: 'symbol',
          source: 'spider-points',
          layout: {
            'icon-image': [
              'case',
              // BUG FIX: Action type — use subcategory icon first, fallback to generic Action icon
              ['==', ['get', 'type'], 'Action'],
              ['coalesce',
                ['concat', 'icon-', ['get', 'subcategory']],
                'icon-Action'
              ],
              // Facility type
              ['coalesce',
                ['concat', 'icon-', ['get', 'category']],
                ['concat', 'icon-', ['get', 'subcategory']],
                'icon-default'
              ]
            ],
            'icon-size': 0.5,
            'icon-allow-overlap': true,
            'icon-pitch-alignment': 'map'
          }
        });

        // Setup interactions
        const handleUnclusteredClick2 = async (e) => {
          const props = e.features[0].properties;
          const targetId = props.dp_id || props.id;

          // GOOGLE TIER: Optimistic UI - open the panel immediately with a loading state
          // User sees instant response (0ms), data fills in after the fast PK lookup (~5ms)
          setIsLoadingIssue(true);
          setSelectedIssue(null);
          setActiveTab('problem');

          try {
            // NEW: Fast /api/point/:id endpoint - direct PK lookup, sub-5ms vs 4s sequential scan
            const response = await fetch(`${API_BASE}/api/point/${targetId}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            setSelectedIssue(data);
          } catch (err) {
            console.error('[SamaajData] Failed to fetch point details:', err);
            setToastMessage('Could not load point data. Try again.');
            setTimeout(() => setToastMessage(null), 3000);
            setActiveTab('home');
          } finally {
            setIsLoadingIssue(false);
          }
        };

        mapInstance2.current.on('click', 'unclustered-point', handleUnclusteredClick2);
        mapInstance2.current.on('click', 'unclustered-action-symbol-2', handleUnclusteredClick2);

        const mapClickHandler = async (e) => {
          const features = mapInstance2.current.queryRenderedFeatures(e.point, {
            layers: ['clusters-2'] // UNIFIED: one cluster pool
          });
          if (features.length > 0) {
            const clusterId = features[0].properties.cluster_id;
            const centerCoords = features[0].geometry.coordinates;
            const currentZoom = mapInstance2.current.getZoom();

            try {
              // BUG FIX: Read ALL filter params from live tile URL (actionCat, actionType, topic)
              const source = mapInstance2.current.getSource('samaaj_points');
              let activeCat = 'all';
              let actionCat = 'All Categories';
              let actionType = 'All Types';
              let activeTopic = 'All Topics';
              if (source && source.tiles && source.tiles[0]) {
                const url = new URL(source.tiles[0]);
                activeCat = url.searchParams.get('category') || 'all';
                actionCat = url.searchParams.get('actionCat') || 'All Categories';
                actionType = url.searchParams.get('actionType') || 'All Types';
                activeTopic = url.searchParams.get('topic') || 'All Topics';
              }

              const expRes = await fetch(`${API_BASE}/api/tiles/cluster/${clusterId}/expansionZoom?category=${encodeURIComponent(activeCat)}&actionCat=${encodeURIComponent(actionCat)}&actionType=${encodeURIComponent(actionType)}&topic=${encodeURIComponent(activeTopic)}`);
              if (!expRes.ok) {
                // If cache mismatch or cluster lost, fallback to natural zoom
                mapInstance2.current.easeTo({ center: centerCoords, zoom: Math.min(currentZoom + 2, 20), duration: 500 });
                return;
              }
              const expData = await expRes.json();
              const expansionZoom = expData.expansionZoom;

              // If the cluster breaks apart at a reasonable zoom, AND we aren't already there
              if (expansionZoom <= 20 && currentZoom < expansionZoom) {
                // Cinematic Zoom
                mapInstance2.current.easeTo({
                  center: centerCoords,
                  zoom: expansionZoom + 0.5, // Slightly past the breakpoint
                  duration: 800
                });
              } else {
                // We are at max zoom OR the points are literally stacked on the exact same coordinate.
                // Deploy the Vogel Spiral Spiderfy!
                const res = await fetch(`${API_BASE}/api/tiles/cluster/${clusterId}/leaves?category=${encodeURIComponent(activeCat)}&actionCat=${encodeURIComponent(actionCat)}&actionType=${encodeURIComponent(actionType)}&topic=${encodeURIComponent(activeTopic)}`);
                const allLeaves = await res.json();

                // Visually cap at 30 to prevent UI chaos (Google style)
                const maxLeaves = Math.min(allLeaves.length, 30);
                const leaves = allLeaves.slice(0, maxLeaves);

                const legs = [];
                const points = [];

                // Use MapLibre's screen-pixel projection so circles don't distort into ellipses at different latitudes
                const centerPx = mapInstance2.current.project(centerCoords);

                leaves.forEach((leaf, i) => {
                  let legLength, angle;

                  if (leaves.length <= 8) {
                    // Golden Circle for small clusters
                    angle = (i / leaves.length) * Math.PI * 2;
                    legLength = 45; // Fixed pixel radius
                  } else {
                    // Mathematically Perfect Vogel Spiral for dense clusters
                    const goldenAngle = 137.5 * (Math.PI / 180);
                    angle = i * goldenAngle;
                    // Sqrt scaling ensures perfectly uniform point density
                    legLength = 30 + Math.sqrt(i + 1) * 12;
                  }

                  const targetPx = {
                    x: centerPx.x + Math.cos(angle) * legLength,
                    y: centerPx.y + Math.sin(angle) * legLength
                  };

                  // Cast pixel back to geographic coordinate
                  const targetLngLat = mapInstance2.current.unproject(targetPx);
                  const targetCoords = [targetLngLat.lng, targetLngLat.lat];

                  legs.push({
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: [centerCoords, targetCoords] }
                  });

                  points.push({
                    type: 'Feature',
                    properties: leaf.properties,
                    geometry: { type: 'Point', coordinates: targetCoords }
                  });
                });

                mapInstance2.current.getSource('spider-legs').setData({ type: 'FeatureCollection', features: legs });
                mapInstance2.current.getSource('spider-points').setData({ type: 'FeatureCollection', features: points });
              }
            } catch (err) {
              console.error('Failed to process cluster click:', err);
            }
          }
        };

        // Cluster Click: Spiderfy or Zoom (unified pool)
        mapInstance2.current.on('click', 'clusters-2', mapClickHandler);

        // Dynamic Clearing: If user zooms, pan, or clicks away, instantly clear the Spiderfy web
        mapInstance2.current.on('zoomstart', () => {
          if (mapInstance2.current.getSource('spider-legs')) {
            mapInstance2.current.getSource('spider-legs').setData({ type: 'FeatureCollection', features: [] });
            mapInstance2.current.getSource('spider-points').setData({ type: 'FeatureCollection', features: [] });
          }
        });

        // Click outside clears spiderfy ring
        mapInstance2.current.on('click', (e) => {
          const features = mapInstance2.current.queryRenderedFeatures(e.point, { layers: ['clusters-2', 'spider-points-layer', 'unclustered-point', 'unclustered-action-symbol-2'] });
          if (features.length === 0) {
            if (mapInstance2.current.getSource('spider-legs')) {
              mapInstance2.current.getSource('spider-legs').setData({ type: 'FeatureCollection', features: [] });
              mapInstance2.current.getSource('spider-points').setData({ type: 'FeatureCollection', features: [] });
            }
          }
        });

        // Click handler for Spiderfy Points
        mapInstance2.current.on('click', 'spider-points-layer', async (e) => {
          const props = e.features[0].properties;
          const targetId = props.dp_id || props.id;

          // GOOGLE TIER: Optimistic UI - open panel instantly, fill data when ready
          setIsLoadingIssue(true);
          setSelectedIssue(null);
          setActiveTab('problem');

          try {
            const response = await fetch(`${API_BASE}/api/point/${targetId}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            setSelectedIssue(data);
          } catch (err) {
            console.error('[SamaajData] Failed to fetch spiderfy point:', err);
            setActiveTab('home');
          } finally {
            setIsLoadingIssue(false);
          }
        });

        const pointerEnters = () => { mapInstance2.current.getCanvas().style.cursor = 'pointer'; };
        const pointerLeaves = () => { mapInstance2.current.getCanvas().style.cursor = ''; };

        mapInstance2.current.on('mouseenter', 'unclustered-point', pointerEnters);
        mapInstance2.current.on('mouseleave', 'unclustered-point', pointerLeaves);
        mapInstance2.current.on('mouseenter', 'unclustered-action-symbol-2', pointerEnters);
        mapInstance2.current.on('mouseleave', 'unclustered-action-symbol-2', pointerLeaves);
        mapInstance2.current.on('mouseenter', 'clusters-2', pointerEnters);
        mapInstance2.current.on('mouseleave', 'clusters-2', pointerLeaves);
        mapInstance2.current.on('mouseenter', 'spider-points-layer', pointerEnters);
        mapInstance2.current.on('mouseleave', 'spider-points-layer', pointerLeaves);
     

        // moveend handled centrally
      });
    }

    if (!isComparing && mapInstance2.current) {
      mapInstance2.current.remove();
      mapInstance2.current = null;
    }
  }, [isComparing]); // activeFilters handled separately below

  // Sync Map 2 Filters — mirrors Map 1 split logic exactly (primary vs secondary, all action params)
  useEffect(() => {
    if (!mapInstance2.current || !mapInstance2.current.isStyleLoaded()) return;
    const source = mapInstance2.current.getSource('samaaj_points');
    if (!source) return;

    const primaryFilters = activeFilters.filter(f => PRIMARY_FILTERS.includes(f));
    const actionDomainFilters = activeFilters.filter(f => SECONDARY_FILTERS.includes(f));
    const effectiveActionCat = actionDomainFilters.length > 0 ? actionDomainFilters[0] : activeAreaActionFilter;

    const isActionOnlyView = primaryFilters.length === 0 && (
      effectiveActionCat !== 'All Categories' ||
      activeAreaActionTypeFilter !== 'All Types' ||
      activeAreaTopicFilter !== 'All Topics'
    );
    const filtersParam = primaryFilters.length > 0
      ? primaryFilters.join(',')
      : isActionOnlyView ? 'none' : 'all';

    let newTilesUrl = `${API_BASE}/api/tiles/{z}/{x}/{y}?category=${encodeURIComponent(filtersParam)}&v=${Date.now()}`;
    if (effectiveActionCat !== 'All Categories') newTilesUrl += `&actionCat=${encodeURIComponent(effectiveActionCat)}`;
    if (activeAreaActionTypeFilter !== 'All Types') newTilesUrl += `&actionType=${encodeURIComponent(activeAreaActionTypeFilter)}`;
    if (activeAreaTopicFilter !== 'All Topics') newTilesUrl += `&topic=${encodeURIComponent(activeAreaTopicFilter)}`;

    // GOOGLE TIER: setTiles() — surgical URL swap, zero layer disruption (same fix as Map 1)
    source.setTiles([newTilesUrl]);

  }, [activeFilters, activeAreaActionFilter, activeAreaActionTypeFilter, activeAreaTopicFilter]);

  // Centralized Context Syncing (Ninjas & Area Issues)
  useEffect(() => {
    const updateGlobalContext = () => {
      // Extract Centers for Geocoders
      const centers = {
        A: mapInstance.current ? mapInstance.current.getCenter() : null,
        B: mapInstance2.current ? mapInstance2.current.getCenter() : null
      };
      setMapCenters({
        A: centers.A ? { lat: centers.A.lat, lng: centers.A.lng } : null,
        B: centers.B ? { lat: centers.B.lat, lng: centers.B.lng } : null
      });

      // NOTE: Ninja detection has been moved into fetchRegionData below.
      // queryRenderedFeatures was broken at city-level zoom — ninjas were
      // clustered into the 95k/49k bubbles and never returned as unclustered.
      // The new /api/tiles/ninjas/viewport endpoint fixes this at all zoom levels.

      const fetchRegionData = async (mapRef, regionKey) => {
        if (!mapRef) return;
        let bounds;
        try { bounds = mapRef.getBounds(); } catch (e) { return; }
        if (!bounds) return;

        const w = bounds.getWest();
        const s = bounds.getSouth();
        const e = bounds.getEast();
        const n = bounds.getNorth();

        try {
          const visibleIssuesMap = new Map();
          if (mapRef.getSource('samaaj_points') && mapRef.isStyleLoaded()) {
            const pointFeatures = mapRef.queryRenderedFeatures({ layers: ['unclustered-point'] });
            pointFeatures.forEach(f => {
              const id = f.properties.id || f.properties.dp_id || `pt_${Math.random()}`;
              if (!visibleIssuesMap.has(id)) {
                visibleIssuesMap.set(id, {
                  id: id,
                  category: f.properties.category || 'Mock Issues',
                  subcategory: f.properties.subcategory || f.properties.type || 'Incidents',
                  type: f.properties.type || f.properties.subcategory || 'Incidents',
                  latitude: f.geometry.coordinates[1],
                  longitude: f.geometry.coordinates[0],
                  count: 1
                });
              }
            });
          }

          const res = await fetch(`${API_BASE}/api/tiles/bounds?west=${w}&south=${s}&east=${e}&north=${n}`);
          const data = await res.json();

          if (data && data.counts) {
              Object.entries(data.counts).forEach(([categoryType, count], i) => {
                  let unclusteredCount = 0;
                  visibleIssuesMap.forEach(v => {
                      if (v.subcategory === categoryType || v.type === categoryType) unclusteredCount++;
                  });
                  const clusterCount = count - unclusteredCount;
                  if (clusterCount > 0) {
                      const clusterId = `bounds_agg_${i}_${categoryType}`;
                      visibleIssuesMap.set(clusterId, {
                          id: clusterId,
                          category: 'Cluster Aggregate',
                          subcategory: categoryType,
                          type: categoryType,
                          count: clusterCount
                      });
                  }
              });
          }

          const regionState = {
              issues: Array.from(visibleIssuesMap.values()),
              actions: data.actions || [],
              counts: data.counts || {},
              total: data.total || 0,
              filters: data.filters || { categories: [], actionTypes: [], topics: [] }
          };

          if (regionKey === 'A') setRegionAData(regionState);
          else setRegionBData(regionState);

          if ((isComparing && activeViewport === regionKey) || (!isComparing && regionKey === 'A')) {
              setActiveAreaIssues(regionState.issues);
              setActiveAreaActions(regionState.actions);
              setActiveActionFiltersList(regionState.filters);
              // Update viewport counts so primary filter buttons reflect current data availability
              // Maps filterCategory values to counts for the primary filter buttons
              const vc = data.counts || {};
              // Health dataset has subcategory='Health' but category='Water' — merge both keys
              // so both 'Health' and 'Water' buttons can check availability
              setViewportCounts({
                ...vc,
                // dataset id=3: subcategory=Health maps to both filter names
                'Health': (vc['Health'] || 0),
                'Water':  (vc['Health'] || 0), // same dataset, Water button = Health subcategory data
                'Trees':  (vc['Trees']  || 0),
                'Toilets':(vc['Toilets']|| 0),
              });

              // NINJA FIX: Use dedicated /api/tiles/ninjas/viewport endpoint instead of
              // queryRenderedFeatures which was broken at city zoom (ninjas all clustered,
              // never returned as unclustered-point features). This endpoint scans the
              // in-memory R-Tree and works at ALL zoom levels.
              try {
                const ninjaRes = await fetch(`${API_BASE}/api/tiles/ninjas/viewport?west=${w}&south=${s}&east=${e}&north=${n}`);
                const ninjaData = await ninjaRes.json();
                const visibleNinjas = (ninjaData.ninjas || []).map(n => ({
                  id:   n.id,
                  name: n.name || `Ninja #${String(n.id).slice(-4)}`,
                  org:  n.organization || '',
                }));
                setActiveNinjas(visibleNinjas);
              } catch (ninjaErr) {
                console.error('[SamaajData] Ninja viewport fetch failed:', ninjaErr);
              }
          }
        } catch (err) {
          console.error("Bounds API Error:", err);
        }
      };

      fetchRegionData(mapInstance.current, 'A');
      if (isComparing) fetchRegionData(mapInstance2.current, 'B');
    };

    updateGlobalContext();

    const onMoveEnd = () => updateGlobalContext();

    if (mapInstance.current) {
      mapInstance.current.on('moveend', onMoveEnd);
      mapInstance.current.on('idle', onMoveEnd);
    }
    if (mapInstance2.current) {
      mapInstance2.current.on('moveend', onMoveEnd);
      mapInstance2.current.on('idle', onMoveEnd);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.off('moveend', onMoveEnd);
        mapInstance.current.off('idle', onMoveEnd);
      }
      if (mapInstance2.current) {
        mapInstance2.current.off('moveend', onMoveEnd);
        mapInstance2.current.off('idle', onMoveEnd);
      }
    };
  }, [isComparing, activeViewport, activeFilters]);

  // Click-outside handler for the Ninja dropdown
  useEffect(() => {
    if (!ninjaDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (ninjaDropdownRef.current && !ninjaDropdownRef.current.contains(e.target)) {
        setNinjaDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ninjaDropdownOpen]);


  const panToRegion = (lat, lng, target = 'A') => {
    const map = target === 'B' ? mapInstance2.current : mapInstance.current;
    if (map) {
      // MapLibre flyTo syntax: center is [lng, lat] (longitude first)
      map.flyTo({
        center: [lng, lat],
        zoom: 16,
        duration: 1500
      });
    }
  };

  const getMapCenter = (target = 'A') => {
    const map = target === 'B' ? mapInstance2.current : mapInstance.current;
    if (map) {
      const center = map.getCenter();
      return { lat: center.lat, lng: center.lng };
    }
    return null;
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0A0A0A] overflow-hidden font-sans antialiased select-none text-white">
      {/* --- TOP BAR --- */}
      <nav className="h-[72px] px-6 flex items-center justify-between border-b border-zinc-800 bg-[#0A0A0A] z-[2000]">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-black tracking-tighter text-white">SamaajData</h1>
        </div>

        <div className="flex-1 max-w-2xl mx-12">
          <div className="relative flex flex-col z-[3000]">
            <div className="relative flex items-center h-10 bg-zinc-900 border border-zinc-800 rounded-lg focus-within:border-zinc-600 focus-within:bg-zinc-800 transition-colors">
              {/* City Dropdown Button */}
              <div className="relative h-full flex items-center border-r border-zinc-800">
                <button
                  onClick={() => setShowCityDropdown(!showCityDropdown)}
                  className="flex items-center gap-1.5 px-4 h-full text-[13px] font-medium text-zinc-300 hover:text-white transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {selectedCity.name}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* City Dropdown Menu */}
                <AnimatePresence>
                  {showCityDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute top-full left-0 mt-2 w-48 bg-[#121212] border border-zinc-800 rounded-lg shadow-2xl overflow-hidden py-1 z-[4000]"
                    >
                      {CITIES.map((city) => (
                        <button
                          key={city.name}
                          onClick={() => handleCitySelect(city)}
                          className="w-full px-4 py-2 text-left text-[13px] text-zinc-300 hover:bg-zinc-800/50 hover:text-white flex items-center justify-between transition-colors"
                        >
                          {city.name}
                          {selectedCity.name === city.name && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Search Input */}
              <div className="relative flex-1 h-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  value={searchQuery}
                  onChange={handleSearchInput}
                  onFocus={() => { if (searchResults.length > 0) setShowSearchDropdown(true) }}
                  onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                  placeholder="Search by names, contact or location"
                  className="w-full h-full bg-transparent pl-10 pr-4 text-[13px] text-zinc-200 focus:outline-none placeholder:text-zinc-500"
                />
                {isSearching && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" strokeWidth={3} />
                )}
              </div>
            </div>

            <AnimatePresence>
              {showSearchDropdown && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-[#121212] border border-zinc-800 rounded-lg shadow-2xl overflow-hidden py-1 max-h-64 overflow-y-auto [&::-webkit-scrollbar]:hidden"
                >
                  {searchResults.map((res, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectLocation(res)}
                      className="px-4 py-2.5 hover:bg-zinc-800/50 cursor-pointer flex flex-col gap-0.5 border-b border-zinc-800/50 last:border-0 transition-colors"
                    >
                      <span className="text-[13px] font-medium text-zinc-200 truncate">{res.display_name.split(',')[0]}</span>
                      <span className="text-[11px] text-zinc-500 truncate">{res.display_name.split(',').slice(1).join(',')}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-8">
          {/* ── NINJA AVATAR STRIP (Google Docs style) ── */}
          <div className="relative flex items-center justify-end gap-3" ref={ninjaDropdownRef}>
            {/* Label */}
            <div className="flex flex-col items-end hidden sm:flex pr-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest leading-none">Active Ninjas</span>
              </div>
              <AnimatePresence mode="wait">
                <motion.span
                  key={isComparing ? activeViewport : 'none'}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="text-[10px] text-zinc-500 font-medium leading-none"
                >
                  {isComparing ? `In Region ${activeViewport}` : 'In current viewport'}
                </motion.span>
              </AnimatePresence>
            </div>

            {/* Avatar stack — clicking ANY avatar or +N opens the dropdown */}
            <button
              onClick={() => setNinjaDropdownOpen(v => !v)}
              className="flex -space-x-3 items-center focus:outline-none"
              aria-label="View active ninjas"
            >
              <AnimatePresence mode="popLayout">
                {activeNinjas.length === 0 ? (
                  // Empty placeholder ring when no ninjas in viewport
                  <motion.div
                    key="empty-ring"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="w-10 h-10 rounded-full border-2 border-dashed border-zinc-700 flex items-center justify-center bg-zinc-900"
                    title="No ninjas in current viewport"
                  >
                    <Users className="w-4 h-4 text-zinc-600" />
                  </motion.div>
                ) : (
                  <>
                    {activeNinjas.slice(0, 4).map((ninja, idx) => (
                      <motion.div
                        key={ninja.id}
                        layout
                        whileHover={{ y: -4, scale: 1.08, zIndex: 100 }}
                        className="relative cursor-pointer"
                        style={{ zIndex: 10 - idx }}
                      >
                        <div className="ring-[2.5px] ring-[#0A0A0A] rounded-full">
                          <NinjaAvatar id={ninja.id} name={ninja.name} size="sm" />
                        </div>
                      </motion.div>
                    ))}
                    {activeNinjas.length > 4 && (
                      <motion.div
                        key="extra-avatars"
                        layout
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ y: -4, scale: 1.08, zIndex: 100 }}
                        className="relative z-[90] w-10 h-10 rounded-full ring-[2.5px] ring-[#0A0A0A] bg-zinc-800 border border-zinc-700 flex items-center justify-center cursor-pointer hover:bg-zinc-700 transition-colors"
                      >
                        <span className="text-xs font-bold text-zinc-300">+{activeNinjas.length - 4}</span>
                      </motion.div>
                    )}
                  </>
                )}
              </AnimatePresence>
            </button>

            {/* ── NINJA DROPDOWN PANEL ── */}
            <AnimatePresence>
              {ninjaDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="absolute top-[calc(100%+12px)] right-0 w-[300px] bg-[#121212] border border-zinc-800 rounded-2xl shadow-2xl z-[2500] overflow-hidden"
                  // Close on click outside via useEffect below
                >
                  {/* Header */}
                  <div className="px-5 pt-4 pb-3 border-b border-zinc-800/80 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Field Ninjas</p>
                      <p className="text-[13px] font-semibold text-white mt-0.5">
                        {activeNinjas.length} Active {isComparing ? `in Region ${activeViewport}` : 'in Viewport'}
                      </p>
                    </div>
                    <button
                      onClick={() => setNinjaDropdownOpen(false)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Roster List */}
                  <div className="max-h-[320px] overflow-y-auto [&::-webkit-scrollbar]:hidden py-2">
                    {activeNinjas.length === 0 ? (
                      <div className="py-8 flex flex-col items-center gap-3 text-center px-6">
                        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                          <Users className="w-5 h-5 text-zinc-600" />
                        </div>
                        <p className="text-sm text-zinc-500">No ninjas in current map view.</p>
                        <p className="text-xs text-zinc-600">Pan or zoom out to find active field agents.</p>
                      </div>
                    ) : (
                      activeNinjas.map((ninja, idx) => {
                        const org = ninja.org && ninja.org !== '' ? ninja.org : null;
                        return (
                          <motion.div
                            key={ninja.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-900/60 transition-colors group"
                          >
                            {/* Initial Avatar */}
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0 select-none"
                              style={{ backgroundColor: getNinjaColor(ninja.id) }}
                            >
                              {getNinjaInitial(ninja.name)}
                            </div>
                            {/* Info — no coordinates */}
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-zinc-100 truncate leading-tight">
                                {ninja.name || `Field Agent #${String(ninja.id).slice(-4)}`}
                              </p>
                              {org && (
                                <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-medium">{org}</p>
                              )}
                            </div>
                            {/* Live indicator dot */}
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </motion.div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-3 border-t border-zinc-800/80">
                    <p className="text-[10px] text-zinc-600 font-medium">
                      Field coordinates are not shared to protect privacy.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-6 w-[1px] bg-zinc-800" />

          {isLoggedIn ? (
            <motion.button
              onClick={() => setActiveTab('profile')}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 pl-2 pr-4 py-1.5 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer shadow-sm hover:shadow-md"
            >
              <img
                src="https://i.pravatar.cc/150?u=admin_arjun"
                alt="Profile"
                className="w-7 h-7 rounded-full border border-zinc-700 object-cover"
              />
              <span className="text-xs font-bold text-zinc-300 tracking-wide">
                Arjun Kumar
              </span>
            </motion.button>
          ) : (
            <motion.button
              onClick={() => setShowLogin(true)}
              className="px-9 py-2.5 bg-white text-black text-sm font-bold rounded-full flex items-center gap-2 hover:bg-zinc-200 transition-all"
            >
              Login <ChevronRight className="w-4 h-4" strokeWidth={3} />
            </motion.button>
          )}
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        {/* --- THIN SIDEBAR (GLOBAL NAVIGATION) --- */}
        <aside className="relative w-[64px] border-r border-zinc-800 bg-[#0A0A0A] flex flex-col items-center py-6 gap-8 z-[2000] shrink-0">
          <div className="flex flex-col gap-6 items-center">
            <button
              onClick={() => setActiveTab('area')}
              className={`p-2 rounded-lg transition-colors relative group ${activeTab === 'area' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <MapIcon className="w-5 h-5" />
              <span className="absolute left-full ml-4 px-2 py-1 bg-zinc-800 text-white text-xs font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[3000]">
                Explore Map
              </span>
            </button>
            <button
              onClick={() => setActiveTab('problem')}
              className={`p-2 rounded-lg transition-colors relative group ${activeTab === 'problem' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <AlertCircle className="w-5 h-5" />
              <span className="absolute left-full ml-4 px-2 py-1 bg-zinc-800 text-white text-xs font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[3000]">
                Reported Issues
              </span>
            </button>

            <button
              onClick={() => setActiveTab('assistant')}
              className={`p-2 rounded-lg transition-colors relative group ${activeTab === 'assistant' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'text-zinc-500 hover:text-emerald-400/80 hover:bg-emerald-500/5'}`}
            >
              <Sparkles className="w-5 h-5" />
              <span className="absolute left-full ml-4 px-2 py-1 bg-zinc-800 text-white text-xs font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[3000]">
                AI Assistant
              </span>
            </button>
            <div className="w-8 h-px bg-zinc-800 my-2" />
            <button
              onClick={() => setActiveTab('home')}
              className={`p-2 rounded-lg transition-colors relative group ${activeTab === 'home' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Info className="w-5 h-5" />
              <span className="absolute left-full ml-4 px-2 py-1 bg-zinc-800 text-white text-xs font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[3000]">
                About SamaajData
              </span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`p-2 rounded-lg transition-colors relative group ${activeTab === 'profile' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Settings className="w-5 h-5" />
              <span className="absolute left-full ml-4 px-2 py-1 bg-zinc-800 text-white text-xs font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[3000]">
                Settings & Profile
              </span>
            </button>
          </div>
        </aside>

        {/* --- LEFT COLUMN PANEL --- */}
        <section className="w-[380px] border-r border-zinc-800 bg-[#121212] flex flex-col z-[1000] shrink-0 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div
                key="tab-home"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="p-8 flex flex-col gap-6 h-full overflow-y-auto absolute inset-0"
              >
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                  <Info className="w-5 h-5 text-zinc-300" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-zinc-100 mb-2">Welcome to SamaajData</h2>
                  <p className="text-sm text-zinc-400 leading-relaxed font-normal">
                    Samaaj Data exists in service of citizens who choose to act. When a person decides to fix the potholes on their street, map a garbage dump, or understand flooding in their neighbourhood, they need more than intent, they need data, community, and solutions. Samaaj Data equips them with these essentials so that civic and climate action can begin anywhere, by anyone.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'area' && (
              <AreaIntelligence 
                activeAreaIssues={activeAreaIssues}
                activeAreaActions={activeAreaActions}
                activeActionFiltersList={activeActionFiltersList}
                regionAData={regionAData}
                regionBData={regionBData}
                impactFilter={activeAreaActionFilter}
                setImpactFilter={setActiveAreaActionFilter}
                actionTypeFilter={activeAreaActionTypeFilter}
                setActionTypeFilter={setActiveAreaActionTypeFilter}
                ISSUE_CONFIG={ISSUE_CONFIG}
                setActiveFilters={setActiveFilters}
                panToRegion={(lat, lng, region = 'A') => {
                  const targetMap = region === 'B' ? mapInstance2.current : mapInstance.current;
                  if (targetMap) {
                    targetMap.flyTo({ center: [lng, lat], zoom: 16, duration: 1500 });
                  }
                }}
                getMapCenter={(region = 'A') => {
                  const targetMap = region === 'B' ? mapInstance2.current : mapInstance.current;
                  return targetMap ? targetMap.getCenter() : null;
                }}
                mapCenters={mapCenters}
                onVerifyIssue={handleVerifyIssue}
                resolvedIssueIds={resolvedIssueIds}
                isComparing={isComparing}
                setIsComparing={setIsComparing}
                onIssueSelect={async (id) => {
                  setActiveTab('problem');
                  try {
                    const response = await fetch(`${API_BASE}/api/point/${id}`);
                    if (response.ok) {
                      const data = await response.json();
                      setSelectedIssue(data);
                    }
                  } catch (err) {
                    console.error("Failed to fetch point data", err);
                  }
                }}
              />
            )}

            {activeTab === 'problem' && !selectedIssue && !isLoadingIssue && (
              <motion.div
                key="tab-problem-empty"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="p-8 flex flex-col items-center justify-center h-full text-center absolute inset-0"
              >
                <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6">
                  <AlertCircle className="w-6 h-6 text-zinc-600" />
                </div>
                <h2 className="text-lg font-medium text-zinc-300 mb-2">No Issue Selected</h2>
                <p className="text-sm text-zinc-500 leading-relaxed max-w-[240px]">
                  Select an active incident pin on the map to view detailed reports and initiate resolution protocols.
                </p>
              </motion.div>
            )}

            {/* GOOGLE TIER: Optimistic Skeleton Loader — appears the millisecond user clicks a marker */}
            {activeTab === 'problem' && isLoadingIssue && !selectedIssue && (
              <motion.div
                key="tab-problem-skeleton"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col h-full absolute inset-0 bg-[#121212] z-10 overflow-hidden"
              >
                {/* Skeleton Image */}
                <div className="w-full h-64 bg-zinc-900 shrink-0 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 animate-[shimmer_1.5s_ease-in-out_infinite]" style={{ backgroundSize: '200% 100%' }} />
                  {/* Loading indicator overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-white animate-spin opacity-60" />
                  </div>
                </div>
                {/* Skeleton Content */}
                <div className="p-6 flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <div className="h-7 w-3/4 bg-zinc-800 rounded-lg animate-pulse" />
                    <div className="h-4 w-full bg-zinc-900 rounded-lg animate-pulse" />
                    <div className="h-4 w-2/3 bg-zinc-900 rounded-lg animate-pulse" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-20 bg-zinc-900/60 border border-zinc-800 rounded-2xl animate-pulse" />
                    <div className="h-20 bg-zinc-900/60 border border-zinc-800 rounded-2xl animate-pulse" />
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="h-4 w-1/2 bg-zinc-900 rounded animate-pulse" />
                    <div className="h-16 bg-zinc-900/40 border border-emerald-900/20 rounded-2xl animate-pulse" />
                    <div className="h-16 bg-zinc-900/40 border border-indigo-900/20 rounded-2xl animate-pulse" />
                    <div className="h-16 bg-zinc-900/40 border border-amber-900/20 rounded-2xl animate-pulse" />
                  </div>
                </div>
                <style>{`
                  @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                  }
                `}</style>
              </motion.div>
            )}

            {activeTab === 'problem' && selectedIssue && (
              <ActionEngine
                selectedIssue={selectedIssue}
                closeCard={() => {
                  setSelectedIssue(null);
                  setActiveTab('area');
                }}
                ISSUE_CONFIG={ISSUE_CONFIG}
                onActionComplete={(id) => setResolvedIssueIds(prev => [...prev, id])}
              />
            )}



            {activeTab === 'assistant' && (
              <CivicAssistant
                initialQuery={pendingQuery}
                onQueryConsumed={handleAssistantQueryConsumed}
              />
            )}

            {activeTab === 'profile' && (
              <UserProfile />
            )}
          </AnimatePresence>
        </section>

        {/* --- MAP ENGINE (Dual WebGL Architecture) --- */}
        <div className="flex-1 relative bg-[#0A0A0A] z-0 flex" style={{ width: '100%', height: '100%' }}>
          
          {/* Primary Viewport (Map 1) */}
          <motion.div 
            className="relative h-full"
            onMouseEnter={() => setActiveViewport('A')}
            animate={{ width: isComparing ? '50%' : '100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.5, ease: "easeInOut" }}
          >
            <div ref={mapRef} className="absolute inset-0 z-0" style={{ width: '100%', height: '100%', display: 'block' }} />
            
            {/* Primary Viewport Badge (only visible in comparison mode) */}
            <AnimatePresence>
              {isComparing && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-white shadow-2xl z-[400] pointer-events-none"
                >
                  <span className="text-xs font-black tracking-widest uppercase text-black">Region A</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Secondary Viewport (Map 2) */}
          <AnimatePresence>
            {isComparing && (
              <motion.div 
                initial={{ width: '0%', opacity: 0 }}
                animate={{ width: '50%', opacity: 1 }}
                exit={{ width: '0%', opacity: 0 }}
                transition={{ type: 'spring', bounce: 0, duration: 0.5, ease: "easeInOut" }}
                onMouseEnter={() => setActiveViewport('B')}
                className="relative h-full flex-shrink-0 bg-[#0A0A0A]"
              >
                {/* Thick Divider with Compare Icon */}
                <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-white z-[500] pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-2xl">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3"/><path d="m15 9 6-6"/></svg>
                  </div>
                </div>

                <div ref={mapRef2} className="absolute inset-0 z-0" style={{ width: '100%', height: '100%', display: 'block' }} />
                
                {/* Secondary Viewport Badge */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-white shadow-2xl z-[400] pointer-events-none">
                  <span className="text-xs font-black tracking-widest uppercase text-black">Region B</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Map Filters Overlay — z-[600] ensures dropdown outranks OmniSearch */}
          <div className="absolute top-6 left-6 z-[600] flex items-center gap-2">
          {PRIMARY_FILTERS.map((filter) => {
              // A filter is "available" if it has data in the current viewport OR is already active
              // Maps filter button name → filterCategory key in viewportCounts
              // 'Water' button maps to 'Health' key because dataset id=3 has subcategory='Health' but category='Water'
              const countKey = filter === 'Water' ? 'Health' : filter;
              const hasDataInViewport = Object.keys(viewportCounts).length === 0 || (viewportCounts[countKey] || 0) > 0;
              const isActive = activeFilters.includes(filter);
              const isUnavailable = !hasDataInViewport && !isActive;
              return (
                <button
                  key={filter}
                  onClick={() => !isUnavailable && toggleFilter(filter)}
                  title={isUnavailable ? `No ${filter} data in current map view` : `Filter: ${filter}`}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                    isActive
                      ? 'bg-zinc-100 text-zinc-900 border-zinc-100 shadow-md'
                      : isUnavailable
                        ? 'bg-black/40 backdrop-blur-md text-zinc-600 border-zinc-800 cursor-not-allowed'
                        : 'bg-black/80 backdrop-blur-md text-zinc-300 border-zinc-700 hover:border-zinc-500 hover:bg-black'
                  }`}
                >
                  {filter}
                </button>
              );
            })}

            <div className="relative">
              <button
                onClick={() => { setDropdownOpen(!dropdownOpen); setFilterSearchQuery(''); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                  activeFilters.some(f => SECONDARY_FILTERS.includes(f)) || dropdownOpen
                    ? 'bg-zinc-800 text-zinc-100 border-zinc-600'
                    : 'bg-black/80 backdrop-blur-md text-zinc-300 border-zinc-700 hover:border-zinc-500 hover:bg-black'
                }`}
              >
                {activeFilters.filter(f => SECONDARY_FILTERS.includes(f)).length > 0
                  ? `More (${activeFilters.filter(f => SECONDARY_FILTERS.includes(f)).length})`
                  : 'More'}
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 left-0 w-[300px] max-h-[560px] bg-[#121212] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-[700] flex flex-col"
                  >
                    {/* Search Input */}
                    <div className="px-3 pt-3 pb-2">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700">
                        <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <input
                          autoFocus
                          type="text"
                          value={filterSearchQuery}
                          onChange={e => setFilterSearchQuery(e.target.value)}
                          placeholder="Search filters..."
                          className="w-full bg-transparent text-sm text-zinc-200 placeholder-zinc-500 outline-none"
                        />
                        {filterSearchQuery && (
                          <button onClick={() => setFilterSearchQuery('')}>
                            <X className="w-3 h-3 text-zinc-500 hover:text-zinc-300" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ── Section 1: CIVIC DOMAINS ── */}
                    <div className="px-3 py-1.5 flex items-center gap-2">
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Civic Domains</span>
                      {activeFilters.filter(f => SECONDARY_FILTERS.includes(f)).length > 0 && (
                        <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 rounded-full">
                          {activeFilters.filter(f => SECONDARY_FILTERS.includes(f)).length} active
                        </span>
                      )}
                    </div>
                    <div className="max-h-48 overflow-y-auto pb-1 [&::-webkit-scrollbar]:hidden">
                      {SECONDARY_FILTERS
                        .filter(f => f.toLowerCase().includes(filterSearchQuery.toLowerCase()))
                        .map(filter => {
                          const isActive = activeFilters.includes(filter);
                          const cfg = ISSUE_CONFIG[filter];
                          const IconComp = cfg?.icon;
                          return (
                            <button
                              key={filter}
                              onClick={() => toggleFilter(filter)}
                              className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors group ${
                                isActive
                                  ? 'bg-zinc-800 text-white'
                                  : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {IconComp && (
                                  <span style={{ color: cfg?.color || '#71717a' }}>
                                    <IconComp className="w-3.5 h-3.5 shrink-0" />
                                  </span>
                                )}
                                <span className="truncate text-xs font-medium">{filter}</span>
                              </div>
                              {isActive && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                            </button>
                          );
                        })
                      }
                      {SECONDARY_FILTERS.filter(f => f.toLowerCase().includes(filterSearchQuery.toLowerCase())).length === 0 && (
                        <p className="px-4 py-2 text-xs text-zinc-600 italic">No domains match</p>
                      )}
                    </div>

                    {/* ── Section 2: ACTION TOPICS ── */}
                    {(activeActionFiltersList.topics || []).length > 0 && (
                      <>
                        <div className="px-3 py-1.5 flex items-center gap-2 border-t border-zinc-800">
                          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Action Topics in View</span>
                          {activeAreaTopicFilter !== 'All Topics' && (
                            <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 px-1.5 rounded-full">1 active</span>
                          )}
                        </div>
                        <div className="max-h-44 overflow-y-auto pb-1 [&::-webkit-scrollbar]:hidden">
                          {(activeActionFiltersList.topics || [])
                            .filter(t => t.toLowerCase().includes(filterSearchQuery.toLowerCase()))
                            .map(topic => {
                              const isTopicActive = activeAreaTopicFilter === topic;
                              return (
                                <button
                                  key={topic}
                                  onClick={() => {
                                    setActiveAreaTopicFilter(isTopicActive ? 'All Topics' : topic);
                                    setDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-4 py-2 flex items-center justify-between gap-3 transition-colors ${
                                    isTopicActive
                                      ? 'bg-purple-500/10 text-purple-300'
                                      : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-white'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Zap className="w-3 h-3 shrink-0 text-purple-500/60" />
                                    <span className="truncate text-xs">{topic}</span>
                                  </div>
                                  {isTopicActive && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                                </button>
                              );
                            })
                          }
                          {(activeActionFiltersList.topics || []).filter(t => t.toLowerCase().includes(filterSearchQuery.toLowerCase())).length === 0 && filterSearchQuery && (
                            <p className="px-4 py-2 text-xs text-zinc-600 italic">No topics match</p>
                          )}
                        </div>
                      </>
                    )}

                    {/* Footer: active count + clear */}
                    {(activeFilters.some(f => SECONDARY_FILTERS.includes(f)) || activeAreaTopicFilter !== 'All Topics') && (
                      <div className="px-4 py-2.5 border-t border-zinc-800 flex items-center justify-between">
                        <span className="text-xs text-zinc-500">
                          {activeFilters.filter(f => SECONDARY_FILTERS.includes(f)).length > 0 && `${activeFilters.filter(f => SECONDARY_FILTERS.includes(f)).length} domain${activeFilters.filter(f => SECONDARY_FILTERS.includes(f)).length > 1 ? 's' : ''}`}
                          {activeAreaTopicFilter !== 'All Topics' && `${activeFilters.some(f => SECONDARY_FILTERS.includes(f)) ? ' · ' : ''}1 topic`}
                        </span>
                        <button
                          onClick={() => {
                            setActiveFilters(prev => prev.filter(f => !SECONDARY_FILTERS.includes(f)));
                            setActiveAreaTopicFilter('All Topics');
                          }}
                          className="text-xs text-zinc-400 hover:text-white transition-colors font-medium"
                        >
                          Clear all
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>


          <AnimatePresence>
            {/* OmniSearch hidden when filter dropdown is open — avoids all stacking context fights */}
            {activeTab !== 'assistant' && !isComparing && !dropdownOpen && (
              <OmniSearch
                cityName={selectedCity?.name}
                issueCount={activeAreaIssues.length}
                viewportCounts={viewportCounts}
                onExpand={() => {
                  setPendingQuery('');
                  setActiveTab('assistant');
                }}
                onSend={(query) => {
                  setPendingQuery(query);
                  setActiveTab('assistant');
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 text-white px-6 py-3 rounded-full shadow-2xl z-[4000] flex items-center gap-3"
          >
            <Lock className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-medium">{toastMessage}</span>
            <button
              onClick={() => {
                setToastMessage(null);
                setShowLogin(true);
              }}
              className="ml-2 text-blue-400 font-bold text-sm hover:text-blue-300 uppercase tracking-widest"
            >
              Login
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- ENTERPRISE LOGIN MODAL --- */}
      <AnimatePresence>
        {showLogin && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-[420px] bg-[#0c0c0c] border border-zinc-800 rounded-[32px] p-10 shadow-2xl relative"
            >
              <button
                onClick={() => setShowLogin(false)}
                className="absolute top-8 right-8 text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center mb-8 text-center">
                <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center mb-5">
                  <div className="w-5 h-5 bg-zinc-100 rounded-sm" />
                </div>
                <h2 className="text-2xl font-medium mb-1">
                  Welcome Back
                </h2>
                <p className="text-zinc-400 text-sm">
                  Login to SamaajData
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsLoggedIn(true);
                  setShowLogin(false);
                }}
                className="space-y-4"
              >
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="text"
                    placeholder="Email address"
                    className="w-full h-14 bg-black border border-zinc-800 rounded-2xl pl-12 text-sm focus:border-zinc-500 outline-none"
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="password"
                    placeholder="Password"
                    className="w-full h-14 bg-black border border-zinc-800 rounded-2xl pl-12 text-sm focus:border-zinc-500 outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full h-14 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-transform"
                >
                  Login
                </button>
              </form>

              <div className="relative h-px bg-zinc-800 my-10 flex items-center justify-center">
                <span className="bg-[#0c0c0c] px-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                  or continue with
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  'M11.5 3c-4.7 0-8.5 3.8-8.5 8.5s3.8 8.5 8.5 8.5h4v-3h-4c-3 0-5.5-2.5-5.5-5.5s2.5-5.5 5.5-5.5h4v-3h-4z', // Apple Sim
                  'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z', // Chrome Sim
                  'M18.2 3H21l-6.1 7 7.2 9h-5.7l-4.5-5.9-5.1 5.9H4l6.5-7.5L3.6 3h5.8l4 5.3 4.8-5.3z', // X Sim
                ].map((path, i) => (
                  <button
                    key={i}
                    className="h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center hover:bg-zinc-800 transition-all"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-zinc-400">
                      <path d={path} />
                    </svg>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pop {
          from { transform: scale(0) translateY(20px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-pop { animation: pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .custom-pin { pointer-events: none !important; }

        /* --- PREMIUM SCROLLBAR --- */
        ::-webkit-scrollbar {
          width: 5px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #27272a; /* zinc-800 */
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #3f3f46; /* zinc-700 */
        }
      `}</style>
    </div>
  );
}
