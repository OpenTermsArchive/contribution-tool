import {
  GetContributeServiceResponse,
  PostContributeServiceResponse,
} from 'modules/Common/interfaces';
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';

import HttpStatusCode from 'http-status-codes';
import ServiceManager from 'modules/Common/managers/ServiceManager';
import dayjs from 'dayjs';
import { downloadUrl } from 'modules/Scraper/utils/downloader';
import fs from 'fs';
import getConfig from 'next/config';
import { getLatestFailDate } from 'modules/Github/api';


function isPrivateAddress(checkUrl: string): boolean {
   // The ipv4PrivatePattern matches private IPv4 addresses. These ranges are coming from RFC 1918, which defines private IPv4 address ranges:
  // - 10.0.0.0 - 10.255.255.255
  // - 172.16.0.0 - 172.31.255.255
  // - 192.168.0.0 - 192.168.255.255
  const ipv4PrivatePattern: RegExp = /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3})$/;
  // The ipv6PrivatePattern matches private IPv6 addresses. These ranges are coming from RFC 4193, which defines Unique Local IPv6 Unicast Addresses:
  // - fc00::/7
  // - fd00::/8
  // Additionally, it includes the loopback and unspecified addresses (::1 and ::) and the link-local addresses (fe80::/10).
  const ipv6PrivatePattern: RegExp = /^(?:[fF][cCdD]|[fF]{3}(?::[0-9a-fA-F]{1,4}){1,2}|(?:2001:)?[dD][bB][aA][8-9]::|(?:2001:)?[dD][bB][cCdD]:|(?:(?:[fF]{3}(?::[0-9a-fA-F]{1,4}){1,2})?::)?[0-9a-fA-F]{1,4}:(?:[fF]{3}(?::[0-9a-fA-F]{1,4}){1,2})?)$/;

  // Extract the hostname from the URL
  let hostname: string;
  try {
    const urlObj: URL = new URL(checkUrl);
    hostname = urlObj.hostname;
  } catch (err) {
    return false;
  }

  return (ipv4PrivatePattern.test(hostname) || ipv6PrivatePattern.test(hostname) || hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "0.0.0.0");
}

const { serverRuntimeConfig } = getConfig();

