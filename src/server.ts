import express = require("express");
import Config from "./config";
import * as fs from "fs";

import cookieParser = require('cookie-parser');
import bodyParser = require('body-parser');
import { Video } from "src";

export default class {
    app;

    Videos!: Map<string, Video>;

    getVideosArray()
    {
        var vids: Video[] = [];

        this.Videos.forEach((v) => {
            vids.push(v);
        })

        vids.sort((a, b) => { return b.createdAt - a.createdAt });

        return vids;
    }

    start()
    {
        var app = this.app = express()

        app.set('view engine', 'ejs')

        app.use(cookieParser());
        app.use(bodyParser.json());

        app.use(express.static(__dirname + "/../" + '/public'));

        app.get('/jump', (req, res) => {
            console.log(req.query);

            const videos = this.getVideosArray();

            const keys = videos.map(video => video.id)

            const videoId: string = req.query.videoId;
            const by: number = parseInt(req.query.by);

            const index = keys.indexOf(videoId) + by;

            const newVideoId = videos[index].id;

            res.redirect('/video?id=' + newVideoId);
        });

        app.get('/video/:id', (req, res) => {
            var video = this.Videos.get(req.params.id);

            if(!video) {
                res.end("Could not find video " + req.params.id);
                return;
            }

            var pathFile = Config.PATH_VIDEOS + "\\" + video.id + "\\video." + video.extension;

            res.sendFile(pathFile);
        });

        app.get('/delete', (req, res) => {
            var video = this.Videos.get(req.query.id);

            if(!video) {
                res.end("Could not find video " + req.query.id);
                return;
            }

            var dir = Config.PATH_VIDEOS + "\\" + video.id;

            fs.rmdirSync(dir, { recursive: true });

            res.end("Video deleted")

            console.log(`Video ${video.id} deleted`)

            this.Videos.delete(video.id)
        });

        app.get('/boomarks', (req, res) => {
            var video = this.Videos.get(req.query.videoId);

            res.json(video!.boomarks);
        });

        app.get('/changestatus', (req, res) => {
            var video = this.Videos.get(req.query.videoId)!;

            video.changeStatus();

            video.save();

            res.end();
        });

        app.get('/addboomark', (req, res) => {
            var video = this.Videos.get(req.query.videoId)!;

            var start = parseInt(req.query.at);
            var end = req.query.end ? parseInt(req.query.end) : -1;

            video.addBoomark(req.query.name, start, end);

            video.save();

            res.json(video.boomarks);
        });

        app.get('/delboomark', (req, res) => {
            var video = this.Videos.get(req.query.videoId)!;

            console.log(`Removed boomark`, video.boomarks[req.query.index])

            video.boomarks.splice(req.query.index, 1);
            

            video.save();
            
            res.json(video.boomarks);
        });

        app.get('/video', (req, res) => {
            var video = this.Videos.get(req.query.id);

            if(!video) {
                res.end("Could not find video " + req.query.id);
                return;
            }

            res.render('video', {video: video});
        });

        app.get('/', (req, res) => {
            var vids = this.getVideosArray();

            res.render('home', {videos: vids});
        })
          
        app.listen(Config.PORT, Config.ADDRESS, () => {
            console.log(`Listening at ${Config.ADDRESS}:${Config.PORT}`)
        })
    }
}