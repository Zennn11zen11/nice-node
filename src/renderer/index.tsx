import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import App from './App';
// import i18n (needs to be bundled)
import './i18n';
import { store } from './state/store';

const container = document.getElementById('root');
if (!container) {
  throw new Error('No root html element found');
}
const root = createRoot(container);
root.render(
  <Provider store={store}>
    <App />
  </Provider>,
);
