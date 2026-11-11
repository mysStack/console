const { sendGatewayRequest } = require('../libs/request');

const CRD_NAME = 'configurations.springcloud.kubesphere.io';
const LEGACY_PATH =
  /^(\/clusters\/[^/]+)?\/kapis\/resources\.kubesphere\.io\/v1alpha3\/customresourcedefinitions$/;

/**
 * V3 waits for this exact capability query before rendering project lists.
 * A named Kubernetes GET avoids listing/filtering every CRD. Keep the legacy
 * list response, and leave permission differences and other errors to the
 * original endpoint. There is deliberately no cross-request result cache.
 */
module.exports = async (ctx, next) => {
  if (ctx.method !== 'GET' || ctx.query.name !== CRD_NAME || Object.keys(ctx.query).length !== 1) {
    return next();
  }

  const match = ctx.path.match(LEGACY_PATH);
  const token = ctx.req.token || ctx.cookies.get('token');
  if (!match || !token) return next();

  let items;
  try {
    const crd = await sendGatewayRequest({
      method: 'GET',
      url: `${match[1] || ''}/apis/apiextensions.k8s.io/v1/customresourcedefinitions/${CRD_NAME}`,
      token,
      // An unsupported or unhealthy direct endpoint must not stall the
      // compatibility path indefinitely before it falls back.
      timeout: 1000,
    });
    if (
      crd?.apiVersion !== 'apiextensions.k8s.io/v1' ||
      crd?.kind !== 'CustomResourceDefinition' ||
      crd?.metadata?.name !== CRD_NAME
    ) {
      return next();
    }
    items = [crd];
  } catch (error) {
    // A generic 404 could mean an unsupported API route. Only a Kubernetes
    // Status identifying this particular CRD proves that it is absent.
    if (
      error?.code !== 404 ||
      error?.reason !== 'NotFound' ||
      error?.details?.group !== 'apiextensions.k8s.io' ||
      error?.details?.kind !== 'customresourcedefinitions' ||
      error?.details?.name !== CRD_NAME
    ) {
      return next();
    }
    items = [];
  }

  ctx.status = 200;
  ctx.set('Cache-Control', 'no-store');
  ctx.body = { items, totalItems: items.length };
};
