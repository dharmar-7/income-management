const path = require('path');

const appRoot = path.resolve(__dirname, 'app');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      function inlineExpoRouterEnvVars({ types: t }) {
        return {
          visitor: {
            MemberExpression(nodePath, state) {
              // Skip assignments like process.env.X = value
              if (
                t.isAssignmentExpression(nodePath.parent) &&
                nodePath.parent.left === nodePath.node
              ) {
                return;
              }

              if (!nodePath.get('object').matchesPattern('process.env')) return;

              const prop = nodePath.node.property;
              const key = t.isIdentifier(prop)
                ? prop.name
                : t.isStringLiteral(prop)
                  ? prop.value
                  : null;

              if (key === 'EXPO_ROUTER_APP_ROOT') {
                // require.context paths are relative to the file being transformed.
                // Compute relative path from the _ctx file to our app/ directory.
                const filename = state.filename || state.file.opts.filename || '';
                const fileDir = path.dirname(filename);
                let rel = path.relative(fileDir, appRoot).replace(/\\/g, '/');
                if (!rel.startsWith('.')) rel = './' + rel;
                nodePath.replaceWith(t.stringLiteral(rel));
              } else if (key === 'EXPO_ROUTER_IMPORT_MODE') {
                nodePath.replaceWith(t.stringLiteral('sync'));
              } else if (key === 'EXPO_ROUTER_ABS_APP_ROOT') {
                nodePath.replaceWith(t.stringLiteral(appRoot));
              }
            },
          },
        };
      },
    ],
  };
};
