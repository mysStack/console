// playwright-cli run-code callback; use with env-summary-preview.cjs.
// Tests production React components using explicitly local fixture data.
async page => {
  // A reload makes this assertion independent of a previous manual run in the
  // headed browser; the feature's default is intentionally collapsed.
  await page.reload();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.getByText('共 7 个环境变量', { exact: true }).waitFor();
  const main = page.locator('[data-container="main"]');
  const sidecar = page.locator('[data-container="sidecar"]');
  const heading = main.locator('[data-test="environment-variable-section-heading"]');
  if (!(await heading.textContent()).includes('共 1 个环境变量'))
    throw Error('env count includes envFrom');
  if ((await main.locator('[data-test="native-env-row"]').count()) !== 1)
    throw Error('native env rows lost');
  if ((await main.locator('[data-test="config-reference-preview-value"]').count()) !== 0)
    throw Error('default expansion changed');
  if (
    !(await sidecar.textContent()).includes('sidecar-config') ||
    (await sidecar.textContent()).includes('test-secret')
  )
    throw Error('container references leaked');
  if (
    (await page
      .locator('[data-container="env-only"] [data-test="config-reference-summary"]')
      .count()) !== 0
  )
    throw Error('env-only gets empty references');
  if (!(await page.locator('[data-container="empty"]').textContent()).includes('共 0 个环境变量'))
    throw Error('empty container heading absent');
  await main.getByRole('button', { name: '全部展开', exact: true }).click();
  const values = main.locator('[data-test="config-reference-preview-value"]');
  if ((await values.count()) !== 7) throw Error('expanded variable count wrong');
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 768, height: 1000 },
  ]) {
    await page.setViewportSize(viewport);
    const measurements = await main.evaluate(card => {
      const native = card.querySelector('[data-test="native-env-row"]');
      const summary = card.querySelector('[data-test="config-reference-summary"]');
      const resource = summary.children[1].firstElementChild;
      const detail = [
        ...card.querySelectorAll('[data-test="config-reference-preview-value"]'),
      ].find(row => row.textContent.includes('EXTRA_LONG_IDENTIFIER'));
      const key = detail.firstElementChild;
      return {
        font: getComputedStyle(resource).fontSize,
        nativeFont: getComputedStyle(native).fontSize,
        height: resource.getBoundingClientRect().height,
        childIndent: detail.getBoundingClientRect().left - resource.getBoundingClientRect().left,
        detailRadius: getComputedStyle(detail).borderRadius,
        wrap: getComputedStyle(key).overflowWrap,
        whitespace: getComputedStyle(key).whiteSpace,
        keyFits: key.scrollWidth <= key.clientWidth + 1,
        pageFits: document.documentElement.scrollWidth <= innerWidth,
      };
    });
    if (
      measurements.font !== measurements.nativeFont ||
      measurements.height !== 44 ||
      measurements.childIndent !== 32 ||
      measurements.detailRadius !== '0px' ||
      measurements.wrap !== 'anywhere' ||
      measurements.whitespace !== 'normal' ||
      !measurements.keyFits ||
      !measurements.pageFits
    )
      throw Error(JSON.stringify({ viewport, measurements }));
  }
  const masks = await values.allTextContents();
  if (masks.filter(text => text.includes('******')).length !== 4)
    throw Error('Secret values unmasked');
  await main.getByRole('button', { name: '容器：main', exact: true }).click();
  if (await values.first().isVisible()) throw Error('native container collapse failed');
  if (!(await sidecar.getByRole('button', { name: '全部展开', exact: true }).isVisible()))
    throw Error('collapse affected sibling');
  await main.getByRole('button', { name: '容器：main', exact: true }).click();
  await main.getByRole('button', { name: '全部收起', exact: true }).click();
  if ((await values.count()) !== 0) throw Error('reference collapse failed');
  if (errors.length) throw Error(errors.join('\n'));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await main.getByRole('button', { name: '全部展开', exact: true }).click();
  return {
    passed: true,
    scope: 'local real-component fixture, NOT 131 E2E',
    viewports: [1440, 768],
    checks: [
      'separate counts',
      'native env preserved',
      'container isolation',
      'empty and env-only',
      'expand/collapse',
      'long key/value wraps',
      '44px rows',
      '32px child indent',
      'Secret masks',
    ],
    pageErrors: errors,
  };
};
