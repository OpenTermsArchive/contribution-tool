import fetch, { launchHeadlessBrowser, stopHeadlessBrowser } from '@opentermsarchive/engine/fetch';
import extract from '@opentermsarchive/engine/extract';
import SourceDocument from '@opentermsarchive/engine/sourceDocument';
import { cleanStringForFileSystem } from 'utils/filesystem';

export interface OTARangeSelector {
  startBefore?: string;
  endBefore?: string;
  startAfter?: string;
  endAfter?: string;
}

export type OTASelector = string | OTARangeSelector;
export interface OTAJson {
  name: string;
  terms: {
    [key: string]: OTAPageDeclaration;
  };
}
interface OTASnapshot {
  content: string;
  mimeType: string;
}

export interface OTAPageDeclaration {
  fetch: string;
  select?: string | OTASelector[];
  remove?: string | OTASelector[];
  executeClientScripts?: boolean;
  extract?: string[];
  combine?: OTAPageDeclaration[];
}

type OTAVersion = string;

export interface Snapshot {
  content: string;
  mimeType: string;
  pageDeclaration: OTAPageDeclaration;
}

export const getSnapshot = async (
  pageDeclaration: OTAPageDeclaration,
  config: any
): Promise<Snapshot> => {
  await launchHeadlessBrowser();
  const { content, mimeType }: OTASnapshot = await fetch({
    url: pageDeclaration.fetch,
    executeClientScripts: pageDeclaration.executeClientScripts,
    cssSelectors: [
      ...SourceDocument.extractCssSelectorsFromProperty(pageDeclaration.select),
      ...SourceDocument.extractCssSelectorsFromProperty(pageDeclaration.remove),
    ].filter(Boolean),
    config: { ...{ navigationTimeout: 30000, language: 'en', waitForElementsTimeout: 10000 }, ...config },
  });
  await stopHeadlessBrowser();

  return {
    content,
    mimeType,
    pageDeclaration,
  };
};

export const getVersionFromSnapshot = async ({ content, mimeType, pageDeclaration }: Snapshot) => {
  const version: OTAVersion = await extract({
    content,
    mimeType,
    pageDeclaration: {
      location: pageDeclaration.fetch,
      contentSelectors: pageDeclaration.select,
      noiseSelectors: pageDeclaration.remove,
    },
  });

  return {
    version,
    snapshot: content,
    mimeType,
  };
};

export const getVersion = async (pageDeclaration: OTAPageDeclaration, config: any) => {
  const snapshot = await getSnapshot(pageDeclaration, config);

  return getVersionFromSnapshot(snapshot);
};

// In case executeClientScripts is true, ota snapshot fetcher will wait
// for selector to be found on the page. The resulting snapshot will be
// different each time a new selector is added.
// This is the same if language changes
export const generateFolderName = (
  { fetch, select, executeClientScripts }: OTAPageDeclaration,
  additionalParameter?: string
) => {
  const MAX_FOLDER_CHARACTERS = 256;
  const urlString = cleanStringForFileSystem(fetch.replace(/http?s:\/\//, ''));
  const selectString = select
    ? `_${SourceDocument.extractCssSelectorsFromProperty(select).filter(Boolean)}`
    : '';
  const fullDomParameters = executeClientScripts ? `1_${selectString}` : '0';
  const additionalParameters = additionalParameter || '';

  const downloadParameters = `_${[fullDomParameters, additionalParameters]
    .filter(Boolean)
    .map(cleanStringForFileSystem)
    .join('_')}`;

  const leftCharactersForUrl = MAX_FOLDER_CHARACTERS - downloadParameters.length;

  return `${urlString.substring(0, leftCharactersForUrl - 1)}${downloadParameters}`;
};

export const launchBrowser = launchHeadlessBrowser;
export const stopBrowser = stopHeadlessBrowser;
