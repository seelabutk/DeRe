# Loom #

Loom is a technique for creating embeddable and interactive client-side-only visualizations. 

Summary of the method: 

1. Render all possible interactions and create a set of frames
1. Convert the frames to an mp4 using something like: `ffmpeg -framerate 30 -i around_%05d.png -s:v 512x512 -c:v libx264 -profile:v high -crf 20 -pix_fmt yuv420p output.mp4`
1. Devise a mapping between interaction parameters and the frames
1. Access the correct frames on the cliens side based on the interaction. 


Potential uses include:

1. Lightweight embeddable volume rendering for storytelling
1. Secure sharing of interactive data by limiting interactions
1. Lightweight client-side solution for highly interactive visualizations

# Installation Steps #
1. Download Node LTS 14 and npm
1. install yarn through npm
    - $> npm install --global yarn
1. Download python 3.8+ and pip
1. download/install ffmpeg and add to PATH (https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip)
1. For Viewer do:
    1. cd to Viewer and run:
    1. $> yarn install    
    1. $> yarn run dev - this will launch the testing server, you can close it for now until you're ready to test a loom object
1. For Recorder_old do:
    1. cd to Recorder_old and run:
    1. $> python -m pip install -r requirements.txt
    1. $> npm run start - this will launch the recording application, discussed below
1. For Recorder do:
    1. Nothing! I'm currently working on this one. it's not usable yet.
    
# To create Loom Object #
1. cd Recorder_old
1. run the application
    - $> npm run start
1. interact with application, creating actor zones
1. click save layout
1. click run interactions
1. click export - this will create a video.mp4 and config.json in the Recorder_old directory
1. move video.mp4 and config.json into Viewer/public/apps/YourLoomAppNameHere/ - you can call the loom app whatever you'd like

# To test Loom Object #
1. start the Viewer DevServer
    1. cd into Viewer directory
    1. $> yarn run dev
1. open https://localhost:3000 in a browser (preferably chrome)
1. interact with the webpage, testing every actor zone previously created