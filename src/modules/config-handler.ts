/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import Logger from "@modules/logger";
const log = Logger.ctx(__filename);

type Subscription = (contents: any) => void;

let instance: ConfigurationHandler;
export const setup = (configPath: string, configRenew: number) => {
  instance = new ConfigurationHandler(configPath, configRenew);
};

export const getInstance = () => instance;
export interface ConfigHandler {
  subscribe(cb: Subscription): void;
  contents: any;
}

class ConfigurationHandler implements ConfigHandler {
  private _contents: any;
  private contentHash: string;
  private subscriptions: Array<Subscription> = [];

  constructor(
    readonly configPath: string = "./config/config.json",
    readonly configRenew: number = 60_000
  ) {
    this.checkAndWatch();
  }

  private checkAndWatch() {
    if (fs.existsSync(this.configPath)) {
      this.reload();
      fs.watchFile(
        this.configPath,
        { interval: this.configRenew },
        (_curr, _prev) => {
          this.reload();
        }
      );
    } else {
      throw new Error(`Configuration file '${this.configPath}' not exists`);
    }
  }

  private reload() {
    const contents = fs.readFileSync(this.configPath, "utf-8");
    log.info("Updating config contents");
    this._contents = JSON.parse(contents);

    if (this.subscriptions?.length > 0) {
      this.subscriptions.forEach((e) => e(contents));
    }
  }

  subscribe(cb: Subscription): void {
    this.subscriptions.push(cb);
  }

  get contents() {
    return this._contents;
  }
}
