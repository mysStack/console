import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import React from 'react';
import ts from 'typescript';

const dependency = createRequire(__filename);
function setup(enabled = true, data: Record<string, any> = {}) {
  const file = path.join(__dirname, 'WorkloadImageInput.tsx');
  assert.ok(existsSync(file), '需要原生镜像搜索、标签选择与详情控件');
  const state: any[] = [];
  const queries: any[] = [];
  let cursor = 0;
  let changed = '';
  const props: any = {
    value: 'nginx:alpine',
    secret: '',
    scope: { cluster: 'host', namespace: 'first' },
    onChange: (value: string) => {
      changed = value;
      props.value = value;
    },
  };
  const loaded = { exports: {} as any };
  runInNewContext(
    ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      },
    }).outputText,
    {
      module: loaded,
      exports: loaded.exports,
      t: (key: string) => key,
      globals: { config: { enableImageSearch: enabled }, user: { username: 'test-only' } },
      require: (name: string) => {
        if (name === 'react')
          return {
            ...React,
            useState: (initial: any) => {
              const slot = cursor++;
              if (!(slot in state))
                state[slot] = typeof initial === 'function' ? initial() : initial;
              return [
                state[slot],
                (next: any) => {
                  state[slot] = typeof next === 'function' ? next(state[slot]) : next;
                },
              ];
            },
          };
        if (name === '@kubed/components')
          return { Button: 'button', Input: 'input', Select: 'select' };
        if (name === 'react-query')
          return {
            useQuery: (...args: any[]) => {
              queries.push(args);
              return data[args[0][0]] || {};
            },
          };
        if (name === './workloadImages') {
          // 只在这个边界隔离网络依赖，解析函数仍使用实际实现。
          const source = ts.transpileModule(
            readFileSync(path.join(__dirname, 'workloadImages.ts'), 'utf8'),
            { compilerOptions: { module: ts.ModuleKind.CommonJS } },
          ).outputText;
          const model = { exports: {} as any };
          runInNewContext(source, {
            module: model,
            exports: model.exports,
            require: () => ({ request: {} }),
          });
          return model.exports;
        }
        return dependency(name);
      },
    },
  );
  const render = () => {
    cursor = 0;
    queries.length = 0;
    return nodes(loaded.exports.default(props));
  };
  return { render, props, queries, changed: () => changed };
}
function nodes(node: any): any[] {
  if (!React.isValidElement(node)) return [];
  return [node, ...React.Children.toArray((node.props as any).children).flatMap(nodes)];
}
const byLabel = (all: any[], label: string) => all.find(node => node.props['aria-label'] === label);

test('关闭镜像搜索仍保留手动镜像编辑，所有网络查询禁用', () => {
  const view = setup(false);
  const all = view.render();
  byLabel(all, 'CONTAINER_IMAGE').props.onChange({ target: { value: 'busybox:1.36' } });
  assert.equal(view.changed(), 'busybox:1.36');
  assert.equal(byLabel(all, 'WORKLOAD_IMAGE_SEARCH'), undefined);
  assert.ok(view.queries.every(query => query[2].enabled === false));
});

test('搜索、选择仓库镜像、标签翻页和标签选择回写当前容器草稿', () => {
  const view = setup(true, {
    'workload-image-search': { data: ['team/app'] },
    'workload-image-registry': { data: 'registry.example:5000' },
    'workload-image-tags': { data: { tags: ['v1', 'v2'], total: 25 } },
  });
  view.props.secret = 'registry-a';
  byLabel(view.render(), 'WORKLOAD_IMAGE_SEARCH').props.onChange({ target: { value: 'app' } });
  byLabel(view.render(), 'WORKLOAD_IMAGE_SEARCH_SUBMIT').props.onClick();
  view.render();
  assert.equal(
    view.queries.find(query => query[0][0] === 'workload-image-search')[2].enabled,
    true,
  );
  byLabel(view.render(), 'team/app').props.onClick();
  assert.equal(view.changed(), 'registry.example:5000/team/app');
  const tags = byLabel(view.render(), 'IMAGE_TAG');
  tags.props.onChange('v2');
  assert.equal(view.changed(), 'registry.example:5000/team/app:v2');
  byLabel(view.render(), 'WORKLOAD_IMAGE_TAG_NEXT').props.onClick();
  view.render();
  assert.equal(
    view.queries.find(query => query[0][0] === 'workload-image-tags')[0].includes(2),
    true,
  );
});

test('API 失败显示错误但保留镜像，只有明确操作才以 insecure 重试', () => {
  const view = setup(true, { 'workload-image-detail': { error: { certificate: true } } });
  let all = view.render();
  assert.ok(all.some(node => node.props.role === 'alert'));
  assert.ok(
    view.queries
      .filter(query => query[0][0] === 'workload-image-detail')
      .every(query => query[0].includes(false)),
  );
  byLabel(all, 'IGNORE_AND_RETRY').props.onClick();
  all = view.render();
  assert.ok(view.queries.find(query => query[0][0] === 'workload-image-detail')[0].includes(true));
  assert.equal(view.props.value, 'nginx:alpine');
  byLabel(all, 'CONTAINER_IMAGE').props.onChange({ target: { value: 'busybox:1.36' } });
  byLabel(view.render(), 'CONTAINER_IMAGE').props.onBlur();
  view.render();
  assert.ok(view.queries.find(query => query[0][0] === 'workload-image-detail')[0].includes(false));
});

test('作用域和 Secret 在缓存键中隔离，输入更改后不显示前一镜像的详情', () => {
  const view = setup(true, {
    'workload-image-detail': {
      data: {
        created: 'fixture-time',
        registry: 'docker.io',
        ports: ['80/tcp'],
        size: 10,
        layers: 1,
      },
    },
  });
  let all = view.render();
  assert.ok(all.some(node => node.type === 'dd' && node.props.children === 'fixture-time'));
  const firstKey = view.queries.find(query => query[0][0] === 'workload-image-detail')[0];
  view.props.scope = { cluster: 'host', namespace: 'second' };
  view.props.secret = 'registry-b';
  view.render();
  const secondKey = view.queries.find(query => query[0][0] === 'workload-image-detail')[0];
  assert.notDeepEqual(firstKey, secondKey);
  byLabel(view.render(), 'CONTAINER_IMAGE').props.onChange({ target: { value: 'busybox' } });
  all = view.render();
  assert.equal(
    all.some(node => node.type === 'dd' && node.props.children === 'fixture-time'),
    false,
  );
  view.props.scope = undefined;
  view.render();
  assert.ok(view.queries.every(query => query[2].enabled === false));
});

test('相同关键词搜索失败后可以重试，详情失败也有独立重试入口', () => {
  let searches = 0;
  let details = 0;
  let tags = 0;
  const view = setup(true, {
    'workload-image-search': { error: {}, refetch: () => searches++ },
    'workload-image-detail': { error: {}, refetch: () => details++ },
    'workload-image-tags': { error: {}, refetch: () => tags++ },
  });
  byLabel(view.render(), 'WORKLOAD_IMAGE_SEARCH').props.onChange({ target: { value: 'nginx' } });
  byLabel(view.render(), 'WORKLOAD_IMAGE_SEARCH_SUBMIT').props.onClick();
  byLabel(view.render(), 'WORKLOAD_IMAGE_SEARCH_SUBMIT').props.onClick();
  assert.equal(searches, 1);
  byLabel(view.render(), 'WORKLOAD_IMAGE_RETRY').props.onClick();
  assert.equal(details, 1);
  assert.equal(tags, 1);
});
