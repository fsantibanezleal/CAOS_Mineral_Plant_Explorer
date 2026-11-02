import type { Asset } from '../lib/contract.types';
import type { ReactNode } from 'react';

/** Original vector equipment marks for the authored reference plant. */
export function EquipmentGlyph({ asset, compact = false, schematic = false }: { asset: Asset; compact?: boolean; schematic?: boolean }) {
  const c = 'currentColor';
  const stroke = { fill: 'none', stroke: c, strokeWidth: 2.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const kind = asset.kind;
  let drawing: ReactNode;
  if (kind === 'mill') drawing = <>
    <path {...stroke} d="M14 18h11m0 0v28m0-28 9-7h26l13 8v26l-13 8H34l-9-7"/><path {...stroke} d="M34 19v26m28-26v26M39 23l5 5-5 5 5 5-5 5m13-20 5 5-5 5 5 5-5 5"/><circle {...stroke} cx="22" cy="32" r="6"/><path {...stroke} d="M31 54h38m-31 0v5m24-5v5"/>
  </>;
  else if (kind === 'motor') drawing = <>
    <path {...stroke} d="M18 23h9v-7h36v7h9v26h-9v7H27v-7h-9zM15 36h3m53 0h8M28 22v28m6-28v28m6-28v28m6-28v28m6-28v28m6-28v28"/><circle {...stroke} cx="49" cy="36" r="9"/><path {...stroke} d="M45 36h8m12-17v-6"/>
  </>;
  else if (kind === 'crusher') drawing = <>
    <path {...stroke} d="M20 10h50l-7 14H27zM29 24l12 8-12 8 12 8-7 8h28l-8-8 8-8-8-8 8-8"/><path {...stroke} d="M15 58h60M34 18v-8m23 8v-8"/><path {...stroke} d="M37 32h20M37 40h20"/>
  </>;
  else if (kind === 'screen') drawing = <>
    <path {...stroke} d="m17 22 52-11 8 30-53 12zM24 53l-5 8m48-20 5 9M18 61h58"/>
    {[0,1,2,3,4,5].map(i=><path key={i} {...stroke} d={`m${25+i*8} ${25-i*1.65} 6 22`}/>)}
    <path {...stroke} d="m13 25 7-3m53 19 7-2"/>
  </>;
  else if (kind === 'pump') drawing = <>
    <path {...stroke} d="M15 32h12m0 0a17 17 0 1 0 34 0 17 17 0 1 0-34 0m34 0h12v-9h9v18h-9v-9"/><path {...stroke} d="M44 21l-8 11 9 1-5 10 12-14-9-1 4-7M21 49h36m-29 0v7m20-7v7"/>
  </>;
  else if (kind === 'flotation') drawing = <>
    {[22, 42, 62].map((x) => <g key={x}><path {...stroke} d={`M${x - 8} 25h16v27h-16zM${x - 8} 33h16M${x} 13v15m-5-5 5 5 5-5`}/><path {...stroke} d={`M${x - 6} 30q6-5 12 0`}/></g>)}<path {...stroke} d="M13 55h58M15 60h56"/>
  </>;
  else if (kind === 'thickener') drawing = <>
    <ellipse {...stroke} cx="45" cy="23" rx="29" ry="10"/><path {...stroke} d="M16 23v23c0 6 13 11 29 11s29-5 29-11V23M16 39c0 6 13 11 29 11s29-5 29-11M45 13v28M20 23h50M45 41l-17 8m17-8 17 8"/>
  </>;
  else if (kind === 'pond' || kind === 'tailings') drawing = <>
    <path {...stroke} d="m13 40 8-18h48l8 18-8 17H21zM18 40h54M24 34q9-7 18 0t18 0 10 0"/><path {...stroke} d="M27 57v5m36-5v5M18 62h54"/>
  </>;
  else if (kind === 'filter') drawing = <>
    <path {...stroke} d="M20 14h50v40H20zM25 22h40M25 30h40M25 38h40M25 46h40M31 14v40m14-40v40m14-40v40M15 58h60"/>
  </>;
  else if (kind === 'conveyor') drawing = <>
    <path {...stroke} d="M15 43 68 19l8 8-53 24zM24 49v8m39-35v8M32 37l-5-7m17 1-5-7m17 1-5-7"/><circle cx="20" cy="48" r="3" fill={c}/><circle cx="72" cy="25" r="3" fill={c}/>
  </>;
  else if (kind === 'truck' || kind === 'shovel') drawing = kind === 'truck' ? <>
    <path {...stroke} d="M12 38h43V19h15l12 14v16H12zM55 34h23M18 49a7 7 0 1 0 14 0 7 7 0 0 0-14 0m39 0a7 7 0 1 0 14 0 7 7 0 0 0-14 0M58 22v11h15"/>
  </> : <>
    <path {...stroke} d="M19 43h30l8 8H17zM28 43V24h17l5 19M43 24l17-11 7 3-14 16M67 16l13 8-10 8-8-4M20 54h38m-29 0v4m20-4v4"/>
  </>;
  else if (kind === 'cyclone') drawing = <>
    {[30, 45, 60].map((x) => <g key={x}><path {...stroke} d={`M${x - 7} 15h14v15l-7 18-7-18zM${x - 5} 21h10`}/><path {...stroke} d={`M${x} 48v8`}/></g>)}<path {...stroke} d="M20 15h50M18 59h54"/>
  </>;
  else if (kind === 'sx' || kind === 'electrowin') drawing = kind === 'sx' ? <>
    <path {...stroke} d="M14 18h29v37H14zM48 18h29v37H48zM14 28h29m5 10h29M20 23v28m6-28v28m6-28v28M54 23v28m6-28v28m6-28v28"/>
  </> : <>
    <path {...stroke} d="M15 17h60v40H15zM20 24h50M20 50h50"/>{[27,37,47,57,67].map((x) => <path key={x} {...stroke} d={`M${x} 26v22`}/>)}</>;
  else if (kind === 'heap' || kind === 'stockpile') drawing = <>
    <path {...stroke} d="M12 53q8-9 15-9 6-15 18-15 12-15 25-5 8 6 18 29zM14 58h70"/>
    {kind === 'heap' && <path {...stroke} d="M23 20v9m22-16v11m23-5v10M18 20h10m12-7h10m13 5h10"/>}
  </>;
  else if (kind === 'pit') drawing = <>
    <path {...stroke} d="M12 14h67l-7 9H20zm8 9 8 8h43m-43 0 8 8h28m-28 0 7 8h12m-27 8h49"/><circle cx="29" cy="58" r="3" fill={c}/><circle cx="67" cy="58" r="3" fill={c}/>
  </>;
  else if (kind === 'substation') drawing = <>
    <path {...stroke} d="M13 49h67M22 49V30h15v19m9 0V20h15v29m9 0V30h9v19M20 18h14m9-7h18m7 7h14M27 18v12m18-19v9m18-2v12"/>
    <path {...stroke} d="m49 27-6 9h7l-4 8 10-12h-7l4-5"/>
  </>;
  else if (kind === 'bin') drawing = <>
    <path {...stroke} d="M21 12h48v24l-8 12H29l-8-12zM21 20h48M29 48v9m32-9v9M16 60h58"/><path {...stroke} d="M37 12v11m16-11v11"/>
  </>;
  else if (kind === 'tank' || kind === 'sensor') drawing = <>
    <path {...stroke} d="M23 20q0-7 22-7t22 7v31q0 7-22 7t-22-7zM23 20q0 7 22 7t22-7M23 43q0 7 22 7t22-7M45 13V7m-26 54h52"/>
  </>;
  else drawing = <>
    <path {...stroke} d="M20 17h50v38H20zM27 26h36M27 34h36M27 42h24M15 60h60"/><circle {...stroke} cx="60" cy="46" r="7"/>
  </>;

  return <svg className={`ob-equipment-glyph${compact ? ' compact' : ''}`} x={schematic ? -45 : 0} y={schematic ? -52 : 0} width={compact ? 60 : 90} height={compact ? 45 : 68} viewBox="0 0 90 68" aria-hidden="true" data-kind={kind}>{drawing}</svg>;
}

