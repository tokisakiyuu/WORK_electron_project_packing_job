
import * as React from 'react';
import * as ReactDOM from 'react-dom';
// import LocaleProvider from 'antd/es/locale-provider';
// import zh_CN from 'antd/lib/locale-provider/zh_CN';
import AppRouter from './router/AppRouter';
import './index.less';
import './index/global_mobile.less';
import 'antd/dist/antd.css';
// import 'antd/es/input/style/index.css';
// import 'antd/es/form/style/index.css';
// import 'antd/es/button/style/index.css';
// import 'antd/es/checkbox/style/index.css';
// import 'antd/es/message/style/index.css';
// import 'antd/es/select/style/index.css';
// import 'antd/es/icon/style/index.css';
// import 'antd/es/upload/style/index.css';
// import 'antd/es/avatar/style/index.css';
// import 'antd/es/popover/style/index.css';
// import 'antd/es/modal/style/index.css';
// import 'antd/es/carousel/style/index.css';
// import 'antd/es/divider/style/index.css';
// import 'antd/es/spin/style/index.css';
// import 'antd/es/tag/style/index.css';
// import 'antd/es/switch/style/index.css';


// import 'antd/dist/antd.css';

// import 'antd/es/button.css';

import *  as serviceWorker from './registerServiceWorker';
import { ErrorBoundary } from './component/errorView/ErrorView';
// import 'react-devtools'
import * as mobx from 'mobx';





// mobx.configure({  enforceActions: "strict" ,
mobx.configure({
  computedRequiresReaction: true,
  isolateGlobalState: true,
  disableErrorBoundaries: true
})
function renderDevTool() {

  // if (process.env.NODE_ENV !== "production") {


  //   const DevTools = require("mobx-react-devtools").default;

  //   return <DevTools />;

  // } else {
  //   return null
  // }

}


ReactDOM.render(
  <ErrorBoundary>
    <AppRouter />
    {renderDevTool()}
  </ErrorBoundary>
  ,
  document.getElementById('root') as HTMLElement
);
// registerServiceWorker();
serviceWorker.unregister();

