import Server from "./server";
import Config from "./config";
import fs = require("fs");

var server = new Server();

let Videos = new Map<string, Video>();

async function start()
{
    await loadConfig();

    var missingPath = await Config.validatePaths();

    if(missingPath)
    {
        console.log(`Could not find path ${missingPath}`);
        return;
    }

    
    //await convertOldVersion();

    await getNewVideos();
    await getVideos();

    await processBoomarks();

    server.Videos = Videos;
    await server.start();
}

start();

async function loadConfig() {
   var json = JSON.parse(fs.readFileSync("./config.json", "utf8"));

   for (const key in json) {
       Config[key] = json[key];
   }
}

async function convertOldVersion() {
    var path = `C:\\Users\\danil\\Desktop\\TestArea\\convert`;

    var dirs = fs.readdirSync(path);

    for (const dir of dirs) {

        var json = JSON.parse(fs.readFileSync(path + "\\" + dir + "\\data.json", "utf8"));

        console.log(dir)
        console.log(json)

        var video = Video.fromJSON(json);

        video.status = json.status ? 1 : 0;
        video.id = randomKey(30);
        video.fileName = dir + "." + video.extension;
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

async function getVideos() {
    console.log(`Getting videos...`)

    var dirs = fs.readdirSync(Config.PATH_VIDEOS);

    for (const dir of dirs) {
        console.log(`Loading '${dir}'`);

        var videoInfoDir = Config.PATH_VIDEOS + "\\" + dir + "\\" + "video.json";
        
        if(!await Config.getPathStats(videoInfoDir))
        {
            console.log(`Could not find 'video.json' for ${dir}`)
            continue;
        }

        var video = Video.fromJSON(JSON.parse(fs.readFileSync(videoInfoDir, "utf8")));

        var videoFileDir = Config.PATH_VIDEOS + "\\" + dir + "\\video." + video.extension;

        if(!fs.existsSync(videoFileDir)) {

            console.log(`Could not find video for ${dir}`)

            continue;
        }

        var stats = fs.statSync(videoFileDir)
        var fileSizeInBytes = stats.size;
        
        video.size = fileSizeInBytes;
        video.sizeStr = formatBytes(video.size, 0);

        Videos.set(dir, video);



    }
}

async function getBoomarks() {
    var dirs = fs.readdirSync(Config.PATH_BOOMARKS);

    var boomarks: number[] = [];

    for (const dir of dirs) {
        if(dir == "total") continue;

        var stats = await Config.getPathStats(Config.PATH_BOOMARKS + "\\" + dir);

        boomarks.push(stats!.birthtimeMs)
    }

    return boomarks;
}

async function processBoomarks() {
    console.log(`processBoomarks`)

    var vids: Video[] = [];

    for (const v of Videos.values()) {
        vids.push(v);
    }

    vids.sort((a, b) => { return b.createdAt - a.createdAt });

    var boomarks = await getBoomarks();
    var totalBoomarks = boomarks.length;

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
        

        fs.unlinkSync(Config.PATH_BOOMARKS + "\\boomark_" + i);
        console.log("Deleted boomark_"+i)
    }

    fs.writeFileSync(Config.PATH_BOOMARKS + "\\total", '0')
}

async function getNewVideos() {
    console.log(`Getting new videos...`)

    var dirs = fs.readdirSync(Config.PATH_NEW_VIDEOS);

    for (const dir of dirs) {

        var stats = await Config.getPathStats(Config.PATH_NEW_VIDEOS + "\\" + dir)


        var video = Video.fromFile(dir);
        video.createdAt = stats!.birthtimeMs;


        await moveNewVideoToVideos(video);



    }

    
}

export class Boomark {
    name!: string;
    from!: number;
    to!: number;
}

export enum VideoStatus {
    NOT_COMPLETED,
    COMPLETED
}

export class Video {
    name!: string;
    id!: string;

    status: VideoStatus = VideoStatus.NOT_COMPLETED;

    size!: number;
    sizeStr!: string;
    fileName!: string;
    extension!: string;
    createdAt!: number;

    boomarks: Boomark[] = [];

    static fromFile(fileName: string): Video
    {
        var lastDotIndex = fileName.lastIndexOf(".");
        var name = fileName.slice(0, lastDotIndex);
        var ext = fileName.slice(lastDotIndex+1);

        var video = new Video();
        video.name = name;
        video.id = randomKey(30);
        video.fileName = fileName;
        video.extension = ext;
    
        return video;
    }

    static fromJSON(json): Video
    {
        var video = new Video();
        video.name = json.name;
        video.id = json.id;
        video.fileName = json.fileName;
        video.extension = json.extension;
        video.createdAt = json.createdAt;
        video.status = json.status;

        video.boomarks = json.boomarks;
        
        return video;
    }

    addBoomark(name: string, time: number, endTime: number) {
        var boomark = new Boomark();

        boomark.name = name;
        boomark.from = time;
        boomark.to = endTime;

        console.log(`Add boomark to ${this.id}:`, boomark)

        this.boomarks.push(boomark);
    }

    save()
    {
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

        return json;
    }

    getPath()
    {
        return Config.PATH_VIDEOS + "\\" + this.id;
    }

    changeStatus()
    {
        this.status = this.status == 1 ? 0 : 1;

        console.log(`Status changed to ${this.status}`)
    }
}

function randomKey(length: number): string
{
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

async function moveNewVideoToVideos(video: Video) {
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

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}