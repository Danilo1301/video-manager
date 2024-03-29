import fs from "fs";

import { Config } from "./config";
import { Video } from "./video";
import { Server } from "./server";
import { randomKey } from "./utils";

const { getVideoDurationInSeconds } = require('get-video-duration');

export enum VIDEO_SORT_BY {
    NONE,
    DATE,
    SIZE
}

interface BoomarkFile {
    videoName: string
    name: string
    path: string
    time: number
}

export class App {
    public static Instance: App;

    public videos: Map<string, Video> = new Map<string, Video>();

    constructor() {
        App.Instance = this;
    }

    public async start() {
        await this.loadConfig();

        const missingPath = await Config.validatePaths();

        if(missingPath) {
            console.log(`Could not find path ${missingPath}`);
            return;
        }

        //await convertOldVersion(`C:\\Users\\danil\\Desktop\\TestArea\\convert`);

        await this.loadNewVideos();
        await this.loadVideos();
        await this.processBoomarks();
    }

    private async loadConfig() {
        var json = JSON.parse(fs.readFileSync("./config.json", "utf8"));

        for (const key in json) {
            Config[key] = json[key];
        }
    }

    private async loadVideos() {
        console.log(`[app] Loading videos...`)

        var dirs = fs.readdirSync(Config.PATH_VIDEOS);
    
        for (const dir of dirs) {
            console.log(`Loading '${dir}'`);
    
            const videoInfoDir = Config.PATH_VIDEOS + "\\" + dir + "\\" + "video.json";
            
            if(!await Config.getPathStats(videoInfoDir))
            {
                console.log(`[1] Could not find 'video.json' for ${dir}`)
                continue;
            }

            const video = Video.fromJSON(JSON.parse(fs.readFileSync(videoInfoDir, "utf8")));
    
            if(!fs.existsSync(video.getVideoPath())) {
                console.log(`[2] Could not find video for ${dir}`)
                continue;
            }

            this.videos.set(dir, video);

            if(video.duration == 0)
            {
                await new Promise<void>(resolve => {
                
                    getVideoDurationInSeconds(video.getVideoPath()).then((duration) => {
                        video.duration = duration

                        resolve();
                    }).catch((error) => {
                        console.log(error)
    
                        resolve();
                    });
                })

                video.save();
            }

            
        }
    }

    private async loadNewVideos() {
        console.log(`Getting new videos...`)

        const ids = this.getAllVideoIdsInFolder();
    
        for (const dir of ids) {
            const video = Video.fromFile(dir);
            await this.moveNewVideoToVideosFolder(video);
        }
    }

    private getAllVideoIdsInFolder() {
        return fs.readdirSync(Config.PATH_NEW_VIDEOS);
    }

    private async moveNewVideoToVideosFolder(video: Video) {
        var oldDir = Config.PATH_NEW_VIDEOS + "\\" + video.fileName;
        var newDir = video.getPath();
    
        if(!await Config.getPathStats(oldDir))
        {
            console.log("Video was already moved!")
            return;
        }
    
        if(await Config.getPathStats(newDir))
        {
            console.log("A video with this id was already created!");
            return;
        }
    
        fs.mkdirSync(newDir);
        fs.renameSync(oldDir, newDir + "\\video." + video.extension);
    
        video.save();
    }

    private async processBoomarks() {
        console.log(`[app] processing boomarks...`);
    
        const videos = this.getVideos(VIDEO_SORT_BY.NONE);

        /*
        var vids: Video[] = [];
    
        for (const v of this.videos.values()) {
            vids.push(v);
        }
        */
    
        //vids.sort((a, b) => { return b.createdAt - a.createdAt });
    
        var boomarks = await this.getBoomarks();
        var totalBoomarks = boomarks.length;
    
        console.log(`[app] processing ${totalBoomarks} boomarks`);

        for (const boomark of boomarks) {

            for (const video of videos) {
                if(boomark.videoName != video.fileName) continue;

                const time = boomark.time - video.createdAt;

                console.log(`--`);
                console.log(`video ${video.name}`);
                console.log(`video ${video.createdAt}`);
                console.log(`video ${boomark.time} | ${time}`);
                console.log(`--`);

                video.addBoomark(boomark.name, time, -1);
                video.save();

                fs.unlinkSync(boomark.path);

                break;
            }
        }


        /*
        for (const video of vids) {
            var toAddBoomarks: number[] = [];
    
            for (const b of boomarks) {
                if(b > video.createdAt)
                {
                    toAddBoomarks.push(b)
                }
            }
    
            for (const b of toAddBoomarks) {
                boomarks.splice(boomarks.indexOf(b), 1)
    
                video.addBoomark(video.fileName, b - video.createdAt, -1);
                video.save();
            }
        }
    
     
        for (let i = 0; i < totalBoomarks; i++) {
            //fs.unlinkSync(Config.PATH_BOOMARKS + "\\boomark_" + i);
            console.log("Deleted boomark_"+i)
        }
        */
    }

    private async getBoomarks() {
        const dirs = fs.readdirSync(Config.PATH_BOOMARKS);
    
        const boomarks: BoomarkFile[] = [];
    
        for (const dir of dirs) {
            const path = Config.PATH_BOOMARKS + "\\" + dir;
            const stats = await fs.statSync(path);
            
            const data = JSON.parse(fs.readFileSync(path, "utf-8"));

            const boomark: BoomarkFile = {
                videoName: data["videoName"],
                name: data["name"],
                time: stats.birthtimeMs,
                path: path
            }

            console.log(boomark)

            boomarks.push(boomark);
        }
    
        return boomarks;
    }

    public deleteVideo(id: string) {
        var video = this.videos.get(id)!;

        var path = video.getPath();
        var dirs = fs.readdirSync(path);

        for (const file of dirs) {
            var fdir = path + "\\" + file;
            fs.unlinkSync(fdir);
        }

        fs.rmdirSync(path, { recursive: true });

        console.log(`[app] video ${video.id} deleted`);

        this.videos.delete(video.id);
    }
    
    public getVideos(sortBy: VIDEO_SORT_BY) {
        const videos = Array.from(App.Instance.videos.values());

        if(sortBy == VIDEO_SORT_BY.DATE) {
            videos.sort((a, b) => { return b.createdAt - a.createdAt });
        }

        if(sortBy == VIDEO_SORT_BY.SIZE) {
            videos.sort((a, b) => { return b.size - a.size });
        }

        return videos;
    }

    public log(...args) {
        console.log.apply(this, ["[app] "].concat(args));
    }
}

async function convertOldVersion(path: string) {

    if(!fs.existsSync(path)) {
        console.log(`[convert old version] Path ${path} not found`);
        return;
    }

    const dirs = fs.readdirSync(path);

    for (const dir of dirs) {

        const json = JSON.parse(fs.readFileSync(path + "\\" + dir + "\\data.json", "utf8"));

        console.log(dir)
        console.log(json)

        const video = Video.fromJSON(json);

        video.status = json.status ? 1 : 0;
        video.boomarks = [];

        for (const b of json.boomarks) {
            video.addBoomark(b.name, b.at, -1);
        }

        fs.mkdirSync(Config.PATH_VIDEOS + "\\" + video.id);

        fs.renameSync(path + "\\" + dir + "\\" + video.fileName, video.getPath() + "\\video." + video.extension);

        video.save();

        fs.unlinkSync(path + "\\" + dir + "\\data.json");
        fs.rmdirSync(path + "\\" + dir);

    }
}