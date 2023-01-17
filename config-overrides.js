/* config-overrides.js */
const tsImportPluginFactory = require('ts-import-plugin')
const { getLoader,injectBabelPlugin } = require("react-app-rewired");
const rewireLess = require('react-app-rewire-less');

process.env.GENERATE_SOURCEMAP = "false";

module.exports = function override(config, env) {

    config = rewireLess(config, env);
    // get tsloader
    // const tsloader = getLoader(
    //     config.module.rules,
    //     rule => String(rule.test) == String(/\.(ts|tsx)$/)
    // );

    // // set new options
    // tsloader.options = {
    //     transpileOnly: true,
    //     getCustomTransformers: () => ({
    //         before: [
    //             tsImportPluginFactory([
    //                 {
    //                     libraryName: 'antd',
    //                     libraryDirectory: 'lib',
    //                 }
    //             ])
    //         ]
    //     })
    // }

    config = injectBabelPlugin(['import', { libraryName: 'antd', libraryDirectory: 'es', style: true }], config);
    config = rewireLess.withLoaderOptions({
        modifyVars: { "@primary-color": "#1DA57A" },
    })(config, env);

    return config;
}