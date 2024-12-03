import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import {
  GetContributeServiceResponse,
  PostContributeServiceResponse,
} from 'modules/Common/interfaces';
import { useEvent, useLocalStorage } from 'react-use';
import { MdClose as IconClose } from 'react-icons/md';

import Button from 'modules/Common/components/Button';
import Drawer from 'components/Drawer';
import { FiAlertTriangle as IconAlert } from 'react-icons/fi';
import IframeSelector from 'components/IframeSelector';
import SelectorButton from 'components/IframeSelector/SelectorButton';
import LinkIcon from 'modules/Common/components/LinkIcon';
import Loading from 'components/Loading';
import React from 'react';
import pick from 'lodash/fp/pick';
import api from 'utils/api';
import classNames from 'classnames';
import s from './service.module.css';
import useNotifier from 'hooks/useNotifier';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { useToggle, useKeyPressEvent } from 'react-use';
import useTranslation from 'next-translate/useTranslation';
import ServiceHelpDialog from 'modules/Common/components/ServiceHelpDialog';
import Version from 'modules/Common/data-components/Version';
import ContributorForm, { useContributor } from 'modules/Common/data-components/ContributorForm';
import useDocumentDeclaration from 'modules/Common/services/useDocumentDeclaration';
import useConfigDeclaration from 'modules/Common/hooks/useConfigDeclaration';
import { loadMdxFile, MdxPageProps } from 'modules/I18n/hoc/withMdx';

const EMAIL_SUPPORT = 'contribute@opentermsarchive.org';

type DocumentSelectableField = 'select' | 'remove';
type ConfigSelectableField = 'hidden';
type SelectableField = DocumentSelectableField | ConfigSelectableField;

export interface DocumentTypes {
  [key: string]: {
    obligee: string;
    topic: string;
    aliases?: string[];
    industries?: string[];
    references?: Record<string, string>;
  };
}

