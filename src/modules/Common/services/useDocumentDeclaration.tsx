import type { OTAJson, OTAPageDeclaration } from 'modules/Common/services/open-terms-archive';
import useUrl from 'hooks/useUrl';
import React from 'react';
import useSwr from 'swr';
import { GetServiceFilesResponse } from 'modules/Common/interfaces';

type PageArrayField = 'select' | 'remove';
type PageBooleanField = 'executeClientScripts';
type DocumentDeclarationStringField = 'name' | 'documentType';
type PageStringField = 'fetch';

const formatJSONfields = (json: OTAJson) => {
  const documentType = Object.keys(json.documents)[0];
  const page = json.documents[documentType];

  const select = page?.select ? (Array.isArray(page.select) ? page.select : [page.select]) : null;
  const remove = page?.remove ? (Array.isArray(page.remove) ? page.remove : [page.remove]) : null;

  return {
    name: json.name?.trim(),
    documents: documentType
      ? {
          [documentType]: {
            fetch: page?.fetch?.trim(),
            ...(select && select.length > 0 ? { select } : {}),
            ...(remove && remove.length > 0 ? { remove } : {}),
            ...(page?.extract && page?.extract.length ? { extract: page.extract } : {}),
            ...(page?.executeClientScripts
              ? { executeClientScripts: page.executeClientScripts }
              : {}),
            ...(page?.combine ? { combine: page.combine } : {}),
          },
        }
      : {},
  };
};

const parseCssSelector = (cssSelector: string) => {
  try {
    return JSON.parse(cssSelector);
  } catch (e) {
    return cssSelector;
  }
};

const createDeclarationFromQueryParams = (queryParams: any) => {
  const { url, selectedCss, removedCss, executeClientScripts, documentType, name, json } =
    queryParams;

  let declaration = {
    name: '?',
    documents: {},
  } as OTAJson;

  if (json) {
    declaration = JSON.parse(json);
  } else if (url) {
    // Support old URLs created by Open Terms Archive in GitHub issues
    declaration = {
      name,
      documents: {
        [documentType]: {
          fetch: url,
          executeClientScripts,
          select:
            typeof selectedCss === 'string'
              ? [selectedCss]
              : (selectedCss || []).map(parseCssSelector),
          remove:
            typeof removedCss === 'string'
              ? [removedCss]
              : (removedCss || []).map(parseCssSelector),
        },
      },
    };
  }

  return formatJSONfields(declaration);
};

/**
 * As a bug was introduced in OTA core, GitHub issues are created with a
 * `url=undefined` query param
 * In this case this function will fetch the full data from GitHub
 */
const useDeclarationFromQueryParams = () => {
  const { queryParams, pushQueryParams } = useUrl();
  const { destination, url, name, documentType, json, commit } = queryParams;
  const [latestData, setLatestData] = React.useState<GetServiceFilesResponse>();

  const shouldFetchOriginalDeclaration = url === 'undefined' || commit;

  const searchParams = new URLSearchParams(
    shouldFetchOriginalDeclaration
      ? {
          destination,
          name,
          documentType,
          ...(commit ? { commitURL: commit } : {}),
        }
      : {}
  );

  const { data } = useSwr<GetServiceFilesResponse>(
    shouldFetchOriginalDeclaration ? `/api/services/files?${searchParams}` : null
  );

  React.useEffect(() => {
    if (!data || !data.declaration) {
      return;
    }

    setLatestData(data);
  }, [data]);

  React.useEffect(() => {
    if (latestData) {
      pushQueryParams({
        ...queryParams,
        destination: latestData.destination,
        json: JSON.stringify(latestData.declaration),
        selectedCss: undefined,
        removedCss: undefined,
        url: undefined,
        name: undefined,
        documentType: undefined,
        commit: undefined,
      });
      setLatestData(undefined);
    }
  }, [queryParams, latestData, setLatestData]);

  const loading = shouldFetchOriginalDeclaration && !data && !json && !latestData;

  const declaration = !shouldFetchOriginalDeclaration
    ? createDeclarationFromQueryParams(queryParams)
    : latestData?.declaration
    ? formatJSONfields(latestData?.declaration)
    : undefined;

  return {
    loading,
    latestDeclaration: latestData?.declaration,
    declaration,
  };
};

