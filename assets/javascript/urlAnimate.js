'use strict';



let frames = ["■■■■■■■PROGRAMMING IS COOL■■■■■■■"];
let currentFrame = 0;
let direction = 1;
let maxSize = frames.length;

function AnimateUrl(){
    let getFrame = () => {
        //let frame = "■"
        for (let i=0; i < currentFrame; i++){
            frame = frame.concat(frames[i]);
        }
        return frame;
    }

    location.hash = getFrame()
    currentFrame += direction;
    
    if (currentFrame >= maxSize){
        // go backward
        direction = -1;
    }
    if (currentFrame == 0) {
        // go forward
        direction = 1;
    }

    setTimeout(AnimateUrl, 50);
}

AnimateUrl();