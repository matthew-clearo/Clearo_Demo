import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { apiRouteDefinitions } from '../server/generated-api-routes';
import { API_BASENAME } from '../server/api-paths';

type RouteModule = Record<string, unknown>;

type CompiledRoute = {
  source: string;
  regex: RegExp;
  paramNames: string[];
  module: RouteModule;
  methods: string[];
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compileRoute(pathPattern: string, module: RouteModule, source: string): CompiledRoute {
  const segments = pathPattern.split('/').filter(Boolean);
  const paramNames: string[] = [];
  const regexParts = segments.map((segment) => {
    if (segment.startsWith(':') && segment.endsWith('{.+}')) {
      const name = segment.slice(1, -4);
      paramNames.push(name);
      return '(.+)';
    }

    if (segment.startsWith(':')) {
      const name = segment.slice(1);
      paramNames.push(name);
      return '([^/]+)';
    }

    return escapeRegex(segment);
  });

  const regex = new RegExp(`^/${regexParts.join('/')}${segments.length === 0 ? '' : '/?$'}`);
  const methods = Object.keys(module).filter((key) =>
    ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(key)
  );

  return { source, regex, paramNames, module, methods };
}

const compiledRoutes = apiRouteDefinitions.map((route) =>
  compileRoute(route.path, route.module as RouteModule, route.source)
);

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function stripApiPrefix(pathname: string): string {
  if (pathname === API_BASENAME || pathname === `${API_BASENAME}/`) {
    return '/';
  }
  if (pathname.startsWith(`${API_BASENAME}/`)) {
    return pathname.slice(API_BASENAME.length);
  }
  return pathname;
}

function findRoute(pathname: string): { route: CompiledRoute; params: Record<string, string> } | null {
  for (const route of compiledRoutes) {
    const match = pathname.match(route.regex);
    if (!match) {
      continue;
    }

    const params: Record<string, string> = {};
    route.paramNames.forEach((name, index) => {
      params[name] = decodeURIComponent(match[index + 1] ?? '');
    });

    return { route, params };
  }
  return null;
}

async function dispatch(request: Request): Promise<Response> {
  const method = request.method.toUpperCase();
  const url = new URL(request.url);

  const routePath = stripApiPrefix(url.pathname);
  const found = findRoute(routePath);

  if (!found) {
    return json({ error: 'API route not found', path: url.pathname }, 404);
  }

  const { route, params } = found;
  const routeHandler = route.module[method] as
    | ((request: Request, ctx: { params: Record<string, string> }) => Promise<Response> | Response)
    | undefined;

  if (!routeHandler) {
    if (method === 'OPTIONS') {
      const allow = route.methods.sort().join(', ');
      return new Response(null, { status: 204, headers: { allow } });
    }
    return json(
      {
        error: `Method ${method} not allowed`,
        path: url.pathname,
        route: route.source,
      },
      405
    );
  }

  const result = await routeHandler(request, { params });
  if (result instanceof Response) {
    return result;
  }
  return json(result);
}

export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  return dispatch(request);
}

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  return dispatch(request);
}
