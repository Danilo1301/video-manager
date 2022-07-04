import fs from "fs";

import { formatBytes, randomKey } from "./utils";
import { Boomark } from "./boomark";
import { Config } from "./config";

export enum VideoStatus {
    NOT_COMPLETED,
    COMPLETED
}

export class Video {
    public readonly id: string;
    public name: string;
    public readonly fileName: string;
    public readonly extension: string;
    public readonly size: number;
    public readonly createdAt: number;
    public get sizeStr() { return formatBytes(this.size, 0); };
    public duration: number = 0;

    public status: VideoStatus = VideoStatus.NOT_COMPLETED;

    public boomarks: Boomark[] = [];

    constructor(fileName: string, id: string) {
        const lastDotIndex = fileName.lastIndexOf(".");

        this.id = id;
        this.name = fileName.slice(0, lastDotIndex);;
        this.fileName = fileName;
        this.extension = fileName.slice(lastDotIndex+1);

        if(fs.existsSync(this.getVideoPath())) {
            const stats = fs.statSync(this.getVideoPath())
            this.createdAt = stats.birthtimeMs;
            this.size = stats.size;

            
        } else {
            this.createdAt = 0;
            this.size = 0;
        }

        
       
    }

    public getPath() {
        return Config.PATH_VIDEOS + "\\" + this.id;
    }

    public getVideoPath() {
        return this.getPath() + "\\video." + this.extension;
    }

    public static fromFile(fileName: string): Video
    {
        var video = new Video(fileName, randomKey(30));
        return video;
    }

    static fromJSON(json): Video
    {
        var video = new Video(json.fileName, json.id);
        video.name = json.name;
        video.status = json.status;
        video.boomarks = json.boomarks;
        video.duration = json.duration || 0;
        
        return video;
    }

    public addBoomark(name: string, time: number, endTime: number) {
        const boomark: Boomark = {
            name: name,
            from: time,
            to: endTime
        }

        console.log(`Add boomark to ${this.id}:`, boomark);

        this.boomarks.push(boomark);
    }

    public removeBoomark(index: number) {
        console.log(`Remove boomark from ${this.id}:`, this.boomarks[0]);

        this.boomarks.splice(index, 1);
    }

    public save() {
        var path = this.getPath();
        var json = this.toJSON();

        console.log(`Saving video in ${path}`);

        fs.writeFileSync(path + "\\video.json", JSON.stringify(json));
    }

    toJSON()
    {
        var json: any = {};

        json.name = this.name;
        json.id = this.id;
        json.fileName = this.fileName;
        json.extension = this.extension;
        json.createdAt = this.createdAt;
        json.boomarks = this.boomarks;
        json.status = this.status;
        json.duration = this.duration;

        return json;
    }

    public changeStatus() {
        this.status = this.status == VideoStatus.COMPLETED ? VideoStatus.NOT_COMPLETED : VideoStatus.COMPLETED;

        console.log(`Status changed to ${this.status}`)
    }
}