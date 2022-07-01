import express from "express";
import fs from "fs";

import cookieParser = require('cookie-parser');
import bodyParser = require('body-parser');
import { App, VIDEO_SORT_BY } from "./app";
import { Config } from "./config";

export class Server {
    public static Instance: Server;

    public app: express.Application;

    public sortVideosBy: VIDEO_SORT_BY = VIDEO_SORT_BY.DATE;

    constructor() {
        Server.Instance = this;

        this.app = express();
    }

    public async start() {
        const app = this.app;

        app.set('view engine', 'ejs')

        app.use(cookieParser());
        app.use(bodyParser.json());

        app.use(express.static(__dirname + "/../" + '/public'));

        app.listen(Config.PORT, Config.ADDRESS, () => {
            console.log(`[server] Listening at ${Config.ADDRESS}:${Config.PORT}`)
        });

        //

        app.get('/', (req, res) => {
            if(req.query.sort) {
                const sort = parseInt(<string>req.query.sort);
                this.sortVideosBy = sort;
            }

            const videos = this.getMainVideosList();

            res.render('home', {videos: videos});
        });

        app.get('/video/:id', (req, res) => {
            const video = App.Instance.videos.get(req.params.id);

            if(!video) {
                res.end("Could not find video " + req.params.id);
                return;
            }

            const videos = this.getMainVideosList();
            const index = videos.indexOf(video);

            res.render('video', {video: video, path: video.getPath(), prev: videos[index-1]?.id, next: videos[index+1]?.id});
        });

        app.get('/video/:id/file', (req, res) => {
            var video = App.Instance.videos.get(req.params.id);

            if(!video) {
                res.end("Could not find video " + req.params.id);
                return;
            }

            var pathFile = Config.PATH_VIDEOS + "\\" + video.id + "\\video." + video.extension;

            res.sendFile(pathFile);
        });

        app.get('/video/:id/boomarks', (req, res) => {
            var video = App.Instance.videos.get(req.params.id)!;

            res.json(video.boomarks);
        });

        app.get('/video/:id/boomarks/add', (req, res) => {
            var video = App.Instance.videos.get(req.params.id)!;

            var start = parseInt(<string>req.query.start);
            var end = req.query.end ? parseInt(<string>req.query.end) : -1;

            video.addBoomark(<string>req.query.name, start, end);

            video.save();

            res.json(video.boomarks);
        });

        app.get('/video/:id/boomarks/remove', (req, res) => {
            var video = App.Instance.videos.get(req.params.id)!;

            var index = parseInt(<string>req.query.index);

            video.removeBoomark(index);
            
            video.save();
            
            res.json(video.boomarks);
        });

        app.get('/video/:id/changestatus', (req, res) => {
            var video = App.Instance.videos.get(req.params.id)!;

            video.changeStatus();

            video.save();

            res.end();
        });

        app.get('/video/:id/delete', (req, res) => {
            var video = App.Instance.videos.get(req.params.id)!;

            if(!video) {
                res.end("Could not delete video " + req.params.id);
                return;
            }

            App.Instance.deleteVideo(video.id);

            res.end("Video deleted");
        });

 

    }

    public getMainVideosList() {
        const videos = App.Instance.getVideos(this.sortVideosBy);
        return videos;
    }
}