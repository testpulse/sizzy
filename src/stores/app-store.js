// @flow
import type { DeviceSettings } from "config/types";
import { observable, action, computed } from "mobx";
import { toggleInArray } from "utils/array-utils";
import { isWebUri } from "valid-url";
import { isUrlSameProtocol, getOppositeProtocol } from "utils/url-utils";
import allDevices from "config/devices";
import store from "stores/store";
import views from "config/views";

//models
import Settings from "stores/models/settings";
import Device from "stores/models/device";

//config
import themes from "styles/themes";
import devices from "config/devices";
import { OS, DEVICE_TYPES } from "config/tags";

//lodash
import every from "lodash/every";
import filter from "lodash/filter";
import map from "lodash/map";

class AppStore {
  /* Observables */
  @observable themeIndex: number = 1;
  @observable url: string;
  @observable urlToLoad: string;
  @observable loading: boolean = false;
  @observable showWelcomeContent: boolean = true;
  @observable filters: Array<string> = [
    ...map(DEVICE_TYPES, device => device),
    ...map(OS, os => os)
  ];
  settings: Settings = new Settings(true);

  /* Props */
  @observable devices: Array<Device> = map(
    allDevices,
    device => new Device(device)
  );

  /* Actions */

  //update zoom/orientation values of all devices with the global settings
  @action updateAllDevices = (settings: DeviceSettings) => {
    this.devices.forEach(device => device.settings.update(settings));
  };

  @action resetAllSettings = () => {
    this.themeIndex = 1;
    this.settings.reset();
    this.updateAllDevices(this.settings.getValues());
  };

  @action setUrl = (url: string) => (this.url = url);
  @action setUrltoLoad = (
    urlToLoad: string,
    redirectOnProtocolChange: boolean = false,
    insertIntoUrl: boolean = false
  ) => {
    if (urlToLoad !== this.urlToLoad) {
      let { protocol, host } = window.location;

      //if invalid url (doesn't have protcol), try to append current protocol
      if (!isWebUri(urlToLoad)) {
        const urlWithProtocol = `${protocol}//${urlToLoad}`;
        urlToLoad = urlWithProtocol;
      }

      let urlIsSameProtocol = isUrlSameProtocol(urlToLoad, protocol);
      let oppositeProtocol = getOppositeProtocol(protocol);

      let shouldRefreshPage =
        !urlIsSameProtocol && redirectOnProtocolChange === true;

      if (shouldRefreshPage && oppositeProtocol !== false) {
        const newUrl = `${oppositeProtocol}//${host}?url=${urlToLoad}`;
        return (window.location.href = newUrl);
      }

      this.showLoadingAnimation();

      this.urlToLoad = urlToLoad;
      this.url = urlToLoad;

      if (insertIntoUrl) {
        store.router.goTo(views.home, {}, store, { url: this.urlToLoad });
      }
    }
  };

  @action showLoadingAnimation = () => {
    this.loading = true;
    this.showWelcomeContent = false;

    setTimeout(() => {
        this.loading = false;
    }, 2000);
  }

  @action loadCurrentUrl = () => {
    this.setUrltoLoad(this.url, true, true);
  };

  @action toggleFilter = (filterName: string) => {
    this.filters = toggleInArray(this.filters, filterName);
  };

  //cycle through themes
  @action switchTheme = () => {
    const themeKeys = Object.keys(themes);
    let newThemeIndex = this.themeIndex + 1;
    this.themeIndex = newThemeIndex >= themeKeys.length ? 0 : newThemeIndex;
  };

  @action resetToHome = () => window.location.href = window.location.origin;

  @action loadExampleUrl = () => {
    const exampleUrl = `${window.location.protocol}//kitze.io`;
    this.setUrl(exampleUrl);
    this.setUrltoLoad(exampleUrl, false, true);
  }

  /* Computed */

  @computed get filteredDeviceNames(): Array<string> {
    let filteredDevices = filter(devices, device =>
      every(device.tags, tag => this.filters.indexOf(tag) !== -1)
    );
    return map(filteredDevices, device => device.name);
  }

  @computed get theme(): Object {
    return themes[Object.keys(themes)[this.themeIndex]];
  }

  @computed get isValidUrl(): boolean {
    return isWebUri(this.urlToLoad);
  }

  /* Helpers */

  isVisible = (device: Device) => {
    return device && device.name
      ? this.filteredDeviceNames.indexOf(device.name) !== -1
      : false;
  };
}

export default AppStore;