const ServicePage = ({
  documentTypes,
  contributorFormMdx,
}: {
  documentTypes: DocumentTypes;
  contributorFormMdx: MdxPageProps;
}) => {
  const router = useRouter();
  const { t } = useTranslation();
  const { notify } = useNotifier();
  // Version Modal
  const [isServiceHelpViewed, setServiceHelpViewed] = useLocalStorage(
    'serviceHelpDialogViewed',
    false
  );
  const {
    setEmail: setContributorEmail,
    setName: setContributorName,
  } = useContributor();

  const [modal, showModal] = React.useState<'version' | 'contributor' | undefined>();

  // UI interaction
  const [iframeSelectionField, toggleIframeSelectionField] = React.useState<SelectableField | ''>(
    ''
  );

  const [iframeReady, toggleIframeReady] = useToggle(false);
  const selectInIframe = (field: SelectableField) => () => toggleIframeSelectionField(field);
  const [loading, toggleLoading] = useToggle(false);

  // Declaration
  const {
    loading: loadingDocumentDeclaration,
    page,
    declaration,
    documentType,
    onPageDeclarationUpdate,
    onDocumentDeclarationUpdate,
  } = useDocumentDeclaration();

  const {
    destination,
    localPath,
    hiddenCssSelectors,
    onConfigInputChange,
    onHiddenCssSelectorsUpdate,
    expertMode,
    bypassCookies,
    acceptLanguage,
  } = useConfigDeclaration();

  const { fetch: url, executeClientScripts } = page || {};
  const selectCssSelectors = typeof page?.select === 'string' ? [page?.select] : page?.select || [];
  const removeCssSelectors = typeof page?.remove === 'string' ? [page?.remove] : page?.remove || [];

  // URL
  const commonUrlParams = `destination=${destination}${localPath ? `&localPath=${localPath}` : ''}`;
  let apiUrlParams = `json=${encodeURIComponent(
    JSON.stringify(
      executeClientScripts
        ? pick(['executeClientScripts', 'fetch', 'select', 'combine'])(page)
        : pick(['fetch', 'combine'])(page)
    )
  )}`;

  if (acceptLanguage) {
    apiUrlParams = `${apiUrlParams}&acceptLanguage=${encodeURIComponent(acceptLanguage)}`;
  }
  if (bypassCookies) {
    apiUrlParams = `${apiUrlParams}&bypassCookies=true`;
  }

  const { data, error: apiError } = useSWR<GetContributeServiceResponse>(
    declaration ? `/api/services?${apiUrlParams}` : null,
    {
      revalidateOnMount: true,
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  // Events
  useEvent('touchstart', () => router.push(`/sorry?${commonUrlParams}`));
  useKeyPressEvent('Escape', () => {
    showModal(undefined);
    toggleIframeSelectionField('');
  });

  const isPDF = url?.endsWith('.pdf') || data?.isPDF;
  const versionDisabled =
    (selectCssSelectors?.length === 0 && !isPDF) || (!iframeReady && !isPDF) || loading;
  const submitDisabled = versionDisabled || !declaration?.name;
  const isLoadingIframe = !data && !apiError;
  const error = data?.error || apiError?.toString();
  const versionsRepository = `https://github.com/${destination?.replace(
    '-declarations',
    '-versions'
  )}`;
  const snapshotsRepository = `https://github.com/${destination?.replace(
    '-declarations',
    '-snapshots'
  )}`;

  const onSelectInIframe = React.useCallback(
    (field: SelectableField) =>
      (cssPath: string = 'Unknown Selector') => {
        if (['select', 'remove'].includes(field)) {
          onPageDeclarationUpdate('add')(field as DocumentSelectableField)(cssPath);
        }
        if (field === 'hidden') {
          onHiddenCssSelectorsUpdate('add')()(cssPath);
        }
        toggleIframeSelectionField('');
      },
    [url, iframeSelectionField, toggleIframeSelectionField]
  );

  const onChangeCssRule = (field: SelectableField, i: number) => (newCssPath: string) => {
    if (['select', 'remove'].includes(field)) {
      onPageDeclarationUpdate('update')(field as DocumentSelectableField, i)(newCssPath);
    }
    if (field === 'hidden') {
      onHiddenCssSelectorsUpdate('update')(i)(newCssPath);
    }
  };

  const onDeleteCssRule = (field: SelectableField, i: number) => () => {
    if (['select', 'remove'].includes(field)) {
      onPageDeclarationUpdate('delete')(field as DocumentSelectableField, i)();
    }
    if (field === 'hidden') {
      onHiddenCssSelectorsUpdate('delete')(i)();
    }
  };

  const onVerifyVersion = async () => showModal('version');

  const onValidate = async (name: string, email: string) => {
    toggleLoading(true);
   
    try {
      const {
        data: { url, message },
      } = await api.post<PostContributeServiceResponse>('/api/services', {
        destination,
        json: declaration,
        name: declaration?.name,
        documentType: documentType,
        contributorName: name,
        contributorEmail: email,
        url: `${window.location.href}&expertMode=true`,
      });

      if (!url) {
        const subject = 'Here is a new service to track in Open Terms Archive';
        const body = `Hi,

  I need you to track "${documentType}" of "${declaration?.name}" for me.

  Here is the url ${window.location.href}&expertMode=true

  Thank you very much`;
        notify(
          'error',
          <>
            {t('service:could_not_create_issue')} <em>({message})</em>
            <br />
            <Button
              onClick={() => {
                window.open(
                  `mailto:${EMAIL_SUPPORT}?subject=${subject}&body=${encodeURIComponent(body)}`,
                  '_blank'
                );
              }}
            >
              {t('service:send_email')}
            </Button>
          </>,
          { autoClose: 10000 }
        );
        toggleLoading(false);
        return;
      }
      router.push(`/thanks?${commonUrlParams}&url=${encodeURIComponent(url)}`);
    } catch (e: any) {
      notify('error', e.toString());
      toggleLoading(false);
    }
  };

  const onErrorClick = () => {
    const subject = 'I tried to add this service but it did not work';
    const body = `Hi,

I need you to track "${documentType}" of "${declaration?.name}" for me but I had a failure with.

-----
${error}
-----

Here is the url ${window.location.href}&expertMode=true

Thank you very much`;

    window.open(
      `mailto:${EMAIL_SUPPORT}?subject=${subject}&body=${encodeURIComponent(body)}`,
      '_blank'
    );
  };

  const saveOnLocal = async () => {
    await api.post('/api/services', {
      destination,
      path: localPath,
      data: JSON.stringify(declaration),
    });
  };

  if (loadingDocumentDeclaration) {
    return 'Loading declaration from source...';
  }
  if (!declaration) {
    return 'Loading declaration...';
  }

  return (
    <div className={s.wrapper}>
      {!isServiceHelpViewed && (
        <ServiceHelpDialog open={!isServiceHelpViewed} onClose={() => setServiceHelpViewed(true)} />
      )}
      <Drawer className={s.drawer}>
        <div className={s.drawerWrapper}>
          <nav className={s.drawerNav}>
            <LinkIcon
              className={s.backButton}
              iconColor="var(--colorBlack400)"
              href={`/?${commonUrlParams}`}
              direction="left"
              small={true}
            >
              {t('service:back')}
            </LinkIcon>
            <span className={s.destination}>{destination}</span>
          </nav>
          <div className={s.formWrapper}>
            <form>
              <div className={classNames('formfield')}>
                <label>
                  {t('service:form.url')}
                  <LinkIcon
                    href="https://docs.opentermsarchive.org/contributing-terms#fetch"
                    small={true}
                    iconName="FiHelpCircle"
                    iconPosition="last"
                    className="float__right"
                    target="_blank"
                  >
                    Help
                  </LinkIcon>
                </label>
                <div className={classNames('select')}>
                  <SelectorButton
                    key={'fetch'}
                    value={url}
                    onInputChange={onPageDeclarationUpdate('update')('fetch')}
                    withSwitch={false}
                  />
                </div>
                {!executeClientScripts && iframeReady && !isPDF && (
                  <div className={classNames(s.formInfos, 'text__light', 'mt__XS')}>
                    <IconAlert /> {t('service:pageNotAccurate.desc')}{' '}
                    <a
                      onClick={() =>
                        onPageDeclarationUpdate('update')('executeClientScripts')(true)
                      }
                    >
                      {t('service:pageNotAccurate.cta')}
                    </a>
                  </div>
                )}
              </div>
              <div className={classNames('formfield')}>
                <label>
                  {t('service:form.documentType')}
                  <LinkIcon
                    href="https://docs.opentermsarchive.org/contributing-terms/#terms-type"
                    small={true}
                    iconName="FiHelpCircle"
                    iconPosition="last"
                    className="float__right"
                    target="_blank"
                  >
                    Help
                  </LinkIcon>
                </label>
                <div className={classNames('select')}>
                  <select
                    onChange={(event) =>
                      onDocumentDeclarationUpdate('documentType')(event.target.value)
                    }
                    value={documentType}
                  >
                    <option key="documentType_none" value="">
                      {t('service:form.select')}
                    </option>
                    {Object.keys(documentTypes)
                      .sort()
                      .map((documentTypeOption) => (
                        <option
                          key={`documentType_${documentTypeOption}`}
                          value={documentTypeOption}
                        >
                          {documentTypeOption}
                        </option>
                      ))}
                  </select>
                  <FiChevronDown color="333333"></FiChevronDown>
                  {documentType && (
                    <dl>
                      {Object.entries(documentTypes[documentType] || {})
                        .filter(([key]) => !['references', 'industries'].includes(key))
                        .map(([key, value]) => (
                          <React.Fragment key={`documentType_detail_${key}`}>
                            <dt>{key.charAt(0).toUpperCase() + key.slice(1)}</dt>
                            <dd>{Array.isArray(value) ? value.join(', ') : value}</dd>
                          </React.Fragment>
                        ))
                      }
                    </dl>
                  )}
                </div>
              </div>
              <div className={classNames('formfield')}>
                <label>
                  {t('service:form.serviceName')}
                  <LinkIcon
                    href="https://docs.opentermsarchive.org/contributing-terms/#service-name"
                    small={true}
                    iconName="FiHelpCircle"
                    iconPosition="last"
                    className="float__right"
                    target="_blank"
                  >
                    Help
                  </LinkIcon>
                </label>
                <SelectorButton
                  key={'name'}
                  value={declaration.name}
                  onInputChange={onDocumentDeclarationUpdate('name')}
                  withSwitch={false}
                />
              </div>
              {!isPDF && (
                <>
                  <div key="significantPart" className={classNames('formfield')}>
                    <label>
                      {t('service:form.significantPart')}
                      <LinkIcon
                        href="https://docs.opentermsarchive.org/contributing-terms/#select"
                        small={true}
                        iconName="FiHelpCircle"
                        iconPosition="last"
                        className="float__right"
                        target="_blank"
                      >
                        Help
                      </LinkIcon>
                    </label>
                    <div className="text__light">
                      {t('service:form.significantPart.instructions')}
                    </div>
                    <div className="mt__XS">
                      {selectCssSelectors.map((selected, i) => (
                        <SelectorButton
                          className={s.selectionItem}
                          key={typeof selected === 'string' ? selected : JSON.stringify(selected)}
                          value={selected}
                          onInputChange={onChangeCssRule('select', i)}
                          onRemove={onDeleteCssRule('select', i)}
                        />
                      ))}
                    </div>
                    <Button
                      onClick={selectInIframe('select')}
                      disabled={!!iframeSelectionField || !iframeReady}
                      type="secondary"
                      size="sm"
                    >
                      {t('service:form.significantPart.cta')}
                    </Button>
                  </div>

                  {(selectCssSelectors?.length > 0 || removeCssSelectors?.length > 0) && (
                    <div key="insignificantPart" className={classNames('formfield')}>
                      <label>
                        {t('service:form.insignificantPart')}
                        <LinkIcon
                          href="https://docs.opentermsarchive.org/contributing-terms/#remove"
                          small={true}
                          iconName="FiHelpCircle"
                          iconPosition="last"
                          className="float__right"
                          target="_blank"
                        >
                          Help
                        </LinkIcon>
                      </label>
                      <div className="text__light">
                        {t('service:form.insignificantPart.instructions')}
                      </div>
                      <div className="mt__XS">
                        {removeCssSelectors.map((removed, i) => (
                          <SelectorButton
                            className={s.selectionItem}
                            key={typeof removed === 'string' ? removed : JSON.stringify(removed)}
                            value={removed}
                            onInputChange={onChangeCssRule('remove', i)}
                            onRemove={onDeleteCssRule('remove', i)}
                          />
                        ))}
                      </div>
                      <Button
                        onClick={selectInIframe('remove')}
                        disabled={!!iframeSelectionField || !iframeReady}
                        type="secondary"
                        size="sm"
                      >
                        {t('service:form.insignificantPart.cta')}
                      </Button>
                    </div>
                  )}
                </>
              )}
              <nav key="expertMode" className={classNames('formfield', s.toggleExpertMode)}>
                <a onClick={() => onConfigInputChange('expertMode')(!expertMode)}>
                  {t('service:expertMode')}
                </a>

                {expertMode ? (
                  <FiChevronUp color="333333"></FiChevronUp>
                ) : (
                  <FiChevronDown color="333333"></FiChevronDown>
                )}
              </nav>
              {expertMode && (
                <>
                  <div className={classNames('formfield')}>
                    <label>{t('service:form.links-snapshots-versions')}</label>
                    <ul className={classNames(s.expertButtons, 'text__light')}>
                      <li>
                        <a
                          target="_blank"
                          href={`https://github.com/${destination}/blob/main/declarations/${encodeURIComponent(
                            declaration.name
                          )}.json`}
                        >
                          Current JSON
                        </a>
                      </li>
                      <li>
                        <a
                          target="_blank"
                          href={`${versionsRepository}/blob/main/${encodeURIComponent(
                            declaration.name
                          )}/${encodeURIComponent(documentType)}.md`}
                        >
                          Latest version
                        </a>
                      </li>
                      <li>
                        <a
                          target="_blank"
                          href={`${versionsRepository}/commits/main/${encodeURIComponent(
                            declaration.name
                          )}/${encodeURIComponent(documentType)}.md`}
                        >
                          All versions
                        </a>
                      </li>
                      <li>
                        <a
                          target="_blank"
                          href={`${snapshotsRepository}/blob/main/${encodeURIComponent(
                            declaration.name
                          )}/${encodeURIComponent(documentType)}.html`}
                        >
                          Latest snapshot
                        </a>
                      </li>
                    </ul>
                  </div>
                  <div className={classNames('formfield')}>
                    <div className={classNames('select', 'mt__XS')}>
                      <label htmlFor="executeClientScripts">{t('service:form.executeClientScripts')}
                        <input
                          id="executeClientScripts"
                          type="checkbox"
                          defaultChecked={!!page?.executeClientScripts}
                          onChange={(event) =>
                            onPageDeclarationUpdate('update')('executeClientScripts')(
                              event.target.checked
                            )
                          }
                          disabled={isPDF}
                        />
                      </label>
                      <div className="text__light">{t('service:form.executeClientScripts.more')}</div>
                    </div>
                  </div>
                  {!isPDF && (
                    <div className={classNames('formfield')}>
                      <label htmlFor="bypassCookies" >{t('service:form.bypassCookies')}
                        <input
                          id="bypassCookies"
                          type="checkbox"
                          defaultChecked={!!bypassCookies}
                          onChange={() => onConfigInputChange('bypassCookies')(!bypassCookies)}
                          disabled={isPDF}
                        />
                      </label>
                      <div className="text__light">{t('service:form.bypassCookies.more')}</div>
                    </div>
                  )}
                  {!isPDF && (
                    <div className={classNames('formfield')}>
                      <label>{t('service:form.hiddenPart')}</label>
                      <div className="text__light">{t('service:form.hiddenPart.more')}</div>
                      <div className="mt__XS">
                        {hiddenCssSelectors.map((hidden, i) => (
                          <SelectorButton
                            className={s.selectionItem}
                            key={hidden}
                            value={hidden}
                            onInputChange={onChangeCssRule('hidden', i)}
                            onRemove={onDeleteCssRule('hidden', i)}
                            withSwitch={false}
                          />
                        ))}
                      </div>
                      <Button
                        onClick={selectInIframe('hidden')}
                        disabled={!!iframeSelectionField || !iframeReady}
                        type="secondary"
                        size="sm"
                      >
                        {t('service:form.hiddenPart.cta')}
                      </Button>
                    </div>
                  )}
                  <div className={classNames('formfield')}>
                    <label>{t('service:form.acceptLanguage')}</label>
                    <div className="text__light">{t('service:form.acceptLanguage.more')}</div>
                    <div className={classNames('select', 'mt__XS')}>
                      <SelectorButton
                        key={'acceptLanguage'}
                        value={acceptLanguage}
                        onInputChange={onConfigInputChange('acceptLanguage')}
                        withSwitch={false}
                      />
                    </div>
                  </div>
                  <div className={classNames('formfield', s.expert)}>
                    <label>{t('service:form.label.json')}</label>
                    <pre className={classNames(s.json)}>{JSON.stringify(declaration, null, 2)}</pre>
                    <div className={classNames(s.expertButtons)}>
                      {localPath && (
                        <Button
                          onClick={saveOnLocal}
                          size="sm"
                          type="secondary"
                          title={`Save on ${localPath}`}
                        >
                          {t('service:expertMode.button.label')}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className={classNames('formfield', s.expert)}>
                    <label>{t('service:form.label.snapshot')}</label>
                    {data?.snapshotUrl && (
                      <Button href={data?.snapshotUrl} target="_blank" type="secondary" size="sm">
                        {t('service:show-snapshot')}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </form>
          </div>

          <nav className={s.formActions}>
            <Button disabled={versionDisabled} type="secondary" onClick={onVerifyVersion}>
              {t('service:verify-version')}
            </Button>
            <Button disabled={submitDisabled || loading} onClick={() => showModal('contributor')}>
              {t('service:submit')}
            </Button>
          </nav>
        </div>
      </Drawer>
      <div className={s.main}>
        {isLoadingIframe && (
          <div className={s.fullPage}>
            <h1>{t('service:loading.title')}</h1>
            <p>{t('service:loading.subtitle')}</p>
            <Loading />
          </div>
        )}
        {!isLoadingIframe && error && (
          <div className={s.fullPage}>
            <h1>{t('service:error.title')}</h1>
            <p>{error}</p>
            <Button onClick={onErrorClick}>{t('service:error.cta')}</Button>
            <a onClick={() => window.location.reload()}>{t('service:error.cta.refresh')}</a>
          </div>
        )}
        {!!modal && (
          <div className={classNames(s.fullPageAbove)}>
            {modal === 'contributor' && (
              <ContributorForm
                onContributorChange={({ name, email }) => {
                  setContributorName(name);
                  setContributorEmail(email);
                  showModal(undefined);
                }}
                onSubmitDocument={onValidate}
                mdxContent={contributorFormMdx}
              />
            )}
            {modal === 'version' && <Version json={declaration} />}
            <button onClick={() => showModal(undefined)}>
              <IconClose />
            </button>
          </div>
        )}
        {!isLoadingIframe && !error && data?.url && isPDF && (
          <iframe src={data?.url} width="100%" style={{ height: '100vh' }} />
        )}
        {!isLoadingIframe && !error && data?.url && !isPDF && (
          <IframeSelector
            selectable={!!iframeSelectionField}
            url={data?.url}
            selected={selectCssSelectors}
            removed={removeCssSelectors}
            hidden={hiddenCssSelectors}
            onSelect={iframeSelectionField ? onSelectInIframe(iframeSelectionField) : () => {}}
            onReady={() => toggleIframeReady(true)}
          />
        )}
      </div>
    </div>
  );
};

export const getStaticProps = async (props: any) => {
  const isGitlab = process.env.NEXT_PUBLIC_REPO_TYPE === "GITLAB";
  
  const { default: documentTypes } = await import('@opentermsarchive/terms-types');

  return JSON.parse(
    JSON.stringify({
      props: {
        ...props,
        documentTypes,
        contributorFormMdx: await loadMdxFile(
          {
            load: 'mdx',
            folder: 'parts',
            filename: 'contributor-form',
            params: {
              platform: isGitlab ? "GitLab" : "GitHub",
              platformUrl: isGitlab ? "https://gitlab.com" : "https://github.com",
            }
          },
          props.locale
        ),
      },
      revalidate: 60 * 5,
    })
  );
};

export default ServicePage;
