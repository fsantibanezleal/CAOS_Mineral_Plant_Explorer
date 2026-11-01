import type { Asset, Plant, Stream } from '../lib/contract.types';

export type AreaId = 'mine-extraction' | 'crushing-stockpiling' | 'grinding' | 'flotation' | 'leach-sx-ew' | 'thickening-filtration' | 'water-balance' | 'tailings' | 'utilities';
export type PlantScope = 'global' | AreaId;

export function scopedRecords<T extends { asset_id: string }>(records: readonly T[], scope: PlantScope, assetIds: readonly string[]): T[] {
  if (scope === 'global') return [...records];
  const included = new Set(assetIds);
  return records.filter((record) => included.has(record.asset_id));
}

export interface PlantArea {
  id: AreaId;
  name: { en: string; es: string };
  purpose: { en: string; es: string };
  assetIds: string[];
  anchor: [number, number];
  color: string;
}

export const PLANT_AREAS: PlantArea[] = [
  { id: 'mine-extraction', name: { en: 'Mine extraction', es: 'Extracción minera' }, purpose: { en: 'Ore source and haulage to the ROM stockpile', es: 'Origen y transporte de mineral al acopio ROM' }, assetIds: ['PIT', 'SHV', 'TRK'], anchor: [-116, -4], color: '#d88b4a' },
  { id: 'crushing-stockpiling', name: { en: 'Crushing & stockpiling', es: 'Chancado y acopio' }, purpose: { en: 'ROM storage, crushing, screening and mill-feed transfer', es: 'Acopio ROM, chancado, harneo y transferencia a molienda' }, assetIds: ['ROM', 'CV1', 'CR1', 'SC1', 'CR2'], anchor: [-48, -5], color: '#cf9a55' },
  { id: 'grinding', name: { en: 'Grinding', es: 'Molienda' }, purpose: { en: 'SAG/ball milling, classification and circulating load', es: 'Molienda SAG/bolas, clasificación y carga circulante' }, assetIds: ['BIN', 'SAG', 'BAL', 'PU1', 'CY1', 'MOT'], anchor: [0, 5], color: '#b7925c' },
  { id: 'flotation', name: { en: 'Flotation', es: 'Flotación' }, purpose: { en: 'Rougher/cleaner separation, regrind and product split', es: 'Separación rougher/cleaner, remolienda y división de productos' }, assetIds: ['FL1', 'FL2', 'RGM'], anchor: [40, -12], color: '#4b9e9b' },
  { id: 'leach-sx-ew', name: { en: 'Leaching · SX/EW', es: 'Lixiviación · SX/EW' }, purpose: { en: 'Oxide leach, solution, solvent extraction and electrowinning', es: 'Lixiviación de óxidos, solución, extracción por solventes y electroobtención' }, assetIds: ['HEP', 'LCH', 'PLS', 'SX1', 'SX2', 'EW1', 'CAT', 'RAF'], anchor: [13, 42], color: '#4b91a9' },
  { id: 'thickening-filtration', name: { en: 'Thickening & filtration', es: 'Espesamiento y filtrado' }, purpose: { en: 'Concentrate/tailings dewatering and water-reclaim boundaries', es: 'Desaguado de concentrado/relaves y límites de recuperación de agua' }, assetIds: ['CTH', 'FIL', 'CON'], anchor: [89, -5], color: '#669c87' },
  { id: 'water-balance', name: { en: 'Water balance', es: 'Balance de agua' }, purpose: { en: 'Fresh water, distribution, process use, solution and reclaim flows', es: 'Agua fresca, distribución, uso de proceso, soluciones y recuperación' }, assetIds: [], anchor: [45, 20], color: '#3e9fba' },
  { id: 'tailings', name: { en: 'Tailings', es: 'Relaves' }, purpose: { en: 'Tailings thickening, facility and observation context', es: 'Espesamiento de relaves, depósito y contexto de observación' }, assetIds: ['TTH', 'TSF', 'MON'], anchor: [112, -40], color: '#887d70' },
  { id: 'utilities', name: { en: 'Utilities', es: 'Servicios' }, purpose: { en: 'Power, water return and acid services', es: 'Energía, retorno de agua y servicios de ácido' }, assetIds: ['PU2', 'PWT', 'MWT', 'ACD', 'SUB'], anchor: [62, -40], color: '#8292a2' },
];