const useDocumentDeclaration = () => {
  const { queryParams, pushQueryParam, pushQueryParams } = useUrl();

  const { loading, latestDeclaration, declaration } = useDeclarationFromQueryParams();

  const [document] = Object.entries(declaration?.documents || {}) || [[]];
  const [documentType, page] = document || [];

  const updateString = (field: PageStringField) => (value: string) => {
    (declaration as OTAJson).documents[documentType][field] = value.trim();
    pushQueryParam('json')(JSON.stringify(declaration));
  };

  const updateBoolean = (field: PageBooleanField) => (value?: boolean) => {
    if (value) {
      (declaration as OTAJson).documents[documentType][field] = value;
    } else {
      delete (declaration as OTAJson).documents[documentType][field];
    }
    pushQueryParam('json')(JSON.stringify(declaration));
  };

  const updateArray =
    (type: 'add' | 'update' | 'delete') =>
    (field: PageArrayField, index?: number) =>
    (value?: string) => {
      let pageField = page[field];
      if (!pageField) pageField = [];
      if (typeof pageField === 'string') {
        pageField = [pageField];
      }

      if (type === 'add' && value) {
        pageField = [...pageField, value];
      }
      if (type === 'delete' && typeof index === 'number') {
        delete pageField[index];
      }
      if (type === 'update' && typeof index === 'number') {
        try {
          pageField[index] = JSON.parse(value as any);
        } catch (e) {
          if (value) {
            pageField[index] = value;
          } else {
            delete pageField[index];
          }
        }
      }

      pageField = (pageField || []).filter(Boolean);
      (declaration as OTAJson).documents[documentType][field] = pageField;

      pushQueryParam('json')(JSON.stringify(declaration));
    };

  const onDocumentDeclarationUpdate =
    (field: DocumentDeclarationStringField) => (value?: string) => {
      if (!value) {
        return;
      }
      if (field === 'documentType') {
        (declaration as OTAJson).documents = { [value]: page };
      } else {
        (declaration as OTAJson)[field] = value;
      }
      pushQueryParam('json')(JSON.stringify(declaration));
    };

  const onPageDeclarationUpdate =
    (type: 'add' | 'update' | 'delete') =>
    (field: keyof OTAPageDeclaration, index?: number) =>
    (value?: string | boolean) => {
      if (Array.isArray(page[field]) || ['select', 'remove'].includes(field)) {
        updateArray(type)(field as PageArrayField, index)(value as string);
      } else if (typeof value === 'boolean') {
        updateBoolean(field as PageBooleanField)(value as boolean);
      } else if (typeof value === 'string') {
        updateString(field as PageStringField)(value as string);
      }

      // Reset page declaration when url is a PDF
      if (field === 'fetch' && typeof value === 'string' && value?.endsWith('.pdf')) {
        delete (declaration as OTAJson).documents[documentType].select;
        delete (declaration as OTAJson).documents[documentType].remove;
        delete (declaration as OTAJson).documents[documentType].extract;
        delete (declaration as OTAJson).documents[documentType].executeClientScripts;
        pushQueryParam('json')(JSON.stringify(declaration));
      }
    };

  React.useEffect(() => {
    if (!queryParams.json && page?.fetch && !latestDeclaration && !loading) {
      pushQueryParams({
        ...queryParams,
        json: JSON.stringify(declaration),
        selectedCss: undefined,
        removedCss: undefined,
        url: undefined,
        name: undefined,
        documentType: undefined,
        commit: undefined,
      });
    }
  }, [declaration, queryParams.json, latestDeclaration, loading]);

  return {
    loading,
    declaration,
    page,
    documentType,
    onDocumentDeclarationUpdate,
    onPageDeclarationUpdate,
  };
};

export default useDocumentDeclaration;
