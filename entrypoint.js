import 'fast-text-encoding';
import 'react-native-get-random-values';
import '@ethersproject/shims';

import { Buffer } from 'buffer';
import { registerRootComponent } from 'expo';

import App from './src/App';

global.Buffer = global.Buffer || Buffer;

registerRootComponent(App);
