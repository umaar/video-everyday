## Video Everyday

[![Actions Status](https://github.com/umaar/video-everyday/workflows/Node%20CI/badge.svg)](https://github.com/umaar/video-everyday/actions)

This project helps create a "1 second everyday"-style video using your __existing media__.

![Demo of Video Everyday output](demo.gif)

###### Thanks to Fig Vids for the footage! Go check out their [YouTube Channel](https://www.youtube.com/channel/UCPcQxhv9uNPef_DrXdF1_hg)

---

### What is this?

If you've recorded lots of videos (e.g. with your phone), you use this code to turn all of that into a compilation video, for example showing 1 second of your life every day.

### To get started

1. Configure the relevant values in `default.json`
2. Run `npm install && make migrate`
3. Run the following:

```sh
make build
node src/server/server.js

# or to develop:
# make start
```

4. Then open up `http://localhost:3000`

The web interface allows you to (optionally) select which media to use in your final compilation videos. If you don't select anything, you can rely on the defaults.

5. When you're happy with your selection, click `consolidate media` in the web app.

6. You will then end up with a folder consisting of ~1 second videos:

`0001.mp4 0002.mp4 0003.MOV`

...and so on. You can then drag these into your video tool of choice, and join them all toegther. As an example, if using Screenflow:

1. Drag all files (`0001.mp4, 0002.mp4` etc.) into screenflow
2. Select all clips
3. Arrange > Scale > Scale to Fit
4. File > Export

# todo

- Support deselecting a media item
- 'Resolution' e.g. output videos every day, every other day, every week, month, year
    + Algorithm something like: 
        * For each video in a playlist, also considering user-defined choices, iterate through a date object until a video is found (until we've hit the next milestone)
            - Resolution Every month = check 1st Jan 2020 - no video? Move onto 2nd Jan 2020 until a video is found, then increment the appropriate type and appropriate amount e.g. increment `month` by `1`
- Playlist functionality (so you can make multiple videos)
    + needs a playlists table
        * Feature enhancement: copy this playlist to a new one
- Audit log for a single day, so you can see when the media item selection was changed
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

# these 1-2 second MP4 might be slow to watch, so how about displaying a sped up version either by:
# changing the vid.playbackRate in JS, or, using ffmpeg:

```sh
ffmpeg -i $1 -r 10 -vcodec png out-static-%05d.png
```

# command to overlay text on a video

```sh
ffmpeg -i 0009.mp4 -vf drawtext="fontfile=~/Library/Fonts/FiraCode-Bold.ttf: text='some text!':fontsize=80:fontcolor=white:x=100:y=100" 0009-text.mp4
```





# Scaling videos - run this on all videos, then do a ffmpeg concat https://superuser.com/a/547406

```sh
ffmpeg  -i 0091.mp4 -filter:v "scale=iw*min(1920/iw\,1080/ih):ih*min(1920/iw\,1080/ih), pad=1920:1080:(1920-iw*min(1920/iw\,1080/ih))/2:(1080-ih*min(1920/iw\,1080/ih))/2" -c:a copy scaled/0091.mkv
```

# Concatenating

This command will concatenate videos of the same format/size - confirmed working july 2020, must however use MKV files *not* mp4s for the final output. Input can be .mov or .mp4

```sh
ffmpeg -safe 0 -f concat -segment_time_metadata 1 -i files.txt -vf select=concatdec_select -af aselect=concatdec_select,aresample=async=1 final.mkv
```

## files.txt

```txt
file 'scaled/0001.mkv'
file 'scaled/0002.mkv'
file 'scaled/0003.mkv'
```

# subtitles

```sh
ffmpeg -i scaled/out.mkv  -filter:v subtitles=subtitles.srt scaled/out-subtitles.mkv

```