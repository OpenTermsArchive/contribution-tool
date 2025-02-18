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
    [key: string]: OTATermsDeclaration;
  };
}
interface OTASnapshot {
  content: string;
  mimeType: string;
  declaration: OTATermsDeclaration;
}

export interface OTATermsDeclaration {
  fetch: string;
  select?: string | OTASelector[];
  remove?: string | OTASelector[];
  executeClientScripts?: boolean;
  extract?: string[];
  combine?: OTATermsDeclaration[];
}

type OTAVersion = string;


export const getSnapshot = async (
  declaration: OTATermsDeclaration,
  config: any
): Promise<OTASnapshot> => {
  await launchHeadlessBrowser();
  const { content, mimeType }: OTASnapshot = await fetch({
    url: declaration.fetch,
    executeClientScripts: declaration.executeClientScripts,
    cssSelectors: [
      ...SourceDocument.extractCssSelectorsFromProperty(declaration.select),
      ...SourceDocument.extractCssSelectorsFromProperty(declaration.remove),
    ].filter(Boolean),
    config: { ...{ navigationTimeout: 30000, language: 'en', waitForElementsTimeout: 10000 }, ...config },
  });
  await stopHeadlessBrowser();

  return {
    content,
    mimeType,
    declaration
  };
};

export const getVersionFromSnapshot = async ({ content, mimeType, declaration }: OTASnapshot) => {
  const version: OTAVersion = await extract({
    content,
    mimeType,
    location: declaration.fetch,
    contentSelectors: declaration.select,
    noiseSelectors: declaration.remove,
  });

  return {
    version,
    snapshot: content,
    mimeType,
  };
};

export const getVersion = async (declaration: OTATermsDeclaration, config: any) => {
  const snapshot = await getSnapshot(declaration, config);

  return getVersionFromSnapshot(snapshot);
};

// In case executeClientScripts is true, ota snapshot fetcher will wait
// for selector to be found on the page. The resulting snapshot will be
// different each time a new selector is added.
// This is the same if language changes
export const generateFolderName = (
  { fetch, select, executeClientScripts }: OTATermsDeclaration,
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