export interface AreaModel {
  scope: PlantScope;
  area: PlantArea | null;
  coreAssets: Asset[];
  contextAssets: Asset[];
  assets: Asset[];
  streams: Stream[];
  internalStreams: Stream[];
  incoming: Stream[];
  outgoing: Stream[];
}

export interface WaterRoute {
  id: string;
  sourceArea: AreaId;
  targetArea: AreaId;
  water_m3_h: number;
  streamIds: string[];
}

export function aggregateWaterRoutes(plant: Plant): WaterRoute[] {
  const stageArea = (assetId: string): AreaId | null => {
    const asset = plant.assets.find((item) => item.id === assetId);
    return asset ? PLANT_AREAS.find((area) => area.assetIds.includes(asset.id))?.id ?? null : null;
  };
  const routes = new Map<string, WaterRoute>();
  for (const stream of plant.streams.filter((item) => (item.water_m3_h ?? 0) > 0)) {
    const sourceArea = stageArea(stream.source), targetArea = stageArea(stream.target);
    if (!sourceArea || !targetArea) continue;
    const id = `${sourceArea}->${targetArea}`;
    const route = routes.get(id) ?? { id, sourceArea, targetArea, water_m3_h: 0, streamIds: [] };
    route.water_m3_h += stream.water_m3_h ?? 0;
    route.streamIds.push(stream.id);
    routes.set(id, route);
  }
  return [...routes.values()].sort((a, b) => a.sourceArea.localeCompare(b.sourceArea) || a.targetArea.localeCompare(b.targetArea));
}

export function buildAreaModel(plant: Plant, scope: PlantScope): AreaModel {
  const area = scope === 'global' ? null : PLANT_AREAS.find((item) => item.id === scope) ?? null;
  if (scope !== 'global' && !area) throw new Error(`Unknown plant area: ${scope}`);
  let coreAssets = scope === 'global'
    ? plant.assets
    : plant.assets.filter((asset) => area!.assetIds.includes(asset.id));

  if (scope === 'water-balance') {
    const waterStreams = plant.streams.filter((stream) => (stream.water_m3_h ?? 0) > 0);
    const ids = new Set(waterStreams.flatMap((stream) => [stream.source, stream.target]));
    coreAssets = plant.assets.filter((asset) => ids.has(asset.id));
  }

  const coreIds = new Set(coreAssets.map((asset) => asset.id));
  const streams = scope === 'global'
    ? plant.streams
    : scope === 'water-balance'
      ? plant.streams.filter((stream) => (stream.water_m3_h ?? 0) > 0)
      : plant.streams.filter((stream) => coreIds.has(stream.source) || coreIds.has(stream.target));
  const internalStreams = streams.filter((stream) => coreIds.has(stream.source) && coreIds.has(stream.target));
  const incoming = streams.filter((stream) => !coreIds.has(stream.source) && coreIds.has(stream.target));
  const outgoing = streams.filter((stream) => coreIds.has(stream.source) && !coreIds.has(stream.target));
  const contextIds = new Set(streams.flatMap((stream) => [stream.source, stream.target]).filter((id) => !coreIds.has(id)));
  const contextAssets = plant.assets.filter((asset) => contextIds.has(asset.id));
  const allIds = new Set([...coreIds, ...contextIds]);
  const assets = plant.assets.filter((asset) => allIds.has(asset.id));
  return { scope, area, coreAssets, contextAssets, assets, streams, internalStreams, incoming, outgoing };
}

export function areaForAsset(plant: Plant, assetId: string): AreaId | null {
  const asset = plant.assets.find((item) => item.id === assetId);
  if (!asset) return null;
  return PLANT_AREAS.find((area) => area.assetIds.includes(asset.id))?.id ?? null;
}

