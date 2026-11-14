import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { CommandBar } from './CommandBar';
import { Overlay } from './Overlay';
import { NotebookView } from './NotebookView';
import { PredictDashboard } from './predict';
import { closeNotebookWindow, closePredictWindow } from './lib/tauri';
import './styles.css';

const route = window.location.pathname;
document.body.classList.toggle('route-overlay', route === '/overlay');
document.body.classList.toggle('route-command', route === '/command');
document.body.classList.toggle('route-notebook', route === '/notebook');
document.body.classList.toggle('route-predict', route === '/predict');

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    {route === '/overlay' ? (
      <Overlay />
    ) : route === '/command' ? (
      <CommandBar />
    ) : route === '/notebook' ? (
      <NotebookView onClose={() => void closeNotebookWindow()} isStandalone={true} />
    ) : route === '/predict' ? (
      <PredictDashboard onClose={() => void closePredictWindow()} isStandalone={true} />
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
