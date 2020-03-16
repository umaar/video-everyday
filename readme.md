## Video Everyday

[![Actions Status](https://github.com/umaar/video-everyday/workflows/Node%20CI/badge.svg)](https://github.com/umaar/video-everyday/actions)

This project helps create a "1 second everyday"-style video using your __existing media__. If you've recorded lots of videos, taken lots of pictures, with your phone for example, can turn all of that into a condensed video.

### To get started

1. Configure `media-folder` in `default.json` to point to a folder location where all your media is stored
2. Run `npm install && npm run migrate-db-dev`
3. Run the following:

```sh
# in one tab
npm start

# in another tab
npm run gulp
```

4. Then open up `localhost:3000`

You will then end up with a folder consisting of ~1 second videos: `0001.mp4 0002.mp4 0003.MOV 0004.MOV 0005.MOV 0006.MOV 0007.mp4 0008.mp4 0009.mp4 0010.MOV` and so on. You can then drag these into your video tool of choice, and join them all toegther. As an example, if using Screenflow:

1. Drag all files (`0001.mp4, 0002.mp4` etc.) into screenflow
2. Select all clips
3. Arrange > Scale > Scale to Fit
4. File > Export

# todo

- Doocument the process of stitching together consolidated media + burning in subtitles (and resize to fit)
- If `MP4Box` fails, use ffmpeg instead for shorter segments. _Edit_: Should I Use FFMPEG regardless?  MP4Box is not very accurate. Need to benchmark the overall times 
- Add support for a Job Queue, stored in the DB, which can sequentially process videos even after the web server has started up
    + Provide a /jobs page which shows pending/in-progress/completed jobs
- allow selecting multiple videos/images for a given day (shift + click?) and have them either condensed into a 1-2 second timeframe, or just allow each of them to occupy the usual time amount
- try `video-segment-duration-seconds` of 1sec and make sure things work
- ensure working state is clean, and everything is committed, handle config files
- `main-config.js` has some hardcoded server paths, share this in a more intuitive way across the codebase
- Remove absolute paths from config files
- Use node.js recursive delete instead of rimraf (https://nodejs.org/api/fs.html#fs_fs_rmdirsync_path_options)
- Add timelapse support/speed up videos
- Overlay text on significant videos
- Document webapp and include a getting started guide
- Support images
- Refactor code + modularise
- add a test folder with test media and use `md5 0003.MOV md5 0004.mp4` and so on to verify the output media, to to a demo vid/gif from the readme


#### todo: media generation task

1. Get an array of all top-level folders in the `video-segment-folder`, named `allTopLevelSegmentFolders`
2. For each media source item on the filesystem
3. Check the DB record. If `defaultVideoSegmentDuration` differs from config value, then delete the `defaultVideoSegment` file (not folder as other segments may have been generated), e.g. so delete `VID-20190902-WA0004.mp4/VID-20190902-WA0004_15_18.mp4` on the filesystem
4. Maybe the config didn't even change, it which case check the file 
5. Create/generate the video segment using the usual technique
6. Remove the current media source item from `allTopLevelSegmentFolders`
7. At the end of looping through all top level media source items, as a cleanup task, delete any remaining items in `allTopLevelSegmentFolders`


### scripts WIP

```sh
# takes less than a second to execute, but includes black frames at the start

 ffmpeg -ss 00:01:00 -i ~/Downloads/tmp/VID_20191020_113153.mp4 -t 3 -c copy -avoid_negative_ts 1 ./dist/test.mp4


# takes 1 min, but is a correctly formatted video file

ffmpeg -ss 00:01:00 -t 2 -i ~/Downloads/tmp/VID_20191020_113153.mp4 ./dist/foo.mp4


# Similar (slow but accurate and working), not sure what the difference is

ffmpeg -i ~/Downloads/tmp/VID_20191020_113153.mp4 -ss 10 -strict -2 -t 2 ./dist/foo.mp4

# finally, using mp4box works!

/Applications/GPAC.app/Contents/MacOS/MP4Box -splitx 10:12 ~/Downloads/tmp/VID_20191020_115217.mp4

# after this, it'll need resizing

ffmpeg -i VID_20191020_115217_14_17.mp4 -vf scale=640:-1 output.mp4

# these 1-2 second MP4 might be slow to watch, so how about displaying a sped up version either by:
# changing the vid.playbackRate in JS, or, using ffmpeg:
ffmpeg -i $1 -r 10 -vcodec png out-static-%05d.png

# command to overlay text on a video

ffmpeg -i 0009.mp4 -vf drawtext="fontfile=~/Library/Fonts/FiraCode-Bold.ttf: text='some text!':fontsize=80:fontcolor=white:x=100:y=100" 0009-text.mp4

# This command will concatenate videos of the same format/size

ffmpeg -f concat -i mp4s.txt -fflags +genpts mp4s.mp4

# mp4box concat is super fast...but only if files are the same resolution
/Applications/GPAC.app/Contents/MacOS/MP4Box -cat scaled/1.mp4 -cat scaled/2.mp4 -cat scaled/3.mp4 -cat scaled/4.mp4 -cat scaled/5.mp4 -new mp4box.mp4


# scaling videos working - run this on all videos, then do a ffmpeg concat https://superuser.com/a/547406

ffmpeg  -i footage/6.MOV -filter:v "scale=iw*min(1920/iw\,1080/ih):ih*min(1920/iw\,1080/ih), pad=1920:1080:(1920-iw*min(1920/iw\,1080/ih))/2:(1080-ih*min(1920/iw\,1080/ih))/2" -c:a copy scaled/6.mp4

```

