import { FiGithub, FiMail } from 'react-icons/fi';
import React, { ReactNode } from 'react';

import { Analytics } from 'modules/Analytics';
import CommonHead from './CommonHead';
import Container from './Container';
import Divider from '../components/Divider';
import Footer from './Footer';
import FooterMenu from '../components/FooterMenu';
import Header from './Header';
import HeaderMenu from '../components/HeaderMenu';
import LanguageSwitcher from 'modules/I18n/components/LanguageSwitcher';
import Link from 'next/link';
import classNames from 'classnames';
import useTranslation from 'next-translate/useTranslation';

type Props = {
  children?: ReactNode;
  title?: string;
  desc?: string;
};

const Layout = ({
  children,
  title = 'This is the default title',
  desc = 'This is the default desc',
}: Props) => {
  const { t } = useTranslation();
  return (
    <>
      <CommonHead title={title} description={desc} twitterCard="/images/twitter-card.jpg" />

      <Analytics />

      {/* Header */}
      <Container paddingY={false} paddingX={false} layout="fluid">
        <Container gridCols="12" gridGutters="11" flex={true} paddingX={false} paddingY={false}>
          <Header>
            {() => (
              <>
                <HeaderMenu type="secondary">
                  <LanguageSwitcher />
                  <ul>
                    <li>
                      <Link href="https://github.com/OpenTermsArchive/contribution-tool">
                        <a
                          className={classNames('icon_circle')}
                          target="_blank"
                          rel="noopener"
                          title={t('header:link.github.title')}
                        >
                          <FiGithub color="#fefffd" />
                        </a>
                      </Link>
                    </li>
                  </ul>
                </HeaderMenu>
              </>
            )}
          </Header>
        </Container>
      </Container>

      {children}

      {/* Footer */}
      <Container paddingY={false} gray={true} layout="fluid" paddingX={false}>
        <Divider />
        <Container
          gridCols="12"
          gridGutters="11"
          flex={true}
          paddingX={false}
          paddingY={true}
          paddingYSmall={true}
        >
          <Footer>
            <FooterMenu>
              <ul>
                <li>
                  <Link href="mailto:contact@opentermsarchive.org">
                    <a
                      title={t('footer:link.contact.title')}
                      className={classNames('a_icontext', 'a__small', 'footer_menus_icontext')}
                    >
                      <span className={classNames('icon_circle', 'icon_circle__medium', 'mr__2XS')}>
                        <FiMail color="#fefffd" />
                      </span>
                      <span>{t('footer:link.contact')}</span>
                    </a>
                  </Link>
                </li>
              </ul>
            </FooterMenu>
            <FooterMenu small={true} align={'right'}>
              <ul>
                <li>
                  <Link href="https://github.com/OpenTermsArchive/contribution-tool">
                    <a title={t('footer:link.github.title')} target="_blank" rel="noopener">
                      {t('footer:link.github')}
                    </a>
                  </Link>
                </li>
              </ul>
            </FooterMenu>
          </Footer>
        </Container>
      </Container>
    </>
  );
};

export default Layout;
