import { parseBonsCommande, parseSuiviCmd, readExcelFile } from './dataProcessor';
import { getBonsCommandeApi, getSuiviCmdApi } from './apiSource';

const MODE = import.meta.env.VITE_DATA_SOURCE; // 'excel' ou 'api'

export async function getBonsCommande(file) {
  if (MODE === 'api') return getBonsCommandeApi();
  const wb = await readExcelFile(file);
  return parseBonsCommande(wb);
}

export async function getSuiviCmd(file) {
  if (MODE === 'api') return getSuiviCmdApi();
  const wb = await readExcelFile(file);
  return parseSuiviCmd(wb);
}