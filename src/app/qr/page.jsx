import React from 'react';

import 'server-only';
import { QRCodeForm } from '../../client/QRCodeForm.jsx';
import { PageStructure } from '../../page-structure';

export default function QRPage() {
  return (
    <PageStructure title="Generate a QR Code" breadcrumbs={[]} header={<h1>Generate a QR Code</h1>}>
      <QRCodeForm />
    </PageStructure>
  );
}
