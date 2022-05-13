import fs from "fs";

export class Config {
    public static ADDRESS = "localhost";
    public static PORT = 3000;
    public static PATH_NEW_VIDEOS = "-";
    public static PATH_VIDEOS = "-";
    public static PATH_BOOMARKS = "-";

    public static async getPathStats(dir: string) {
        return new Promise<fs.Stats | undefined>((resolve) => {
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

    public static async validatePaths() {
        if(await this.getPathStats(Config.PATH_NEW_VIDEOS) == undefined) return Config.PATH_NEW_VIDEOS;
        if(await this.getPathStats(Config.PATH_VIDEOS) == undefined) return Config.PATH_VIDEOS;
        if(await this.getPathStats(Config.PATH_BOOMARKS) == undefined) return Config.PATH_BOOMARKS;

        return undefined;
    }
}