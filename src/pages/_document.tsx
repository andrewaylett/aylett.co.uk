import React from 'react';

import Document, { Head, Html, Main, NextScript } from 'next/document';

import type { DocumentContext, DocumentInitialProps } from 'next/document';

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext): Promise<DocumentInitialProps> {
    const originalRenderPage = ctx.renderPage;

    ctx.renderPage = () =>
      originalRenderPage({
        enhanceApp: (App) => App,
        enhanceComponent: (Component) => Component,
      });

    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render(): React.ReactElement {
    // noinspection HtmlRequiredTitleElement
    return (
      <Html lang="en">
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

// noinspection JSUnusedGlobalSymbols
export default MyDocument;
