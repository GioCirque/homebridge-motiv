import { name as PackageName, displayName as PluginName } from '../package.json';
import { MotivPlatform } from './lib/platform';

export default function(homebridge) {
  MotivPlatform.preInitPlatform(homebridge);
  homebridge.registerPlatform(PackageName, PluginName, MotivPlatform, true);
}
