import { Terminal } from '@xterm/xterm';
import { FitAddon }  from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';

// Expose l'API xterm au runtime Leyo
window.LeyoXterm = {
  Terminal,
  FitAddon,
  WebLinksAddon,
};