const get =
  (
    json: any,
    { acceptLanguage = 'en', bypassCookies }: { acceptLanguage: string; bypassCookies: boolean }
  ) =>
  async (_: NextApiRequest, res: NextApiResponse<GetContributeServiceResponse>) => {
    try {
      if (json.combine) {
        res.statusCode = HttpStatusCode.OK;
        res.json({
          status: 'ko',
          url: '',
          error: 'Sorry but multipage is not supported yet',
        });
        return res;
      }

      if (json.hasOwnProperty("fetch")) {
        const url = json.fetch;
        if (isPrivateAddress(url)) {
          res.statusCode = HttpStatusCode.OK;
          res.json({
            status: 'ko',
            message: 'Could not download url',
            url: '',
	    error: "URL seems to be a private address and has been blocked"
          });
          return res;
        }
      }

      const downloadResult = await downloadUrl(json, {
        folderDirPath: serverRuntimeConfig.scrapedFilesFolder,
        newUrlDirPath: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}${
          serverRuntimeConfig.scrapedIframeUrl
        }`,
        acceptLanguage,
        bypassCookies,
      });

      const { url: newUrl, isPDF, snapshotUrl } = downloadResult;

      res.statusCode = HttpStatusCode.OK;
      res.json({
        status: 'ok',
        message: 'OK',
        url: newUrl,
        isPDF,
        snapshotUrl,
      });
      return res;
    } catch (e: any) {
      console.error(e);
      res.statusCode = HttpStatusCode.OK;
      res.json({
        status: 'ko',
        message: 'Could not download url',
        url: '',
        error: e.toString(),
      });
      return res;
    }
  };

const saveHistoryFile = async ({
  historyFullPath,
  serviceName,
  declarationsRepo,
  documentType,
  existingJson,
}: {
  historyFullPath: string;
  serviceName: string;
  existingJson: any;
  declarationsRepo: string;
  documentType: string;
}) => {
  if (!fs.existsSync(historyFullPath)) {
    fs.writeFileSync(historyFullPath, '{}');
  }

  let historyJson = JSON.parse(fs.readFileSync(historyFullPath, 'utf8'));

  const [githubOrganization, githubRepository] = (declarationsRepo || '')?.split('/');

  const commonParams = {
    owner: githubOrganization,
    repo: githubRepository,
    accept: 'application/vnd.github.v3+json',
  };
  let lastFailingDate: any;

  try {
    ({ lastFailingDate } = await getLatestFailDate({
      ...commonParams,
      serviceName,
      documentType,
    }));
  } catch (e) {}

  const newHistoryJson = {
    ...historyJson,
    [documentType]: [
      {
        ...existingJson.terms[documentType],
        validUntil: lastFailingDate ? dayjs(lastFailingDate).format() : 'to-be-determined',
      },
      ...(historyJson[documentType] || []),
    ],
  };
  fs.writeFileSync(historyFullPath, `${JSON.stringify(newHistoryJson, null, 2)}\n`);
};

const saveOnLocal =
  (data: string, path: string, declarationsRepo: string) =>
  async (_: NextApiRequest, res: NextApiResponse<any>) => {
    try {
      let json = JSON.parse(data);
      const documentType = Object.keys(json.terms)[0];
      const sanitizedName = json.name.replace(/[^\p{L}\.\s\d]/gimu, '');
      const fullPath = `${path}/${sanitizedName}.json`;
      const historyFullPath = `${path}/${sanitizedName}.history.json`;

      if (fs.existsSync(fullPath)) {
        const existingJson = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        await saveHistoryFile({
          declarationsRepo,
          serviceName: sanitizedName,
          documentType,
          historyFullPath,
          existingJson,
        });
        json = {
          ...existingJson,
          terms: { ...existingJson.terms, [documentType]: json.terms[documentType] },
        };
      }

      fs.writeFileSync(fullPath, `${JSON.stringify(json, null, 2)}\n`);

      res.json({
        status: 'ok',
        message: `File saved`,
        path: fullPath,
      });
    } catch (e: any) {
      res.statusCode = HttpStatusCode.METHOD_FAILURE;
      res.json({
        status: 'ko',
        message: 'Could not download url',
        error: e.toString(),
      });
      return res;
    }

    return res;
  };

const addOrUpdate =
  (body: any) => async (_: NextApiRequest, res: NextApiResponse<PostContributeServiceResponse>) => {
    try {
      const serviceManager = new ServiceManager({
        destination: body?.destination,
        name: body?.name,
        type: body?.documentType,
        author: {
          name: body?.contributorName,
          email: body?.contributorEmail,
        },
      });
      const service: any = await serviceManager.addOrUpdateService({
        json: body?.json,
        url: body?.url,
      });
      return res.json({
        status: 'ok',
        message: `PR available on Github`,
        url: service?.html_url,
      });
    } catch (e: any) {
      let message = e.toString();
      if (e?.response?.data?.message === 'Reference already exists') {
        message = `A branch with this name already exists on ${body?.destination}`;
      } else {
        console.error(e);
      }

      res.json({
        status: 'ko',
        message,
        error: e.toString(),
      });
      return res;
    }
  };

const services = async (req: NextApiRequest, res: NextApiResponse) => {
  const { body, query } = req;
  if (req.method === 'GET' && query?.json) {
    try {
      const json = JSON.parse(query.json as string);
      return get(json, {
        acceptLanguage: query.acceptLanguage as string,
        bypassCookies: (query.bypassCookies as string) === 'true' ? true : false,
      })(req, res);
    } catch (e: any) {
      res.statusCode = HttpStatusCode.METHOD_FAILURE;
      res.json({ status: 'ko', message: 'Error occured', error: e.toString() });
      return;
    }
  }

  if (req.method === 'POST' && body?.json) {
    return addOrUpdate(body)(req, res);
  }

  if (req.method === 'POST' && body?.data) {
    return saveOnLocal(
      body?.data as string,
      body?.path as string,
      body?.destination as string
    )(req, res);
  }

  res.statusCode = HttpStatusCode.FORBIDDEN;
  res.json({ status: 'ko', message: 'Nothing there' });
};

export default services;
