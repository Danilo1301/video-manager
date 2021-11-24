import fs = require("fs");

export default class Config {
    static ADDRESS = "localhost";
    static PORT = 3000;
    static PATH_NEW_VIDEOS = "-";
    static PATH_VIDEOS = "-";
    static PATH_BOOMARKS = "-";

    static async getPathStats(dir: string): Promise<undefined | fs.Stats>
    {
        return new Promise((resolve) => {

            fs.stat(dir, (err, stats) => {
                if(err)
                {
                    resolve(undefined);
                    return;
                }

                resolve(stats);
            });

        })
    }

    static async validatePaths()
    {
        if(await this.getPathStats(Config.PATH_NEW_VIDEOS) == undefined) return Config.PATH_NEW_VIDEOS;
        if(await this.getPathStats(Config.PATH_VIDEOS) == undefined) return Config.PATH_VIDEOS;
        if(await this.getPathStats(Config.PATH_BOOMARKS) == undefined) return Config.PATH_BOOMARKS;

        return undefined;
    }
}