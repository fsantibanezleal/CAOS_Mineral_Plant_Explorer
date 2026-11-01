import { Figure } from '@fasl-work/caos-app-shell';
import { FlowFigure } from './figures';
import { useT } from './bi';
export const bi=(en:string,es:string)=>({en,es});
export function PlantFlow(){const t=useT();return <Figure caption={t('One asset identity connects geometry, observations and evidence.','Una identidad de equipo conecta geometría, observaciones y evidencia.')}><FlowFigure label={t('Connected plant evidence','Evidencia de planta conectada')} stages={[t('Asset graph','Grafo de equipos'),t('Quality and time','Calidad y tiempo'),t('State models','Modelos de estado'),t('3D and diagram','3D y diagrama')]}/></Figure>;}
