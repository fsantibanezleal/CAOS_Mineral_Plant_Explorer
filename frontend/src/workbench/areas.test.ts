import { describe, expect, it } from 'vitest';
import plant from '../../../data/derived/plant.json';
import type { Plant } from '../lib/contract.types';
import { aggregateWaterRoutes, buildAreaModel, PLANT_AREAS, scopedRecords } from './areas';

const typedPlant = plant as Plant;

describe('plant area model', () => {
  it('covers the named process areas and maps them to different graph content', () => {
    const ids = new Set(PLANT_AREAS.map((area) => area.id));
    for (const required of ['mine-extraction', 'crushing-stockpiling', 'grinding', 'flotation', 'leach-sx-ew', 'thickening-filtration', 'water-balance', 'tailings', 'utilities']) {
      expect(ids.has(required as never)).toBe(true);
    }
    const grinding = buildAreaModel(typedPlant, 'grinding');
    const flotation = buildAreaModel(typedPlant, 'flotation');
    expect(grinding.coreAssets.map((asset) => asset.id)).toContain('SAG');
    expect(grinding.coreAssets.map((asset) => asset.id)).not.toContain('FL1');
    expect(flotation.coreAssets.map((asset) => asset.id)).toContain('FL1');
    expect(flotation.coreAssets.map((asset) => asset.id)).not.toContain('SAG');
    expect(grinding.internalStreams.map((stream) => stream.id)).not.toEqual(flotation.internalStreams.map((stream) => stream.id));
  });

  it('adversarial: every required area has its own non-empty detail graph', () => {
    const areaSignatures = PLANT_AREAS.map((area) => {
      const model = buildAreaModel(typedPlant, area.id);
      expect(model.coreAssets.length, `${area.id} core equipment`).toBeGreaterThan(0);
      expect(model.assets.every((asset) => model.coreAssets.some((core) => core.id === asset.id) || model.contextAssets.some((context) => context.id === asset.id))).toBe(true);
      return `${model.coreAssets.map((asset) => asset.id).sort().join(',')}|${model.internalStreams.map((stream) => stream.id).sort().join(',')}`;
    });
    expect(new Set(areaSignatures).size).toBe(PLANT_AREAS.length);
    expect(buildAreaModel(typedPlant, 'water-balance').streams.length).toBeGreaterThan(0);
  });

  it('adversarial: assets cannot be duplicated or left outside area ownership', () => {
    const ownership = PLANT_AREAS.flatMap((area) => area.assetIds.map((assetId) => ({ area: area.id, assetId })));
    expect(ownership.map((item) => item.assetId).sort()).toEqual(typedPlant.assets.map((asset) => asset.id).sort());
    expect(new Set(ownership.map((item) => item.assetId)).size).toBe(typedPlant.assets.length);
    expect(PLANT_AREAS.find((area) => area.id === 'thickening-filtration')?.assetIds).toContain('CON');
    expect(PLANT_AREAS.find((area) => area.id === 'leach-sx-ew')?.assetIds).toContain('EW1');
    expect(PLANT_AREAS.find((area) => area.id === 'leach-sx-ew')?.assetIds).not.toContain('CON');
  });

  it('adversarial: neighboring equipment stays boundary context outside an area core', () => {
    const grinding = buildAreaModel(typedPlant, 'grinding');
    expect(grinding.coreAssets.length).toBeGreaterThan(0);
    expect(grinding.contextAssets.some((asset) => asset.id === 'FL1')).toBe(true);
    expect(grinding.assets.length).toBeLessThan(typedPlant.assets.length);
    expect(grinding.incoming.length + grinding.outgoing.length).toBeGreaterThan(0);
  });

  it('adversarial: slurry and solution water contributions cannot disappear from balance routes', () => {
    const water = buildAreaModel(typedPlant, 'water-balance');
    expect(water.streams.length).toBeGreaterThan(0);
    expect(water.streams.every((stream) => (stream.water_m3_h ?? 0) > 0)).toBe(true);
    expect(water.streams.some((stream) => stream.material === 'slurry')).toBe(true);
    expect(water.streams.every((stream) => stream.unit || typeof stream.water_m3_h === 'number')).toBe(true);
  });

  it('adversarial: an unknown area cannot silently resolve to the global graph', () => {
    expect(() => buildAreaModel(typedPlant, 'not-a-plant-area' as never)).toThrow('Unknown plant area');
  });

  it('aggregates water-bearing routes by process area without losing stream identity', () => {
    const routes = aggregateWaterRoutes(typedPlant);
    const freshToGrinding = routes.find((route) => route.sourceArea === 'utilities' && route.targetArea === 'grinding');
    expect(freshToGrinding?.water_m3_h).toBe(265);
    expect(freshToGrinding?.streamIds).toContain('S30');
    expect(routes.some((route) => route.sourceArea === 'flotation' && route.targetArea === 'thickening-filtration')).toBe(true);
  });

  it('keeps global and water area scopes semantically different', () => {
    const global = buildAreaModel(typedPlant, 'global');
    const water = buildAreaModel(typedPlant, 'water-balance');
    expect(global.assets).toHaveLength(typedPlant.assets.length);
    expect(global.streams).toHaveLength(typedPlant.streams.length);
    expect(water.streams.length).toBeLessThan(global.streams.length);
    expect(water.area?.id).toBe('water-balance');
  });

  it('adversarial: engine evidence and method-comparison channels stay inside the selected area', () => {
    const records = [{ asset_id: 'SAG', id: 'mill' }, { asset_id: 'FL1', id: 'rougher' }, { asset_id: 'FL2', id: 'cleaner' }];
    const flotationIds = buildAreaModel(typedPlant, 'flotation').coreAssets.map((asset) => asset.id);
    const waterIds = buildAreaModel(typedPlant, 'water-balance').coreAssets.map((asset) => asset.id);
    expect(scopedRecords(records, 'flotation', flotationIds).map((record) => record.asset_id)).toEqual(['FL1', 'FL2']);
    expect(scopedRecords(records, 'water-balance', waterIds)).toEqual(records);
    expect(scopedRecords(records, 'global', []).map((record) => record.asset_id)).toEqual(['SAG', 'FL1', 'FL2']);
  });
});

